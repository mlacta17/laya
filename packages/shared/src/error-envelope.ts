import { z } from "zod";

// This tuple is the single source of truth for both the runtime schema and
// the TypeScript type. Adding a code here makes every classification below a
// compile-time requirement (ARCHITECTURE.md §3.3).
export const ERROR_CODES = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "payload_too_large",
  "internal",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

// ADR-144 boundary between the two auth codes: `unauthorized` (401) means
// authentication failed — the caller's identity was never established.
// `forbidden` (403) means a verified identity lacks Laya permission for the
// operation (no active membership, missing role). Where acknowledging that a
// resource even exists would leak information — unknown invitation tokens,
// operator-only routes probed by non-operators — respond `not_found` instead.
const RETRYABLE_BY_ERROR_CODE = {
  invalid_request: false,
  unauthorized: false,
  forbidden: false,
  not_found: false,
  payload_too_large: false,
  internal: true,
} as const satisfies Record<ErrorCode, boolean>;

export function isRetryable(code: ErrorCode): boolean {
  return RETRYABLE_BY_ERROR_CODE[code];
}

// The one error shape every route returns (ARCHITECTURE.md §3.3):
// { "error": { "code", "message", "requestId" } }
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
