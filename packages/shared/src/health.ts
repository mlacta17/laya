import { z } from "zod";

// GET /v1/health — unauthenticated liveness check.
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string().min(1),
  requestId: z.string().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
