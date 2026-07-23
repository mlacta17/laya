import { describe, expect, it } from "vitest";
import { getValidatedEnv, validateEnv } from "../src/env";

describe("Worker environment validation", () => {
  it("accepts production with no auth configuration", () => {
    expect(validateEnv({ ENVIRONMENT: "production" })).toEqual({
      ENVIRONMENT: "production",
    });
  });

  it("caches successful validation by bindings-object identity", () => {
    const bindings = {
      ENVIRONMENT: "development",
      WEB_ORIGIN: "http://localhost:5173",
      AUTH_ISSUER: "https://mock-issuer.laya.invalid",
      AUTH_AUDIENCE: "laya-api-dev",
      MOCK_JWKS: '{"keys":[{"kid":"mock","kty":"RSA"}]}',
    };

    expect(getValidatedEnv(bindings)).toBe(getValidatedEnv(bindings));
    expect(getValidatedEnv({ ...bindings })).not.toBe(
      getValidatedEnv(bindings),
    );
  });

  it("rejects a missing environment", () => {
    expect(() => validateEnv({})).toThrow(
      "Invalid Worker environment configuration",
    );
  });

  it("rejects an unknown environment", () => {
    expect(() => validateEnv({ ENVIRONMENT: "staging" })).toThrow(
      "Invalid Worker environment configuration",
    );
  });

  it("accepts the dev mock-issuer configuration and parses MOCK_JWKS", () => {
    const env = validateEnv({
      ENVIRONMENT: "development",
      WEB_ORIGIN: "http://localhost:5173",
      AUTH_ISSUER: "https://mock-issuer.laya.invalid",
      AUTH_AUDIENCE: "laya-api-dev",
      MOCK_JWKS: '{"keys":[{"kid":"mock","kty":"RSA"}]}',
    });
    expect(env.MOCK_JWKS?.keys[0]?.kid).toBe("mock");
  });

  // A broken JWKS fixture is a startup error, never a stream of unexplained
  // 401s — the shape check lives in the env schema itself.
  it.each([
    ["invalid JSON", "not-json"],
    ["an empty key set", '{"keys":[]}'],
    ["a key without kty", '{"keys":[{"kid":"missing-kty"}]}'],
  ])("rejects MOCK_JWKS that is %s", (_case, mockJwks) => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "development",
        WEB_ORIGIN: "http://localhost:5173",
        AUTH_ISSUER: "https://mock-issuer.laya.invalid",
        AUTH_AUDIENCE: "laya-api-dev",
        MOCK_JWKS: mockJwks,
      }),
    ).toThrow("Invalid Worker environment configuration");
  });

  it("accepts a complete URL-backed development configuration", () => {
    expect(
      validateEnv({
        ENVIRONMENT: "development",
        WEB_ORIGIN: "http://localhost:5173",
        AUTH_ISSUER: "https://provider.example",
        AUTH_AUDIENCE: "laya-api-dev",
        AUTH_JWKS_URL: "https://provider.example/jwks.json",
      }).AUTH_JWKS_URL,
    ).toBe("https://provider.example/jwks.json");
  });

  it.each([
    ["AUTH_ISSUER", "https://mock-issuer.laya.invalid"],
    ["AUTH_AUDIENCE", "laya-api-dev"],
    ["MOCK_JWKS", '{"keys":[{"kid":"mock","kty":"RSA"}]}'],
    ["AUTH_JWKS_URL", "https://mock.example/jwks.json"],
  ])("structurally rejects %s in Phase 0A production", (field, value) => {
    expect(() =>
      validateEnv({ ENVIRONMENT: "production", [field]: value }),
    ).toThrow("must not be set in Phase 0A production");
  });

  it("rejects incomplete development auth configuration", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "development",
        WEB_ORIGIN: "http://localhost:5173",
        AUTH_ISSUER: "https://provider.example",
      }),
    ).toThrow("AUTH_AUDIENCE: is required in development");
  });

  it("rejects development with two key sources", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "development",
        WEB_ORIGIN: "http://localhost:5173",
        AUTH_ISSUER: "https://provider.example",
        AUTH_AUDIENCE: "laya-api-dev",
        MOCK_JWKS: '{"keys":[{"kid":"mock","kty":"RSA"}]}',
        AUTH_JWKS_URL: "https://provider.example/jwks.json",
      }),
    ).toThrow("development requires exactly one");
  });

  it("rejects a non-URL AUTH_JWKS_URL", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "development",
        WEB_ORIGIN: "http://localhost:5173",
        AUTH_JWKS_URL: "not a url",
      }),
    ).toThrow("Invalid Worker environment configuration");
  });

  it("rejects a non-HTTPS JWKS URL", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "development",
        WEB_ORIGIN: "http://localhost:5173",
        AUTH_ISSUER: "https://provider.example",
        AUTH_AUDIENCE: "laya-api-dev",
        AUTH_JWKS_URL: "http://provider.example/jwks.json",
      }),
    ).toThrow("AUTH_JWKS_URL: must use HTTPS");
  });

  it("requires the browser origin in development", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "development",
        AUTH_ISSUER: "https://mock-issuer.laya.invalid",
        AUTH_AUDIENCE: "laya-api-dev",
        MOCK_JWKS: '{"keys":[{"kid":"mock","kty":"RSA"}]}',
      }),
    ).toThrow("WEB_ORIGIN: is required in development");
  });

  it("accepts an exact production web origin when one is deployed", () => {
    expect(
      validateEnv({
        ENVIRONMENT: "production",
        WEB_ORIGIN: "https://laya.example",
      }).WEB_ORIGIN,
    ).toBe("https://laya.example");
  });

  it("rejects a web URL that is not an exact origin", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "production",
        WEB_ORIGIN: "https://laya.example/app",
      }),
    ).toThrow("WEB_ORIGIN: must be an origin only");
  });

  it("requires HTTPS for a production web origin", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "production",
        WEB_ORIGIN: "http://laya.example",
      }),
    ).toThrow("WEB_ORIGIN: must use HTTPS in production");
  });
});
