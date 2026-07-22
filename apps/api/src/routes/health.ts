import { Hono } from "hono";
import type { HealthResponse } from "@laya/shared";
import type { AppEnv } from "../types";
import { API_VERSION } from "../version";

// GET /v1/health — unauthenticated liveness check (PHASE-0A-BRIEF.md scope
// item 3).
export const health = new Hono<AppEnv>().get("/", (c) => {
  const body: HealthResponse = {
    status: "ok",
    version: API_VERSION,
    requestId: c.get("requestId"),
  };
  return c.json(body);
});
