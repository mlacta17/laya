import { z } from "zod";

// Every error code is classified retryable or terminal here, in the shared
// contract, so clients never guess (ARCHITECTURE.md §3.3).
export const ERROR_CODES = {
  invalid_request: { retryable: false },
  unauthorized: { retryable: false },
  not_found: { retryable: false },
  internal: { retryable: true },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function isRetryable(code: ErrorCode): boolean {
  return ERROR_CODES[code].retryable;
}

// The one error shape every route returns (ARCHITECTURE.md §3.3):
// { "error": { "code", "message", "requestId" } }
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(["invalid_request", "unauthorized", "not_found", "internal"]),
    message: z.string(),
    requestId: z.string(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
