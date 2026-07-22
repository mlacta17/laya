import { z } from "zod";

// GET /v1/health — unauthenticated liveness check.
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  requestId: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
