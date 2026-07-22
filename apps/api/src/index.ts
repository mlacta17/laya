import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { validateEnv } from "./env";
import { errorResponse } from "./errors";
import { health } from "./routes/health";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use(requestId());

app.use(async (c, next) => {
  validateEnv(c.env);
  await next();
  c.res.headers.set("X-Request-Id", c.get("requestId"));
});

app.route("/v1/health", health);

app.notFound((c) => errorResponse(c, 404, "not_found", "Route not found"));

app.onError((err, c) => {
  console.error(`[${c.get("requestId")}] Unhandled error:`, err);
  return errorResponse(c, 500, "internal", "Internal error");
});

export default app;
