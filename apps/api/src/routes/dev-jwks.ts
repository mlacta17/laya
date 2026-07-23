import { Hono } from "hono";
import { errorResponse } from "../errors";
import type { AppEnv } from "../types";

// GET /dev/.well-known/jwks.json — dev only (ADR-134): exposes the mock
// issuer's public keys so humans and scripts can inspect what the dev Worker
// trusts. Verification itself reads the same keys straight from config — the
// Worker never fetches this route. Production has no MOCK_JWKS (its env
// validation rejects it), so this route 404s there by construction.
// MOCK_JWKS is parsed and shape-checked by src/env.ts; serve it as-is.
export const devJwks = new Hono<AppEnv>().get("/", (c) => {
  const config = c.var.config;
  if (config.ENVIRONMENT !== "development" || !config.MOCK_JWKS) {
    return errorResponse(c, 404, "not_found", "Route not found");
  }
  return c.json(config.MOCK_JWKS);
});
