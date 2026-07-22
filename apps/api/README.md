# @laya/api

Hono on Cloudflare Workers — the control plane (auth, metadata, progress; never video bytes, ARCHITECTURE.md §2/§3.3).
`pnpm dev` serves it locally on <http://localhost:8787>; `pnpm deploy` ships the dev Worker, `pnpm deploy:production` the production one (ADR-132).
Routes live under `src/routes/`, one file per route group; every route returns the shared error envelope and echoes `X-Request-Id`.
