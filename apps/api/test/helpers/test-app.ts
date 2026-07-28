import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { getValidatedEnv } from "../../src/env";
import type { AppEnv } from "../../src/types";

// The minimal middleware stack every test-only route needs: request IDs for
// the error envelope, plus per-bindings validated configuration — the same
// wiring src/app.ts gives real routes (minus CORS and body limits, which
// have their own tests against the real app). Register test routes on the
// returned app.
export function buildTestApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use(requestId());
  app.use(async (c, next) => {
    c.set("config", getValidatedEnv(c.env));
    await next();
  });
  return app;
}
