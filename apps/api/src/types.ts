import type { RequestIdVariables } from "hono/request-id";
import type { AuthContext } from "./auth/verify-token";
import type { ValidatedEnv } from "./env";

// The Hono type parameter every app/route/middleware in this Worker shares.
//
// Bindings is the global `Env` interface that `wrangler types` generates from
// wrangler.jsonc into worker-configuration.d.ts (ADR-136) — regenerate with
// `pnpm types`; typecheck verifies the committed file without rewriting it.
// Binding types are never hand-written, so configuration and code cannot
// drift. String vars are validated by src/env.ts before use; native platform
// bindings (D1) are used directly through c.env.
export type AppEnv = {
  Bindings: Env;
  Variables: RequestIdVariables & {
    // Routes read configuration strings from here after Zod validation.
    config: ValidatedEnv;
    // Set by requireAuth; only routes behind that middleware may read it.
    auth: AuthContext;
  };
};
