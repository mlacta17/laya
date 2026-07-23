import { sign } from "hono/jwt";
import {
  MOCK_AUDIENCE,
  MOCK_ISSUER,
  MOCK_PRIVATE_JWK,
} from "../../dev/mock-issuer/keys";

// Mints tokens the way the mock issuer would, with per-test overrides.
// Setting a claim to `undefined` removes it entirely (e.g. { sub: undefined }
// mints a token with no subject).
export const TEST_SUBJECT = "test-user";

export async function mintToken(
  overrides: Record<string, unknown> = {},
  privateJwk: object = MOCK_PRIVATE_JWK,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    iss: MOCK_ISSUER,
    aud: MOCK_AUDIENCE,
    sub: TEST_SUBJECT,
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
  for (const key of Object.keys(claims)) {
    if (claims[key] === undefined) {
      delete claims[key];
    }
  }
  // The JWK carries alg + kid, so sign() emits the matching header itself.
  return sign(claims, privateJwk);
}
