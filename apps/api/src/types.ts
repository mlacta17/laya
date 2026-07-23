import type { RequestIdVariables } from "hono/request-id";
import type { ValidatedEnv } from "./env";

// Raw bindings as Wrangler provides them — string vars are validated by
// src/env.ts before use; native platform bindings (D1) are used directly.
export type Bindings = {
  ENVIRONMENT: string;
  DB: D1Database;
};

// The Hono type parameter every app/route/middleware in this Worker shares.
export type AppEnv = {
  Bindings: Bindings;
  Variables: RequestIdVariables & {
    // Routes read configuration strings from here after Zod validation.
    // Native platform bindings such as D1 remain available through c.env.
    config: ValidatedEnv;
  };
};
