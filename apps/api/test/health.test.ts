import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ERROR_CODES,
  errorEnvelopeSchema,
  healthResponseSchema,
  isRetryable,
} from "@laya/shared";
import app from "../src/index";

const devEnv = { ENVIRONMENT: "development" };

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

describe("error envelope", () => {
  it("returns the standard envelope for unknown routes", async () => {
    const res = await app.request("/v1/does-not-exist", {}, devEnv);

    expect(res.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("not_found");
  });

  it("fails loudly with the envelope when the environment is invalid", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
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
});
