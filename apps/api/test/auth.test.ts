import { afterEach, describe, expect, it, vi } from "vitest";
import { errorEnvelopeSchema } from "@laya/shared";
import {
  MOCK_AUDIENCE,
  MOCK_ISSUER,
  MOCK_JWKS_JSON,
  MOCK_PUBLIC_JWK,
} from "../dev/mock-issuer/keys";
import { createApp } from "../src/app";
import {
  clearJwksCache,
  getSigningKeys,
  JwksFetchError,
} from "../src/auth/jwks";
import { verifyAccessToken } from "../src/auth/verify-token";
import { getValidatedEnv } from "../src/env";
import { mintToken, TEST_SUBJECT } from "./helpers/mock-tokens";
import { ROGUE_PRIVATE_JWK } from "./helpers/rogue-key";

const app = createApp(getValidatedEnv);

// The JWT rejection matrix (brief scope item 10) — the inherited pattern for
// every future authenticated route. The "accept the valid case" half lives
// in ping-store.test.ts as the round-trip. Rejections never reach the route
// handler, so DB is a stub here.
const devEnv = {
  ENVIRONMENT: "development",
  WEB_ORIGIN: "http://localhost:5173",
  AUTH_ISSUER: MOCK_ISSUER,
  AUTH_AUDIENCE: MOCK_AUDIENCE,
  MOCK_JWKS: MOCK_JWKS_JSON,
  DB: {} as D1Database,
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearJwksCache();
});

async function requestWithAuth(
  header: string | undefined,
  env: object = devEnv,
) {
  const init =
    header === undefined ? {} : { headers: { Authorization: header } };
  return app.request("/v1/ping-store", init, env);
}

async function expectUnauthorized(res: Response) {
  expect(res.status).toBe(401);
  const body = errorEnvelopeSchema.parse(await res.json());
  expect(body.error.code).toBe("unauthorized");
}

describe("JWT rejection matrix", () => {
  // Every rejection logs auth_rejected; silence the expected noise.
  const silenceWarn = () =>
    vi.spyOn(console, "warn").mockImplementation(() => {});

  it("rejects a missing token", async () => {
    silenceWarn();
    await expectUnauthorized(await requestWithAuth(undefined));
  });

  it("rejects an expired token", async () => {
    silenceWarn();
    const token = await mintToken({ exp: nowSeconds() - 60 });
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));
  });

  it("never writes a rejected bearer token to structured logs", async () => {
    const warn = silenceWarn();
    const token = await mintToken({ exp: nowSeconds() - 60 });

    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));

    expect(warn).toHaveBeenCalledTimes(1);
    const logEntry = warn.mock.calls[0]?.[0];
    expect(logEntry).toEqual(
      expect.objectContaining({
        event: "auth_rejected",
        reason: "JwtTokenExpired",
      }),
    );
    expect(logEntry).not.toHaveProperty("detail");
    expect(JSON.stringify(logEntry)).not.toContain(token);
  });

  it("rejects a wrong audience", async () => {
    silenceWarn();
    const token = await mintToken({ aud: "some-other-api" });
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));
  });

  it("rejects an invalid signature (right kid, wrong key)", async () => {
    silenceWarn();
    const token = await mintToken({}, ROGUE_PRIVATE_JWK);
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));
  });

  it("rejects an unknown key id", async () => {
    silenceWarn();
    const token = await mintToken(
      {},
      {
        ...(await import("../dev/mock-issuer/keys")).MOCK_PRIVATE_JWK,
        kid: "not-a-known-kid",
      },
    );
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));
  });

  it("rejects a wrong issuer", async () => {
    silenceWarn();
    const token = await mintToken({ iss: "https://evil.example" });
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));
  });

  it("rejects a not-before in the future", async () => {
    silenceWarn();
    const token = await mintToken({ nbf: nowSeconds() + 3600 });
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));
  });

  it("rejects a missing subject", async () => {
    silenceWarn();
    const token = await mintToken({ sub: undefined });
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));
  });

  it("rejects a missing expiry (fail closed beyond hono's checks)", async () => {
    silenceWarn();
    const token = await mintToken({ exp: undefined });
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`));
  });

  it.each(["Token abc", "Bearer", "bearer a b", ""])(
    "rejects a malformed bearer header: %j",
    async (header) => {
      silenceWarn();
      await expectUnauthorized(await requestWithAuth(header));
    },
  );

  it("rejects a malformed JWT", async () => {
    silenceWarn();
    await expectUnauthorized(await requestWithAuth("Bearer not.a.jwt"));
  });

  it("rejects a malformed JWT without fetching URL-backed keys", async () => {
    silenceWarn();
    const env = {
      ...devEnv,
      MOCK_JWKS: undefined,
      AUTH_JWKS_URL: "https://provider.example/jwks.json",
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expectUnauthorized(await requestWithAuth("Bearer not.a.jwt", env));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when the JWKS fetch fails, logging the outage detail", async () => {
    const warn = silenceWarn();
    // Real-provider path: keys come from a URL, and that fetch breaks.
    const env = {
      ...devEnv,
      MOCK_JWKS: undefined,
      AUTH_JWKS_URL: "https://provider.example/jwks.json",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connection refused")),
    );
    const token = await mintToken();
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`, env));

    // The client sees only the generic 401, but the structured log carries
    // the JwksFetchError detail an operator needs during a provider outage.
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth_rejected",
        reason: "JwksFetchError",
        detail: expect.stringContaining("connection refused"),
      }),
    );
  });

  it("rejects everything when auth is not configured (production until 0B, ADR-134)", async () => {
    silenceWarn();
    const env = { ENVIRONMENT: "production", DB: {} as D1Database };
    const token = await mintToken();
    await expectUnauthorized(await requestWithAuth(`Bearer ${token}`, env));
  });
});

// Malformed MOCK_JWKS is a startup error — those cases live in env.test.ts
// with the rest of the environment validation.

describe("JWKS fetch and cache (real-provider path)", () => {
  const url = "https://provider.example/jwks.json";
  const urlSource = { type: "url", url } as const;
  const jwksResponse = () =>
    new Response(MOCK_JWKS_JSON, {
      headers: { "Content-Type": "application/json" },
    });

  it("fetches once and serves later calls from cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jwksResponse());
    vi.stubGlobal("fetch", fetchMock);

    const first = await getSigningKeys(urlSource);
    const second = await getSigningKeys(urlSource);

    expect(first[0]?.kid).toBe(MOCK_PUBLIC_JWK.kid);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("shares one in-flight fetch across concurrent cache misses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jwksResponse());
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      getSigningKeys(urlSource),
      getSigningKeys(urlSource),
    ]);

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches on forceRefresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jwksResponse())
      .mockResolvedValueOnce(jwksResponse());
    vi.stubGlobal("fetch", fetchMock);

    await getSigningKeys(urlSource);
    await getSigningKeys(urlSource, { forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws JwksFetchError on a non-OK response or bad body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 })),
    );
    await expect(getSigningKeys(urlSource)).rejects.toBeInstanceOf(
      JwksFetchError,
    );

    clearJwksCache();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ nope: true })),
    );
    await expect(getSigningKeys(urlSource)).rejects.toBeInstanceOf(
      JwksFetchError,
    );

    clearJwksCache();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ keys: [] })),
    );
    await expect(getSigningKeys(urlSource)).rejects.toBeInstanceOf(
      JwksFetchError,
    );

    clearJwksCache();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ keys: [{ kid: "missing-kty" }] })),
    );
    await expect(getSigningKeys(urlSource)).rejects.toBeInstanceOf(
      JwksFetchError,
    );
  });

  it("retries once with fresh keys when the kid is not in the cached JWKS (rotation)", async () => {
    const staleJwks = JSON.stringify({
      keys: [{ ...MOCK_PUBLIC_JWK, kid: "rotated-away" }],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(staleJwks))
      .mockResolvedValueOnce(jwksResponse());
    vi.stubGlobal("fetch", fetchMock);

    const token = await mintToken();
    const auth = await verifyAccessToken(token, {
      issuer: MOCK_ISSUER,
      audience: MOCK_AUDIENCE,
      keySource: urlSource,
    });

    expect(auth.subject).toBe(TEST_SUBJECT);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
