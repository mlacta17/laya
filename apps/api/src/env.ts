import { z } from "zod";

// Typed environment validation (PHASE-0A-BRIEF.md scope item 2): a missing or
// wrong variable fails loudly instead of surfacing as confusing behavior
// deeper in a request. Auth variables are added here in the mock-issuer step.
const envSchema = z.object({
  ENVIRONMENT: z.enum(["development", "production"]),
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
