import type { ValidatedEnv } from "../env";
import type { JwksKey } from "./jwks-schema";

export type AuthConfig = {
  issuer: string;
  audience: string;
  keySource:
    | { type: "inline"; keys: JwksKey[] } // mock issuer, dev only (ADR-134)
    | { type: "url"; url: string }; // real provider JWKS endpoint (Phase 0B)
};

// Derives the verifier's configuration from validated env vars, or null when
// auth is not configured — production's state until Phase 0B (ADR-134), in
// which case every authenticated request is rejected with 401. MOCK_JWKS is
// already parsed and shape-checked by src/env.ts, so a broken fixture fails
// at startup rather than here.
export function getAuthConfig(env: ValidatedEnv): AuthConfig | null {
  if (env.ENVIRONMENT === "production") {
    return null;
  }
  if (!env.AUTH_ISSUER || !env.AUTH_AUDIENCE) {
    throw new Error("Validated development auth configuration is incomplete");
  }
  if (env.MOCK_JWKS) {
    return {
      issuer: env.AUTH_ISSUER,
      audience: env.AUTH_AUDIENCE,
      keySource: { type: "inline", keys: env.MOCK_JWKS.keys },
    };
  }
  if (env.AUTH_JWKS_URL) {
    return {
      issuer: env.AUTH_ISSUER,
      audience: env.AUTH_AUDIENCE,
      keySource: { type: "url", url: env.AUTH_JWKS_URL },
    };
  }
  throw new Error("Validated development auth configuration has no key source");
}
