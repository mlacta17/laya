import { jwksSchema, type AuthConfig, type JwksKey } from "./config";

// Public signing keys for the verifier. Inline mock keys (dev) are returned
// as-is; a provider JWKS URL (Phase 0B) is fetched and cached per isolate so
// we do not hit the provider on every request.
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const JWKS_FETCH_TIMEOUT_MS = 5 * 1000;

let cache: { url: string; keys: JwksKey[]; fetchedAt: number } | null = null;
let inFlight: { url: string; promise: Promise<JwksKey[]> } | null = null;

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

  // A cold isolate or key rotation may send several requests here together.
  // Share one provider request instead of creating a small fetch stampede.
  if (inFlight?.url === keySource.url) {
    return inFlight.promise;
  }

  const promise = fetchSigningKeys(keySource.url);
  inFlight = { url: keySource.url, promise };
  try {
    return await promise;
  } finally {
    if (inFlight?.promise === promise) {
      inFlight = null;
    }
  }
}

async function fetchSigningKeys(url: string): Promise<JwksKey[]> {
  let body: unknown;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(JWKS_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new JwksFetchError(`JWKS endpoint returned ${response.status}`);
    }
    body = await response.json();
  } catch (err) {
    if (err instanceof JwksFetchError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new JwksFetchError(`JWKS fetch failed: ${message}`);
  }

  const parsed = jwksSchema.safeParse(body);
  if (!parsed.success) {
    throw new JwksFetchError(`JWKS response is invalid: ${parsed.error.message}`);
  }

  cache = { url, keys: parsed.data.keys, fetchedAt: Date.now() };
  return parsed.data.keys;
}

// Tests use this to isolate cache state between cases.
export function clearJwksCache(): void {
  cache = null;
  inFlight = null;
}
