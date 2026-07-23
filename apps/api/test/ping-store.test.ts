import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorEnvelopeSchema, pingStoreResponseSchema } from "@laya/shared";
import {
  MOCK_AUDIENCE,
  MOCK_ISSUER,
  MOCK_JWKS_JSON,
} from "../dev/mock-issuer/keys";
import { createApp } from "../src/app";
import { getValidatedEnv } from "../src/env";
import { mintToken, TEST_SUBJECT } from "./helpers/mock-tokens";
import { createTestDb } from "./helpers/test-db";

const app = createApp(getValidatedEnv);

// The milestone round-trip (brief): a mock-issuer JWT is verified, writes a
// row to D1, reads it back — and only the caller's own row is ever visible.
// This is also the "accept the valid case" half of the rejection matrix.
let db: D1Database;
let dispose: () => Promise<void>;
let env: Record<string, unknown>;

beforeAll(async () => {
  const testDb = await createTestDb();
  db = testDb.db;
  dispose = testDb.dispose;
  env = {
    ENVIRONMENT: "development",
    AUTH_ISSUER: MOCK_ISSUER,
    AUTH_AUDIENCE: MOCK_AUDIENCE,
    MOCK_JWKS: MOCK_JWKS_JSON,
    DB: db,
  };
});

afterAll(async () => {
  // dispose stays unset if beforeAll failed — don't mask that error.
  if (dispose) {
    await dispose();
  }
});

async function put(value: unknown, token: string) {
  return app.request(
    "/v1/ping-store",
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
    "/v1/ping-store",
    { headers: { Authorization: `Bearer ${token}` } },
    env,
  );
}

describe("PUT + GET /v1/ping-store round-trip", () => {
  it("returns 404 with the envelope before anything is stored", async () => {
    const res = await get(await mintToken());
    expect(res.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("not_found");
  });

  it("writes through D1 and reads the same row back", async () => {
    const token = await mintToken();

    const putRes = await put("hello-laya", token);
    expect(putRes.status).toBe(200);
    const stored = pingStoreResponseSchema.parse(await putRes.json());
    expect(stored.subject).toBe(TEST_SUBJECT);
    expect(stored.value).toBe("hello-laya");

    const getRes = await get(token);
    expect(getRes.status).toBe(200);
    expect(pingStoreResponseSchema.parse(await getRes.json())).toEqual(stored);
  });

  it("upserts idempotently: same subject keeps one row, its id and createdAt", async () => {
    const token = await mintToken();
    const before = await db
      .prepare("SELECT id, created_at FROM ping WHERE subject = ?1")
      .bind(TEST_SUBJECT)
      .first<{ id: string; created_at: number }>();

    const res = await put("updated-value", token);
    expect(res.status).toBe(200);
    const updated = pingStoreResponseSchema.parse(await res.json());
    expect(updated.value).toBe("updated-value");
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(updated.createdAt),
    );

    const after = await db
      .prepare("SELECT id, created_at FROM ping WHERE subject = ?1")
      .bind(TEST_SUBJECT)
      .first<{ id: string; created_at: number }>();
    expect(after).toEqual(before);

    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM ping")
      .first<{ n: number }>();
    expect(count?.n).toBe(1);
  });

  it("scopes rows to the caller: another subject never sees the first row", async () => {
    const otherToken = await mintToken({ sub: "second-user" });

    const firstLook = await get(otherToken);
    expect(firstLook.status).toBe(404);

    await put("second-users-value", otherToken);
    const theirs = pingStoreResponseSchema.parse(
      await (await get(otherToken)).json(),
    );
    expect(theirs.subject).toBe("second-user");
    expect(theirs.value).toBe("second-users-value");

    const mine = pingStoreResponseSchema.parse(
      await (await get(await mintToken())).json(),
    );
    expect(mine.subject).toBe(TEST_SUBJECT);
    expect(mine.value).toBe("updated-value");
  });

  it("returns ISO-8601 UTC timestamps at the boundary while D1 stores ms", async () => {
    const row = await db
      .prepare("SELECT created_at, updated_at FROM ping WHERE subject = ?1")
      .bind(TEST_SUBJECT)
      .first<{ created_at: number; updated_at: number }>();
    const body = pingStoreResponseSchema.parse(
      await (await get(await mintToken())).json(),
    );
    expect(typeof row?.created_at).toBe("number");
    expect(body.createdAt).toBe(new Date(row!.created_at).toISOString());
    expect(body.updatedAt).toBe(new Date(row!.updated_at).toISOString());
  });
});

describe("PUT /v1/ping-store validation", () => {
  it.each([
    ["missing value", {}],
    ["empty value", { value: "" }],
    ["non-string value", { value: 42 }],
  ])("rejects %s with a 400 envelope", async (_name, payload) => {
    const res = await app.request(
      "/v1/ping-store",
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
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });

  it("rejects a value over 1024 characters", async () => {
    const res = await put("x".repeat(1025), await mintToken());
    expect(res.status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const res = await app.request(
      "/v1/ping-store",
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${await mintToken()}` },
        body: "definitely not json",
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });
});
