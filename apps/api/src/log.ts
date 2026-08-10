// Structured logging for the Worker. Every log line is one JSON object with a
// snake_case `event` name and the request id, so Cloudflare log queries can
// filter by event and correlate lines to a response's X-Request-Id
// (Phase 1 brief item 10: request and provider-transition logs).
//
// NEVER pass tokens, Authorization headers, signed URLs, or provider secrets
// in `fields` — sanitize at the call site (§8.1, NFR-5). This module stays
// framework-free on purpose: webhook handlers and startup code can use it
// without a Hono context.

type LogFields = { requestId: string } & Record<string, unknown>;

export function logWarn(event: string, fields: LogFields): void {
  console.warn({ event, ...fields });
}

export function logError(event: string, fields: LogFields): void {
  console.error({ event, ...fields });
}

// One standard shape for thrown values, whatever was actually thrown. Keeps
// `error.name` queryable even when a library throws a string or plain object.
export function serializeError(err: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: "NonError", message: String(err) };
}
