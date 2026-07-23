import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode, ErrorEnvelope } from "@laya/shared";
import type { AppEnv } from "./types";

// The only way any route in this Worker emits an error — keeps every failure
// on the §3.3 envelope: { "error": { "code", "message", "requestId" } }.
export function errorResponse(
  c: Context<AppEnv>,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
) {
  const body: ErrorEnvelope = {
    error: { code, message, requestId: c.get("requestId") },
  };
  return c.json(body, status);
}
