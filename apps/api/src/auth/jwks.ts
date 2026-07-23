import type { AuthConfig, JwksKey } from "./config";

// Public signing keys for the verifier. Inline mock keys (dev) are returned
// as-is; a provider JWKS URL (Phase 0B) is fetched and cached per isolate so
// we do not hit the provider on every request.
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { url: string; keys: JwksKey[]; fetchedAt: number } | null = null;

// Thrown so the middleware can log the real reason; the client still gets
// the generic 401 envelope (the JWKS being down is not their fault to see).
export class JwksFetchError extends Error {
  override name = "JwksFetchError";
}

export async function getSigningKeys(
  keySource: AuthConfig["keySource"],
  options: { forceRefresh?: boolean } = {},
): Promise<JwksKey[]> {
  if (keySource.type === "inline") {
    return keySource.keys;
  }

  const fresh =
    cache !== null &&
    cache.url === keySource.url &&
    Date.now() - cache.fetchedAt < JWKS_CACHE_TTL_MS;
  if (fresh && !options.forceRefresh && cache) {
    return cache.keys;
  }

  let body: unknown;
  try {
    const response = await fetch(keySource.url);
    if (!response.ok) {
      throw new JwksFetchError(`JWKS endpoint returned ${response.status}`);
    }
    body = await response.json();
  } catch (err) {
    if (err instanceof JwksFetchError) {
      throw err;
    }
    throw new JwksFetchError(`JWKS fetch failed: ${(err as Error).message}`);
  }

  const keys = (body as { keys?: JwksKey[] }).keys;
  if (!Array.isArray(keys)) {
    throw new JwksFetchError('JWKS response has no "keys" array');
  }

  cache = { url: keySource.url, keys, fetchedAt: Date.now() };
  return keys;
}

// Tests use this to isolate cache state between cases.
export function clearJwksCache(): void {
  cache = null;
}
