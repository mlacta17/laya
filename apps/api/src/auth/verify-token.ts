import { verifyWithJwks } from "hono/jwt";
import { JwtTokenInvalid } from "hono/utils/jwt/types";
import type { AuthConfig } from "./config";
import { getSigningKeys } from "./jwks";

export type AuthContext = {
  subject: string;
};

export class JwtClaimMissing extends Error {
  override name = "JwtClaimMissing";
}

// Verifies an access token per §8.1: signature against the JWKS (kid-matched,
// RS256 only — hono/jwt hard-rejects symmetric algorithms), issuer, audience,
// exp/nbf/iat. Throws a typed error on any failure; the middleware turns all
// of them into the same generic 401.
export async function verifyAccessToken(
  token: string,
  config: AuthConfig,
): Promise<AuthContext> {
  let keys = await getSigningKeys(config.keySource);

  const verification = {
    iss: config.issuer,
    aud: config.audience,
    exp: true,
    nbf: true,
    iat: true,
  };

  let payload;
  try {
    payload = await verifyWithJwks(token, {
      keys,
      verification,
      allowedAlgorithms: ["RS256"],
    });
  } catch (err) {
    // JwtTokenInvalid covers "no key matches this kid". With a fetched JWKS
    // that can just mean our cache predates a provider key rotation, so
    // refresh once and retry. (A malformed token also lands here and wastes
    // one refetch — rare enough to keep this branch simple.)
    if (err instanceof JwtTokenInvalid && config.keySource.type === "url") {
      keys = await getSigningKeys(config.keySource, { forceRefresh: true });
      payload = await verifyWithJwks(token, {
        keys,
        verification,
        allowedAlgorithms: ["RS256"],
      });
    } else {
      throw err;
    }
  }

  // hono/jwt only checks exp/nbf/iat when present, and never checks sub.
  // Fail closed: a token without an expiry or a subject is not acceptable.
  if (typeof payload.exp !== "number") {
    throw new JwtClaimMissing("token has no exp claim");
  }
  if (typeof payload.sub !== "string" || payload.sub === "") {
    throw new JwtClaimMissing("token has no sub claim");
  }

  return { subject: payload.sub };
}
