import { z } from "zod";

// Typed environment validation (PHASE-0A-BRIEF.md scope item 2): a missing or
// wrong variable fails loudly instead of surfacing as confusing behavior
// deeper in a request.
const envSchema = z
  .object({
    ENVIRONMENT: z.enum(["development", "production"]),

    // Auth configuration. All optional because production has no issuer until
    // Phase 0B selects the real provider — until then every authenticated
    // production request is rejected with 401 (ADR-134).
    AUTH_ISSUER: z.string().min(1).optional(),
    AUTH_AUDIENCE: z.string().min(1).optional(),

    // Where the verifier gets public keys, exactly one of:
    //   MOCK_JWKS      — the mock issuer's public JWKS inline (dev only).
    //   AUTH_JWKS_URL  — the real provider's JWKS endpoint (Phase 0B).
    MOCK_JWKS: z.string().min(1).optional(),
    AUTH_JWKS_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    // ADR-132/134: production must be structurally unable to trust the mock
    // issuer. This makes that a startup failure, not a code-review hope.
    if (env.ENVIRONMENT === "production" && env.MOCK_JWKS !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MOCK_JWKS"],
        message: "must never be set in production (ADR-132/ADR-134)",
      });
    }
  });

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(env: unknown): ValidatedEnv {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid Worker environment configuration — ${issues}`);
  }
  return result.data;
}
