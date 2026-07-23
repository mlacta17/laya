import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { errorResponse } from "../errors";
import type { AppEnv } from "../types";
import { getAuthConfig } from "./config";
import { JwksFetchError } from "./jwks";
import { verifyAccessToken } from "./verify-token";

// Route guard: verifies the bearer token and puts { subject } on
// c.var.auth. Every rejection is the same generic 401 envelope — the real
// reason goes to the structured log only, so responses never leak which
// check failed (§8.1).
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authConfig = getAuthConfig(c.var.config);
  if (!authConfig) {
    // Production's permanent state until Phase 0B picks a provider (ADR-134).
    return unauthorized(c, "auth_not_configured");
  }

  const header = c.req.header("Authorization");
  if (!header) {
    return unauthorized(c, "missing_authorization_header");
  }

  // Exactly "Bearer <token>", case-insensitive scheme (RFC 6750).
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match || !match[1]) {
    return unauthorized(c, "malformed_bearer_header");
  }

  try {
    c.set("auth", await verifyAccessToken(match[1], authConfig));
  } catch (err) {
    // Only JwksFetchError messages are safe to log as detail — we compose
    // them ourselves (status code, timeout, parse failure), and during a
    // provider outage that detail is what an operator needs. hono's JWT error
    // messages embed the raw token, so a generic err.message here would put
    // live credentials in the logs.
    return unauthorized(
      c,
      err instanceof Error ? err.name : "unknown_error",
      err instanceof JwksFetchError ? err.message : undefined,
    );
  }

  await next();
});

function unauthorized(c: Context<AppEnv>, reason: string, detail?: string) {
  console.warn({
    event: "auth_rejected",
    requestId: c.get("requestId"),
    reason,
    ...(detail !== undefined && { detail }),
  });
  return errorResponse(
    c,
    401,
    "unauthorized",
    "Invalid or missing credentials",
  );
}
