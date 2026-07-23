import { describe, expect, it } from "vitest";
import {
  MOCK_AUDIENCE,
  MOCK_ISSUER,
  MOCK_JWKS_JSON,
} from "../dev/mock-issuer/keys";
import wranglerConfigRaw from "../wrangler.jsonc?raw";

// wrangler.jsonc is configuration, not code — nothing typechecks its values
// against the fixtures they must match. These tests turn two comments into
// mechanical guarantees: the dev vars stay in sync with the committed
// mock-issuer fixture, and the production block stays free of mock material
// (the ADR-132 "verified by inspection of production config" acceptance
// check, run on every test run instead of by a human remembering to look).

// The file uses whole-line // comments only; strip those and parse as JSON.
// If someone adds inline or block comments later, JSON.parse fails and this
// test points straight at the problem.
const config = JSON.parse(
  wranglerConfigRaw
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n"),
) as {
  vars: Record<string, string>;
  env: { production: { vars: Record<string, string> } };
};

describe("wrangler.jsonc dev vars", () => {
  it("stays in sync with the committed mock-issuer fixture", () => {
    expect(config.vars.AUTH_ISSUER).toBe(MOCK_ISSUER);
    expect(config.vars.AUTH_AUDIENCE).toBe(MOCK_AUDIENCE);
    expect(config.vars.MOCK_JWKS).toBe(MOCK_JWKS_JSON);
  });
});

describe("wrangler.jsonc production environment (ADR-132/ADR-134)", () => {
  it("declares no auth vars at all in Phase 0A", () => {
    expect(Object.keys(config.env.production.vars)).toEqual(["ENVIRONMENT"]);
  });

  it("contains no mock-issuer material anywhere in its block", () => {
    const serialized = JSON.stringify(config.env.production).toLowerCase();
    expect(serialized).not.toContain("mock");
    expect(serialized).not.toContain(MOCK_ISSUER.toLowerCase());
  });
});
