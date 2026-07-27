import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ERROR_CODES,
  errorEnvelopeSchema,
  healthResponseSchema,
  isRetryable,
} from "@laya/shared";
import {
  MOCK_AUDIENCE,
  MOCK_ISSUER,
  MOCK_JWKS_JSON,
} from "../dev/mock-issuer/keys";
import { createApp } from "../src/app";
import { getValidatedEnv } from "../src/env";

const app = createApp(getValidatedEnv);

const devEnv = {
  ENVIRONMENT: "development",
  WEB_ORIGIN: "http://localhost:5173",
  AUTH_ISSUER: MOCK_ISSUER,
  AUTH_AUDIENCE: MOCK_AUDIENCE,
  MOCK_JWKS: MOCK_JWKS_JSON,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /v1/health", () => {
  it("returns 200 with a schema-valid body and matching X-Request-Id", async () => {
    const res = await app.request("/v1/health", {}, devEnv);

    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(await res.json());
    expect(body.status).toBe("ok");
    expect(res.headers.get("X-Request-Id")).toBe(body.requestId);
  });
});

describe("CORS policy (ADR-137)", () => {
  it("allows the configured web origin and exposes the request ID", async () => {
    const res = await app.request(
      "/v1/health",
      { headers: { Origin: devEnv.WEB_ORIGIN } },
      devEnv,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      devEnv.WEB_ORIGIN,
    );
    expect(res.headers.get("Access-Control-Expose-Headers")).toBe(
      "X-Request-Id",
    );
    expect(res.headers.get("Vary")).toContain("Origin");
  });

  it("does not allow an unconfigured origin", async () => {
    const res = await app.request(
      "/v1/health",
      { headers: { Origin: "https://attacker.example" } },
      devEnv,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("answers the authenticated PUT preflight without invoking auth", async () => {
    const res = await app.request(
      "/v1/ping-store",
      {
        method: "OPTIONS",
        headers: {
          Origin: devEnv.WEB_ORIGIN,
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers":
            "authorization, content-type, x-request-id",
        },
      },
      devEnv,
    );

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      devEnv.WEB_ORIGIN,
    );
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("PUT");
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization,Content-Type,X-Request-Id",
    );
  });

  it("permits no browser origin when production has no web host", async () => {
    const res = await app.request(
      "/v1/health",
      { headers: { Origin: devEnv.WEB_ORIGIN } },
      { ENVIRONMENT: "production" },
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("error envelope", () => {
  it("returns the standard envelope for unknown routes", async () => {
    const res = await app.request("/v1/does-not-exist", {}, devEnv);

    expect(res.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("not_found");
  });

  it("fails loudly with the envelope when the environment is invalid", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const res = await app.request("/v1/health", {}, { ENVIRONMENT: "staging" });

    expect(res.status).toBe(500);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("internal");
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "unhandled_request_error",
        requestId: body.error.requestId,
      }),
    );
  });

  it("rejects an empty request ID", () => {
    const result = errorEnvelopeSchema.safeParse({
      error: { code: "internal", message: "Internal error", requestId: "" },
    });

    expect(result.success).toBe(false);
  });

  it("classifies every published error code", () => {
    expect(ERROR_CODES.map((code) => [code, isRetryable(code)])).toEqual([
      ["invalid_request", false],
      ["unauthorized", false],
      ["not_found", false],
      ["payload_too_large", false],
      ["internal", true],
    ]);
  });

  it("returns the standard 413 envelope when the global body limit is exceeded", async () => {
    const res = await app.request(
      "/v1/ping-store",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(17 * 1024) }),
      },
      devEnv,
    );

    expect(res.status).toBe(413);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("payload_too_large");
    expect(res.headers.get("X-Request-Id")).toBe(body.error.requestId);
  });
});
