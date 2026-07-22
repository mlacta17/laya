import { describe, expect, it } from "vitest";
import { errorEnvelopeSchema, healthResponseSchema } from "@laya/shared";
import app from "../src/index";

const devEnv = { ENVIRONMENT: "development" };

describe("GET /v1/health", () => {
  it("returns 200 with a schema-valid body and matching X-Request-Id", async () => {
    const res = await app.request("/v1/health", {}, devEnv);

    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(await res.json());
    expect(body.status).toBe("ok");
    expect(body.version).not.toBe("");
    expect(res.headers.get("X-Request-Id")).toBe(body.requestId);
  });
});

describe("error envelope", () => {
  it("returns the standard envelope for unknown routes", async () => {
    const res = await app.request("/v1/does-not-exist", {}, devEnv);

    expect(res.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("not_found");
    expect(body.error.requestId).not.toBe("");
  });

  it("fails loudly with the envelope when the environment is invalid", async () => {
    const res = await app.request("/v1/health", {}, { ENVIRONMENT: "staging" });

    expect(res.status).toBe(500);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("internal");
  });
});
