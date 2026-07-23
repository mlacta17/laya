// Mints a mock-issuer JWT for manual testing against local or deployed dev.
//
// Usage:  pnpm --filter @laya/api mint-token [subject] [ttl-seconds]
// Then:   curl -H "Authorization: Bearer <token>" \
//              https://laya-api-dev.<account>.workers.dev/v1/ping-store
//
// Runs under the workspace's pinned Node (>= 23 strips TS types natively).
// Dev-only tooling — production trusts none of these tokens (ADR-134).
import { sign } from "hono/jwt";
import { MOCK_AUDIENCE, MOCK_ISSUER, MOCK_PRIVATE_JWK } from "./keys.ts";

// This package typechecks against Workers types, not Node's — declare the
// one Node global this script touches instead of adding @types/node.
declare const process: { argv: string[] };

const subject = process.argv[2] ?? "local-dev-user";
const ttlSeconds = Number(process.argv[3] ?? 3600);
const nowSeconds = Math.floor(Date.now() / 1000);

const token = await sign(
  {
    iss: MOCK_ISSUER,
    aud: MOCK_AUDIENCE,
    sub: subject,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  },
  // The JWK carries alg + kid, so sign() emits the right header itself.
  MOCK_PRIVATE_JWK,
);

console.log(token);
