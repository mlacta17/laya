import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { validateEnv } from "./env";
import { errorResponse } from "./errors";
import { devJwks } from "./routes/dev-jwks";
import { health } from "./routes/health";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// Reuses a client-supplied X-Request-Id (sanitized by Hono) or generates a
// UUID, then echoes it on every response built through the context (c.json
// and friends, including notFound/onError) — no manual header handling
// needed. Because clients can choose the value, request ids are tracing
// hints: never treat them as unique, unguessable, or trusted.
app.use(requestId());

app.use(async (c, next) => {
  c.set("config", validateEnv(c.env));
  await next();
});

app.route("/v1/health", health);
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

export default app;
