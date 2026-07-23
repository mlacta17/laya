import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/env";

describe("Worker environment validation", () => {
  it("accepts production with no auth configuration", () => {
    expect(validateEnv({ ENVIRONMENT: "production" })).toEqual({
      ENVIRONMENT: "production",
    });
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

  it("accepts the dev mock-issuer configuration", () => {
    const env = validateEnv({
      ENVIRONMENT: "development",
      AUTH_ISSUER: "https://mock-issuer.laya.invalid",
      AUTH_AUDIENCE: "laya-api-dev",
      MOCK_JWKS: '{"keys":[{"kid":"mock","kty":"RSA"}]}',
    });
    expect(env.MOCK_JWKS).toContain('"kid":"mock"');
  });

  it("accepts a complete URL-backed development configuration", () => {
    expect(
      validateEnv({
        ENVIRONMENT: "development",
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
        AUTH_ISSUER: "https://provider.example",
      }),
    ).toThrow("AUTH_AUDIENCE: is required in development");
  });

  it("rejects development with two key sources", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "development",
        AUTH_ISSUER: "https://provider.example",
        AUTH_AUDIENCE: "laya-api-dev",
        MOCK_JWKS: '{"keys":[{"kid":"mock","kty":"RSA"}]}',
        AUTH_JWKS_URL: "https://provider.example/jwks.json",
      }),
    ).toThrow("development requires exactly one");
  });

  it("rejects a non-URL AUTH_JWKS_URL", () => {
    expect(() =>
      validateEnv({ ENVIRONMENT: "development", AUTH_JWKS_URL: "not a url" }),
    ).toThrow("Invalid Worker environment configuration");
  });

  it("rejects a non-HTTPS JWKS URL", () => {
    expect(() =>
      validateEnv({
        ENVIRONMENT: "development",
        AUTH_ISSUER: "https://provider.example",
        AUTH_AUDIENCE: "laya-api-dev",
        AUTH_JWKS_URL: "http://provider.example/jwks.json",
      }),
    ).toThrow("AUTH_JWKS_URL: must use HTTPS");
  });
});
