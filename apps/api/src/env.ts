import { z } from "zod";
import { jwksSchema } from "./auth/jwks-schema";

// Typed environment validation (PHASE-0A-BRIEF.md scope item 2): a missing or
// wrong variable fails loudly instead of surfacing as confusing behavior
// deeper in a request.
const envSchema = z
  .object({
    ENVIRONMENT: z.enum(["development", "production"]),

    // These fields are individually optional so production can have no auth
    // configuration in Phase 0A. superRefine below enforces the valid
    // environment-specific combinations.
    AUTH_ISSUER: z.string().url().optional(),
    AUTH_AUDIENCE: z.string().min(1).optional(),

    // Where the verifier gets public keys, exactly one of:
    //   MOCK_JWKS      — the mock issuer's public JWKS inline (dev only).
    //   AUTH_JWKS_URL  — the real provider's JWKS endpoint (Phase 0B).
    // MOCK_JWKS arrives as a JSON string var and is parsed and shape-checked
    // here. The deployed entrypoint validates it at Worker module startup, so
    // a broken fixture prevents the isolate from serving requests —
    // misconfiguration, never a bad request. Downstream code receives the
    // parsed document.
    MOCK_JWKS: z
      .string()
      .transform((raw, ctx) => {
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "must be valid JSON",
          });
          return z.NEVER;
        }
      })
      .pipe(jwksSchema)
      .optional(),
    AUTH_JWKS_URL: z
      .string()
      .url()
      .refine(
        (url) => url.toLowerCase().startsWith("https://"),
        "must use HTTPS",
      )
      .optional(),
  })
  .superRefine((env, ctx) => {
    const authFields = [
      "AUTH_ISSUER",
      "AUTH_AUDIENCE",
      "MOCK_JWKS",
      "AUTH_JWKS_URL",
    ] as const;

    // ADR-132/134: Phase 0A production has no issuer at all. Reject every
    // auth field so production cannot trust the committed mock fixture through
    // either an inline key or a URL. Phase 0B deliberately changes this when
    // the real provider is selected.
    if (env.ENVIRONMENT === "production") {
      for (const field of authFields) {
        if (env[field] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: "must not be set in Phase 0A production (ADR-132/ADR-134)",
          });
        }
      }
      return;
    }

    // Development auth is all-or-nothing, with exactly one public-key source.
    // Missing or ambiguous configuration is a startup error, never a stream
    // of unexplained 401 responses.
    for (const field of ["AUTH_ISSUER", "AUTH_AUDIENCE"] as const) {
      if (env[field] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "is required in development",
        });
      }
    }
    const keySourceCount =
      Number(env.MOCK_JWKS !== undefined) +
      Number(env.AUTH_JWKS_URL !== undefined);
    if (keySourceCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_JWKS_URL"],
        message:
          "development requires exactly one of MOCK_JWKS or AUTH_JWKS_URL",
      });
    }
  });

export type ValidatedEnv = z.infer<typeof envSchema>;

// The deployed entrypoint calls validateEnv directly at module startup. This
// identity cache supports the in-process app used by tests, where many
// independent bindings objects exercise one app instance.
const validatedEnvCache = new WeakMap<object, ValidatedEnv>();

export function getValidatedEnv(env: object): ValidatedEnv {
  const cached = validatedEnvCache.get(env);
  if (cached) {
    return cached;
  }

  const validated = validateEnv(env);
  validatedEnvCache.set(env, validated);
  return validated;
}

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
