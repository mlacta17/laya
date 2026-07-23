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
});
