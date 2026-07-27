import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import type { MiddlewareHandler } from "hono/types";
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

function corsForOrigin(allowedOrigin?: string): MiddlewareHandler<AppEnv> {
  // Hono's CORS factory defaults its Context type to `any`; narrow the
  // returned middleware to this app's shared environment at the boundary.
  return cors({
    origin: allowedOrigin ? [allowedOrigin] : [],
    allowMethods: ["GET", "HEAD", "PUT", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 600,
  }) as MiddlewareHandler<AppEnv>;
}

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

  // The SPA and API have separate origins locally and when deployed. Permit
  // only the exact, validated origin for this environment (ADR-137); an
  // absent production WEB_ORIGIN means no browser origin is trusted yet.
  // Bearer auth uses an explicit Authorization header, not CORS credentials.
  app.use("/v1/*", async (c, next) => {
    // Hono infers wildcard-route input as `any`; the middleware does not read
    // route parameters or request input, so narrow that generated type here.
    return corsForOrigin(c.var.config.WEB_ORIGIN)(
      c as Context<AppEnv, string, object>,
      next,
    );
  });

  app.use(
    bodyLimit({
      maxSize: MAX_REQUEST_BODY_BYTES,
      // bodyLimit types its onError context as Context<any>; annotate it so
      // errorResponse keeps its fully typed AppEnv contract.
      onError: (c: Context<AppEnv>) =>
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
