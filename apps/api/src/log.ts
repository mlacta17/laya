// Structured logging for the Worker. Every log line is one JSON object with a
// snake_case `event` name and the request id, so Cloudflare log queries can
// filter by event and correlate lines to a response's X-Request-Id
// (Phase 1 brief item 10: request and provider-transition logs).
//
// NEVER pass tokens, Authorization headers, signed URLs, or provider secrets
// in `fields` — sanitize at the call site (§8.1, NFR-5). This module stays
// framework-free on purpose: webhook handlers can use it without a Hono
// context.

type LogFields = {
  requestId: string;
  // The positional argument is the only source of the event name. Keeping it
  // out of fields prevents accidental query-key changes at new call sites.
  event?: never;
} & Record<string, unknown>;

export function logWarn(event: string, fields: LogFields): void {
  // Write the canonical event last as a runtime backstop for untyped callers.
  console.warn({ ...fields, event });
}

export function logError(event: string, fields: LogFields): void {
  console.error({ ...fields, event });
}

const SAFE_ERROR_NAMES = new Set([
  "Error",
  "AggregateError",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);

// Arbitrary library errors may embed tokens, signed URLs, headers, response
// bodies, or local paths in their message and stack. The safe default records
// only a normalized class for grouping. Callers may add separately reviewed
// operational detail as an explicit field; never pass raw thrown values.
export function serializeError(err: unknown): { name: string } {
  if (!(err instanceof Error)) {
    return { name: "NonError" };
  }

  return {
    // Use a fixed allowlist rather than a character pattern: an API key can be
    // perfectly alphanumeric and some libraries allow callers to set `name`.
    name: SAFE_ERROR_NAMES.has(err.name) ? err.name : "Error",
  };
}
