import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/env";

describe("Worker environment validation", () => {
  it.each(["development", "production"] as const)(
    "accepts the %s environment",
    (environment) => {
      expect(validateEnv({ ENVIRONMENT: environment })).toEqual({
        ENVIRONMENT: environment,
      });
    },
  );

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
      MOCK_JWKS: '{"keys":[]}',
    });
    expect(env.MOCK_JWKS).toBe('{"keys":[]}');
  });

  it("structurally rejects MOCK_JWKS in production (ADR-132/ADR-134)", () => {
    expect(() =>
      validateEnv({ ENVIRONMENT: "production", MOCK_JWKS: '{"keys":[]}' }),
    ).toThrow("MOCK_JWKS: must never be set in production");
  });

  it("rejects a non-URL AUTH_JWKS_URL", () => {
    expect(() =>
      validateEnv({ ENVIRONMENT: "development", AUTH_JWKS_URL: "not a url" }),
    ).toThrow("Invalid Worker environment configuration");
  });
});
