import { z } from "zod";

// This tuple is the single source of truth for both the runtime schema and
// the TypeScript type. Adding a code here makes every classification below a
// compile-time requirement (ARCHITECTURE.md §3.3).
export const ERROR_CODES = [
  "invalid_request",
  "unauthorized",
  "not_found",
  "payload_too_large",
  "internal",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const RETRYABLE_BY_ERROR_CODE = {
  invalid_request: false,
  unauthorized: false,
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
