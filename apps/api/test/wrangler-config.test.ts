import { describe, expect, it } from "vitest";
import { unstable_readConfig } from "wrangler";
import {
  MOCK_AUDIENCE,
  MOCK_ISSUER,
  MOCK_JWKS_JSON,
} from "../dev/mock-issuer/keys";

// wrangler.jsonc is configuration, not code — nothing typechecks its values
// against the fixtures they must match. These tests turn two comments into
// mechanical guarantees: the dev vars stay in sync with the committed
// mock-issuer fixture, and the production block stays free of mock material
// (the ADR-132 "verified by inspection of production config" acceptance
// check, run on every test run instead of by a human remembering to look).

// Use Wrangler's own parser so this test accepts exactly the JSONC syntax and
// environment-merging behavior that deployment uses. Wrangler currently
// exports the reader under an `unstable_` name; using the pinned tool's parser
// in a test is still safer than maintaining a partial parser that disagrees
// with deployment. Vitest runs this package with apps/api as its working
// directory.
//
// The declared return type references Node-only types this Workers-typed
// package deliberately does not install, so TypeScript resolves it as an
// error type (tsc hides that behind skipLibCheck; type-aware lint surfaces
// it). Assert only the minimal shape these tests consume.
type MinimalWranglerConfig = { vars: Record<string, unknown> };

const devConfig = unstable_readConfig(
  { config: "wrangler.jsonc" },
  { hideWarnings: true },
) as MinimalWranglerConfig;
const productionConfig = unstable_readConfig(
  { config: "wrangler.jsonc", env: "production" },
  { hideWarnings: true },
) as MinimalWranglerConfig;

describe("wrangler.jsonc dev vars", () => {
  it("stays in sync with the committed mock-issuer fixture", () => {
    expect(devConfig.vars.AUTH_ISSUER).toBe(MOCK_ISSUER);
    expect(devConfig.vars.AUTH_AUDIENCE).toBe(MOCK_AUDIENCE);
    expect(devConfig.vars.MOCK_JWKS).toBe(MOCK_JWKS_JSON);
  });
});

describe("wrangler.jsonc production environment (ADR-132/ADR-134)", () => {
  it("declares no auth vars at all in Phase 0A", () => {
    expect(Object.keys(productionConfig.vars)).toEqual(["ENVIRONMENT"]);
  });

  it("contains no mock-issuer material anywhere in its block", () => {
    const serialized = JSON.stringify(productionConfig).toLowerCase();
    expect(serialized).not.toContain("mock");
    expect(serialized).not.toContain(MOCK_ISSUER.toLowerCase());
  });
});
