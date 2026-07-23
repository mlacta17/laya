import { Hono } from "hono";
import { pingStorePutRequestSchema, type PingStoreResponse } from "@laya/shared";
import { requireAuth } from "../auth/require-auth";
import { errorResponse } from "../errors";
import { uuidv7 } from "../lib/uuidv7";
import type { AppEnv } from "../types";

// /v1/ping-store — Phase 0A's proof that authentication context reaches D1
// (brief scope item 3): PUT is an idempotent upsert keyed to the JWT
// subject; GET returns only the caller's own row. DISPOSABLE — this route
// and its ping table are removed at 0A sign-off; the auth + D1 patterns
// established here are what every future route copies.

type PingRow = {
  id: string;
  subject: string;
  value: string;
  created_at: number;
  updated_at: number;
};

// D1 stores Unix milliseconds; the API boundary speaks UTC ISO-8601 (§3.3).
function toResponse(row: PingRow): PingStoreResponse {
  return {
    subject: row.subject,
    value: row.value,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export const pingStore = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
    const row = await c.env.DB.prepare(
      "SELECT id, subject, value, created_at, updated_at FROM ping WHERE subject = ?1",
    )
      .bind(c.var.auth.subject)
      .first<PingRow>();

    if (!row) {
      return errorResponse(c, 404, "not_found", "No value stored for this subject");
    }
    return c.json(toResponse(row));
  })
  .put("/", async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return errorResponse(c, 400, "invalid_request", "Request body must be JSON");
    }
    const body = pingStorePutRequestSchema.safeParse(raw);
    if (!body.success) {
      const issues = body.error.issues
        .map((issue) => `${issue.path.join(".") || "(body)"}: ${issue.message}`)
        .join("; ");
      return errorResponse(c, 400, "invalid_request", issues);
    }

    // A single statement needs no batch() (§4.0). ON CONFLICT keeps the
    // original id and created_at, so the row id is stable per subject and
    // repeating the same PUT is safe — the idempotent upsert the brief asks
    // for. RETURNING gives us the stored row without a second query.
    const now = Date.now();
    const row = await c.env.DB.prepare(
      `INSERT INTO ping (id, subject, value, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT (subject) DO UPDATE SET value = ?3, updated_at = ?4
       RETURNING id, subject, value, created_at, updated_at`,
    )
      .bind(uuidv7(), c.var.auth.subject, body.data.value, now)
      .first<PingRow>();

    if (!row) {
      // Cannot happen for an upsert; if it does, the 500 envelope + log is
      // the right outcome.
      throw new Error("ping upsert returned no row");
    }
    return c.json(toResponse(row));
  });
