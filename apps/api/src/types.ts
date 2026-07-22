import type { RequestIdVariables } from "hono/request-id";

// Raw bindings as Wrangler provides them — validated by src/env.ts before use.
export type Bindings = {
  ENVIRONMENT: string;
};

// The Hono type parameter every app/route/middleware in this Worker shares.
export type AppEnv = {
  Bindings: Bindings;
  Variables: RequestIdVariables;
};
