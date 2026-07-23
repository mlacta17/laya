import type { RequestIdVariables } from "hono/request-id";
import type { ValidatedEnv } from "./env";

// Raw bindings as Wrangler provides them — validated by src/env.ts before use.
export type Bindings = {
  ENVIRONMENT: string;
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
