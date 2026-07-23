import { z } from "zod";

// Typed environment validation (PHASE-0A-BRIEF.md scope item 2) — the web
// mirror of apps/api/src/env.ts: a missing or wrong variable fails loudly at
// module startup instead of surfacing later as an unexplained broken fetch.
// Vite inlines import.meta.env at build time and exposes only VITE_-prefixed
// variables to the browser, so nothing validated here is secret.
const envSchema = z.object({
  VITE_API_URL: z.string().url(),
});

export type WebEnv = z.infer<typeof envSchema>;

function validateEnv(raw: unknown): WebEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid web environment configuration — ${issues}. ` +
        "Copy apps/web/.env.example to apps/web/.env (see apps/web/README.md).",
    );
  }
  return result.data;
}

export const env = validateEnv(import.meta.env);
