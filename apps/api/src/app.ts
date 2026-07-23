import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { requestId } from "hono/request-id";
import type { ValidatedEnv } from "./env";
import { errorResponse } from "./errors";
import { devJwks } from "./routes/dev-jwks";
import { health } from "./routes/health";
import { pingStore } from "./routes/ping-store";
import type { AppEnv } from "./types";

// §3.3: explicit maximum request-body size; media bytes are rejected by the
// API. Every route inherits this default — raise it per-route only with an
// explicit reason.
const MAX_REQUEST_BODY_BYTES = 16 * 1024;

type ConfigResolver = (bindings: Env) => ValidatedEnv;

// Production passes a configuration validated at Worker module startup.
// Tests pass a resolver so each isolated bindings object can be exercised
// through the same application without importing runtime-only globals.
export function createApp(resolveConfig: ConfigResolver): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // Reuses a client-supplied X-Request-Id (sanitized by Hono) or generates a
  // UUID, then echoes it on every response built through the context (c.json
  // and friends, including notFound/onError) — no manual header handling
  // needed. Because clients can choose the value, request ids are tracing
  // hints: never treat them as unique, unguessable, or trusted.
  app.use(requestId());

  app.use(async (c, next) => {
    c.set("config", resolveConfig(c.env));
    await next();
  });

  app.use(
    bodyLimit({
      maxSize: MAX_REQUEST_BODY_BYTES,
      onError: (c) =>
        errorResponse(c, 413, "payload_too_large", "Request body too large"),
    }),
  );

  app.route("/v1/health", health);
  app.route("/v1/ping-store", pingStore);
  app.route("/dev/.well-known/jwks.json", devJwks);

  app.notFound((c) => errorResponse(c, 404, "not_found", "Route not found"));

  app.onError((err, c) => {
    console.error({
      event: "unhandled_request_error",
      requestId: c.get("requestId"),
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
    });
    return errorResponse(c, 500, "internal", "Internal error");
  });

  return app;
}
