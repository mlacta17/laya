import { z } from "zod";
import type { ValidatedEnv } from "../env";

// A JWKS is `{ "keys": [ { kid, kty, ... } ] }`. We validate only the shape
// we rely on and pass keys through to the verifier untouched.
const jwksSchema = z.object({
  keys: z.array(z.object({ kid: z.string().min(1) }).passthrough()),
});

export type JwksKey = z.infer<typeof jwksSchema>["keys"][number];

export type AuthConfig = {
  issuer: string;
  audience: string;
  keySource:
    | { type: "inline"; keys: JwksKey[] } // mock issuer, dev only (ADR-134)
    | { type: "url"; url: string }; // real provider JWKS endpoint (Phase 0B)
};

// Derives the verifier's configuration from validated env vars, or null when
// auth is not configured — production's state until Phase 0B (ADR-134), in
// which case every authenticated request is rejected with 401.
export function getAuthConfig(env: ValidatedEnv): AuthConfig | null {
  if (!env.AUTH_ISSUER || !env.AUTH_AUDIENCE) {
    return null;
  }
  if (env.MOCK_JWKS) {
    const parsed = jwksSchema.safeParse(JSON.parse(env.MOCK_JWKS));
    if (!parsed.success) {
      // Misconfiguration, not a bad request — fail loudly (500), never 401.
      throw new Error(`MOCK_JWKS is not a valid JWKS: ${parsed.error.message}`);
    }
    return {
      issuer: env.AUTH_ISSUER,
      audience: env.AUTH_AUDIENCE,
      keySource: { type: "inline", keys: parsed.data.keys },
    };
  }
  if (env.AUTH_JWKS_URL) {
    return {
      issuer: env.AUTH_ISSUER,
      audience: env.AUTH_AUDIENCE,
      keySource: { type: "url", url: env.AUTH_JWKS_URL },
    };
  }
  return null;
}
