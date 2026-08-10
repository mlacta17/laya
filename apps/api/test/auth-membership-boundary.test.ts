import { createMiddleware } from "hono/factory";
import { beforeEach, describe, expect, it } from "vitest";
import { isRetryable } from "@laya/shared";
import { requireAuth } from "../src/auth/require-auth";
import { errorResponse } from "../src/errors";
import type { AppEnv } from "../src/types";
import {
  MOCK_AUDIENCE,
  MOCK_ISSUER,
  MOCK_JWKS_JSON,
} from "../dev/mock-issuer/keys";
import { mintToken, TEST_SUBJECT } from "./helpers/mock-tokens";
import { buildTestApp } from "./helpers/test-app";

// Phase 0B boundary proof only. This deliberately models the minimum
// provider-neutral authorization relationship in memory; it is not the
// production invitation implementation or a proposed database schema.
const profileIdByIdentity = new Map<string, string>();
const activeMemberships = new Set<string>();

function identityKey(issuer: string, subject: string): string {
  // A provider subject is unique only within its issuer. Keeping both values
  // in the key prevents identities from different providers/tenants from
  // colliding when Laya changes environments or providers.
  return `${issuer}\u0000${subject}`;
}

const requireTestMembership = createMiddleware<AppEnv>(async (c, next) => {
  const { issuer, subject } = c.var.auth;
  const profileId = profileIdByIdentity.get(identityKey(issuer, subject));

  if (!profileId || !activeMemberships.has(profileId)) {
    // ADR-144: `forbidden` is the accepted shared code for a verified
    // identity without active Laya membership or the necessary role.
    return errorResponse(c, 403, "forbidden", "Access denied");
  }

  await next();
});

const app = buildTestApp();
app.get("/library", requireAuth, requireTestMembership, (c) =>
  c.json({ status: "ok" }),
);

const env = {
  ENVIRONMENT: "development",
  WEB_ORIGIN: "http://localhost:5173",
  AUTH_ISSUER: MOCK_ISSUER,
  AUTH_AUDIENCE: MOCK_AUDIENCE,
  MOCK_JWKS: MOCK_JWKS_JSON,
  DB: {} as D1Database,
};

beforeEach(() => {
  profileIdByIdentity.clear();
  activeMemberships.clear();
});

async function requestLibrary(token: string): Promise<Response> {
  return app.request(
    "/library",
    { headers: { Authorization: `Bearer ${token}` } },
    env,
  );
}

async function expectForbidden(response: Response): Promise<void> {
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({
    error: {
      code: "forbidden",
      message: "Access denied",
    },
  });
  // ADR-144: a permission denial is terminal for the caller — retrying the
  // same request cannot succeed until an operator changes their membership.
  expect(isRetryable("forbidden")).toBe(false);
}

describe("provider identity versus Laya membership boundary", () => {
  it("does not grant application access to a valid provider identity alone", async () => {
    await expectForbidden(await requestLibrary(await mintToken()));
  });

  it("requires both an internal identity mapping and active membership", async () => {
    const token = await mintToken();
    const profileId = "019c0000-0000-7000-8000-000000000001";
    profileIdByIdentity.set(identityKey(MOCK_ISSUER, TEST_SUBJECT), profileId);

    await expectForbidden(await requestLibrary(token));

    activeMemberships.add(profileId);
    expect((await requestLibrary(token)).status).toBe(200);
  });

  it("revokes Laya access without invalidating the provider token", async () => {
    const token = await mintToken();
    const profileId = "019c0000-0000-7000-8000-000000000001";
    profileIdByIdentity.set(identityKey(MOCK_ISSUER, TEST_SUBJECT), profileId);
    activeMemberships.add(profileId);

    expect((await requestLibrary(token)).status).toBe(200);

    activeMemberships.delete(profileId);

    // The exact same, still-cryptographically-valid provider token is denied
    // because the application membership is the authorization boundary.
    await expectForbidden(await requestLibrary(token));
  });
});
