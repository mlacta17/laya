import { z } from "zod";

// PUT /v1/ping-store — idempotent upsert keyed to the authenticated JWT
// subject. GET returns only the caller's row. This route is disposable: it is
// removed when Phase 0A is signed off (PHASE-0A-BRIEF.md, scope item 3).
export const pingStorePutRequestSchema = z.object({
  value: z.string().min(1).max(1024),
});

export type PingStorePutRequest = z.infer<typeof pingStorePutRequestSchema>;

// Timestamps are UTC ISO-8601 at the API boundary; D1 stores Unix
// milliseconds (ARCHITECTURE.md §3.3).
export const pingStoreResponseSchema = z.object({
  subject: z.string(),
  value: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PingStoreResponse = z.infer<typeof pingStoreResponseSchema>;
