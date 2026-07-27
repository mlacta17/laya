import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { errorEnvelopeSchema } from "@laya/shared";
import { z } from "zod";
import {
  MOCK_AUDIENCE,
  MOCK_ISSUER,
  MOCK_JWKS_JSON,
} from "../dev/mock-issuer/keys";
import { requireAuth } from "../src/auth/require-auth";
import { getValidatedEnv } from "../src/env";
import { errorResponse } from "../src/errors";
import { uuidv7 } from "../src/lib/uuidv7";
import type { AppEnv } from "../src/types";
import { mintToken, TEST_SUBJECT } from "./helpers/mock-tokens";
import { createTestDb } from "./helpers/test-db";

// This test-only route preserves Phase 0A's reference implementation for the
// authenticated-request -> validated-input -> prepared-D1-statement pattern.
// It is never registered by src/app.ts and therefore cannot ship as an API.
const putRequestSchema = z.object({
  value: z.string().min(1).max(1024),
});
const probeResponseSchema = z.object({
  subject: z.string().min(1),
  value: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

type ProbeRow = {
  id: string;
  subject: string;
  value: string;
  created_at: number;
  updated_at: number;
};

function toResponse(row: ProbeRow) {
  return {
    subject: row.subject,
    value: row.value,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const app = new Hono<AppEnv>();
app.use(requestId());
app.use(async (c, next) => {
  c.set("config", getValidatedEnv(c.env));
  await next();
});
app.use("/probe", requireAuth);
app.get("/probe", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT id, subject, value, created_at, updated_at
     FROM auth_d1_probe WHERE subject = ?1`,
  )
    .bind(c.var.auth.subject)
    .first<ProbeRow>();

  if (!row) {
    return errorResponse(c, 404, "not_found", "No probe value stored");
  }
  return c.json(toResponse(row));
});
app.put("/probe", async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return errorResponse(
      c,
      400,
      "invalid_request",
      "Request body must be JSON",
    );
  }

  const body = putRequestSchema.safeParse(raw);
  if (!body.success) {
    const issues = body.error.issues
      .map((issue) => `${issue.path.join(".") || "(body)"}: ${issue.message}`)
      .join("; ");
    return errorResponse(c, 400, "invalid_request", issues);
  }

  const now = Date.now();
  const row = await c.env.DB.prepare(
    `INSERT INTO auth_d1_probe (id, subject, value, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?4)
     ON CONFLICT (subject) DO UPDATE SET value = ?3, updated_at = ?4
     RETURNING id, subject, value, created_at, updated_at`,
  )
    .bind(uuidv7(), c.var.auth.subject, body.data.value, now)
    .first<ProbeRow>();

  if (!row) {
    throw new Error("auth D1 probe upsert returned no row");
  }
  return c.json(toResponse(row));
});

let db: D1Database;
let dispose: (() => Promise<void>) | undefined;
let env: Record<string, unknown>;

beforeAll(async () => {
  const testDb = await createTestDb();
  db = testDb.db;
  dispose = testDb.dispose;
  await db
    .prepare(
      `CREATE TABLE auth_d1_probe (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT`,
    )
    .run();
  env = {
    ENVIRONMENT: "development",
    WEB_ORIGIN: "http://localhost:5173",
    AUTH_ISSUER: MOCK_ISSUER,
    AUTH_AUDIENCE: MOCK_AUDIENCE,
    MOCK_JWKS: MOCK_JWKS_JSON,
    DB: db,
  };
});

beforeEach(async () => {
  await db.prepare("DELETE FROM auth_d1_probe").run();
});

afterAll(async () => {
  await dispose?.();
});

async function put(value: unknown, token: string) {
  return app.request(
    "/probe",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value }),
    },
    env,
  );
}

async function get(token: string) {
  return app.request(
    "/probe",
    { headers: { Authorization: `Bearer ${token}` } },
    env,
  );
}

describe("authenticated D1 reference pattern", () => {
  it("returns the standard 404 envelope before anything is stored", async () => {
    const res = await get(await mintToken());
    expect(res.status).toBe(404);
    expect(errorEnvelopeSchema.parse(await res.json()).error.code).toBe(
      "not_found",
    );
  });

  it("verifies a JWT, writes through D1, and reads the same row", async () => {
    const token = await mintToken();
    const putRes = await put("hello-laya", token);
    expect(putRes.status).toBe(200);
    const stored = probeResponseSchema.parse(await putRes.json());
    expect(stored).toMatchObject({
      subject: TEST_SUBJECT,
      value: "hello-laya",
    });

    const getRes = await get(token);
    expect(getRes.status).toBe(200);
    expect(probeResponseSchema.parse(await getRes.json())).toEqual(stored);
  });

  it("upserts idempotently while preserving id and creation time", async () => {
    const token = await mintToken();
    await put("first", token);
    const before = await db
      .prepare("SELECT id, created_at FROM auth_d1_probe WHERE subject = ?1")
      .bind(TEST_SUBJECT)
      .first<{ id: string; created_at: number }>();

    const res = await put("updated", token);
    const updated = probeResponseSchema.parse(await res.json());
    const after = await db
      .prepare("SELECT id, created_at FROM auth_d1_probe WHERE subject = ?1")
      .bind(TEST_SUBJECT)
      .first<{ id: string; created_at: number }>();
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM auth_d1_probe")
      .first<{ n: number }>();

    expect(updated.value).toBe("updated");
    expect(after).toEqual(before);
    expect(count?.n).toBe(1);
  });

  it("isolates each subject's row", async () => {
    const firstToken = await mintToken();
    const secondToken = await mintToken({ sub: "second-user" });
    await put("first-value", firstToken);

    expect((await get(secondToken)).status).toBe(404);
    await put("second-value", secondToken);

    expect(
      probeResponseSchema.parse(await (await get(firstToken)).json()),
    ).toMatchObject({
      subject: TEST_SUBJECT,
      value: "first-value",
    });
    expect(
      probeResponseSchema.parse(await (await get(secondToken)).json()),
    ).toMatchObject({
      subject: "second-user",
      value: "second-value",
    });
  });

  it("stores integer milliseconds and returns ISO-8601 UTC timestamps", async () => {
    const token = await mintToken();
    const body = probeResponseSchema.parse(
      await (await put("value", token)).json(),
    );
    const row = await db
      .prepare(
        "SELECT created_at, updated_at FROM auth_d1_probe WHERE subject = ?1",
      )
      .bind(TEST_SUBJECT)
      .first<{ created_at: number; updated_at: number }>();

    expect(typeof row?.created_at).toBe("number");
    expect(body.createdAt).toBe(new Date(row!.created_at).toISOString());
    expect(body.updatedAt).toBe(new Date(row!.updated_at).toISOString());
  });
});

describe("test-only D1 route validation", () => {
  it.each([
    ["missing value", {}],
    ["empty value", { value: "" }],
    ["non-string value", { value: 42 }],
  ])("rejects %s with a 400 envelope", async (_name, payload) => {
    const res = await app.request(
      "/probe",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${await mintToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      env,
    );
    expect(res.status).toBe(400);
    expect(errorEnvelopeSchema.parse(await res.json()).error.code).toBe(
      "invalid_request",
    );
  });

  it("rejects a value over 1024 characters", async () => {
    expect((await put("x".repeat(1025), await mintToken())).status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const res = await app.request(
      "/probe",
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${await mintToken()}` },
        body: "definitely not json",
      },
      env,
    );
    expect(res.status).toBe(400);
    expect(errorEnvelopeSchema.parse(await res.json()).error.code).toBe(
      "invalid_request",
    );
  });
});
