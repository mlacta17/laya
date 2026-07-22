# Phase 0A Brief — Skeleton

*Project Laya · Brief v1.1 · Working document, archived on completion — authority lives in ARCHITECTURE.md v1.3 and DESIGN.md v0.3. If this brief and ARCHITECTURE.md disagree, ARCHITECTURE.md wins and this brief has a bug.*

---

## Milestone (the only definition of done)

> **"The API can authenticate a test token and read/write through D1."**
> Demonstrated end-to-end: a request carrying a mock-issuer JWT hits the deployed Worker, is verified, writes a row to D1, reads it back, and returns it — and the same flow passes locally with one command.

## Context for the implementing agent

Read before writing code, in this order: ARCHITECTURE.md §2 (principles), §3.2 (approved stack — exact technologies, no substitutions), §3.3 (API conventions), §3.4 (local development contract — this phase builds most of it), §4.0 (D1 schema conventions), ADR-125, ADR-128, ADR-129, **ADR-132 (environment separation — load-bearing for this phase)**. DESIGN.md is not needed this phase; no user-facing UI is in scope.

## In scope

1. **Repository**: pnpm workspace with exactly three packages — `apps/web`, `apps/api`, `packages/shared` — plus `docs/` (ARCHITECTURE.md, DESIGN.md, README.md, glossary.md, `phases/active/` with this brief, `phases/completed/`). No Turborepo (ADR-114). Root README: 15-minute quickstart, junior-readable.
2. **Environments (ADR-132)**: two fully separate configurations from the first deploy — dev (`laya-api-dev` Worker, `laya-dev` D1, dev hostname, mock issuer config) and production (production Worker + D1, **no mock-issuer audience, JWKS URL, or key anywhere in its configuration**). Environment files are explicit: `wrangler.jsonc` with separate dev/production bindings, `.dev.vars.example`, `.env.example` for Vite, typed environment validation (Zod) at startup so a missing/wrong variable fails loudly, and no committed secrets.
3. **`apps/api`**: Hono on Cloudflare Workers. Routes for this phase only: `GET /v1/health` (no auth; returns version + requestId) and `GET/PUT /v1/ping-store` — **precise semantics**: `PUT` body `{ "value": "..." }` performs an idempotent upsert keyed to the authenticated JWT subject; `GET` returns only the current subject's row. This proves authentication context reaches the database without introducing arbitrary reads. **ping-store is disposable: it is removed when Phase 0A is signed off** (its tests and the auth/D1 patterns it established remain). Error envelope, requestId, and Zod input validation per §3.3, established now as the pattern every future route copies.
4. **D1**: local + remote database via Wrangler; numbered forward-only migrations (Wrangler D1 tooling). Migration 0001 creates only what this phase proves: a `ping` table plus the conventions in ADR-129 demonstrated (STRICT, TEXT UUIDv7 id, INTEGER ms timestamps) — **not** the full §4 schema.
5. **Auth verification, mock only**: Worker-side JWT verification (issuer, audience, signature via JWKS, expiry) against a **local mock issuer** with deterministic fixtures per §3.4 — dev environment only, per ADR-132. Structure the verifier so the real provider (ADR-127, decided in 0B) is a config swap, not a rewrite.
6. **`apps/web`**: Vite + React + TypeScript scaffold that renders one page calling `/v1/health` and displaying the result. No design system, no routes, no styling beyond defaults — Phase 3 owns appearance.
7. **`packages/shared`**: Zod schemas for the two routes' inputs/outputs and the error envelope; imported by both api and web.
8. **CI (GitHub Actions)**: typecheck, **lint, format check, lockfile validation**, test, migration check (migrations apply cleanly to a fresh local D1), build. Deploy job (dev environment) on main, gated on the above. TypeScript configured strictly and centrally: `strict: true` plus `noUncheckedIndexedAccess` in the shared tsconfig.
9. **One-command local dev** (§3.4): a single script starts Wrangler + local D1 + Vite + mock issuer.
10. **Tests (Vitest)**: ping-store round-trip against local D1; error-envelope shape; and a JWT rejection matrix that becomes the inherited pattern for every future route — accept the valid case, reject: missing token, expired, wrong audience, **invalid signature, unknown key ID (kid), wrong issuer, not-before in the future, missing subject, malformed bearer header, malformed JWT, and JWKS fetch/cache failure**.

## Explicitly out of scope — do not build, even partially

The §4 data model beyond `ping` (no profiles/titles/playables tables). Any Bunny, TMDB, or email integration (mocks are 0B/1 concerns; not even stubs here). Real auth providers — no Auth0/Clerk accounts, SDKs, or tenants (that's the 0B spike). Invitations, uploads, playback, subtitles, metadata, recommendations, operator console. Expo/mobile anything. Drizzle or any ORM (§3.2: native D1 binding, prepared statements). Design tokens, Tailwind config beyond scaffold defaults, any DESIGN.md surface. Queues, replication, Containers. Additional packages beyond the three named. If a task seems to require any of these, stop and flag it rather than building it.

## Acceptance checks

- [ ] Fresh clone → README quickstart → local stack running with one command in under 15 minutes.
- [ ] `pnpm test` green; CI green on a PR; deploy succeeds on main.
- [ ] Deployed (dev) `GET /v1/health` returns 200 with requestId.
- [ ] **The production Worker configuration cannot validate a mock-issuer token** — verified by inspection of production config (no mock audience/JWKS/key present) and by a failing request test where feasible.
- [ ] `PUT /v1/ping-store` with a valid mock JWT upserts the caller-subject row in dev D1; `GET` returns only that row; the full rejection matrix in scope item 10 returns 401/400 with the standard error envelope.
- [ ] Migration 0001 applies cleanly to a fresh database, locally and remotely, and demonstrates ADR-129 conventions.
- [ ] Zero TODOs referencing out-of-scope features; no unused dependencies.

## Non-goals of this brief

This brief does not restate the architecture. Where detail is missing here, the referenced sections are the answer; where they're silent, prefer the boring choice and record anything decision-shaped as a proposed ADR rather than silently deciding.

*On completion: date the 0A row in ARCHITECTURE.md §12, fold learnings into ADRs, remove `ping-store`, then **archive this brief** to `docs/phases/completed/` with a status block (Status: Complete · Completed: YYYY-MM-DD · Commit: hash · Outcome: passed / passed with amendments · Learnings: ADR links). Update the CLAUDE.md import to the 0B spike brief.*