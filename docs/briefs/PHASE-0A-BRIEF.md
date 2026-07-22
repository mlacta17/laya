# Phase 0A Brief — Skeleton

*Project Laya · Brief v1 · Disposable working document — authority lives in ARCHITECTURE.md v1.2.1 and DESIGN.md v0.2. If this brief and ARCHITECTURE.md disagree, ARCHITECTURE.md wins and this brief has a bug.*

---

## Milestone (the only definition of done)

> **"The API can authenticate a test token and read/write through D1."**
> Demonstrated end-to-end: a request carrying a mock-issuer JWT hits the deployed Worker, is verified, writes a row to D1, reads it back, and returns it — and the same flow passes locally with one command.

## Context for the implementing agent

Read before writing code, in this order: ARCHITECTURE.md §2 (principles), §3.2 (approved stack — exact technologies, no substitutions), §3.3 (API conventions), §3.4 (local development contract — this phase builds most of it), §4.0 (D1 schema conventions), ADR-125, ADR-128, ADR-129. DESIGN.md is not needed this phase; no user-facing UI is in scope.

## In scope

1. **Repository**: pnpm workspace with exactly three packages — `apps/web`, `apps/api`, `packages/shared` — plus `docs/` containing ARCHITECTURE.md, DESIGN.md, and this brief. No Turborepo (ADR-114). Root README: 15-minute quickstart, junior-readable.
2. **`apps/api`**: Hono on Cloudflare Workers. Routes for this phase only: `GET /v1/health` (no auth; returns version + requestId) and `GET/PUT /v1/ping-store` (auth required; writes/reads a `ping` row proving the D1 path). Error envelope, requestId, and Zod input validation per §3.3, established now as the pattern every future route copies.
3. **D1**: local + remote database via Wrangler; numbered forward-only migrations (Wrangler D1 tooling). Migration 0001 creates only what this phase proves: a `ping` table plus the conventions in ADR-129 demonstrated (STRICT, TEXT UUIDv7 id, INTEGER ms timestamps) — **not** the full §4 schema.
4. **Auth verification, mock only**: Worker-side JWT verification (issuer, audience, signature via JWKS, expiry) against a **local mock issuer** with deterministic fixtures per §3.4. Structure the verifier so the real provider (ADR-127, decided in 0B) is a config swap, not a rewrite.
5. **`apps/web`**: Vite + React + TypeScript scaffold that renders one page calling `/v1/health` and displaying the result. No design system, no routes, no styling beyond defaults — Phase 3 owns appearance.
6. **`packages/shared`**: Zod schemas for the two routes' inputs/outputs and the error envelope; imported by both api and web.
7. **CI (GitHub Actions)**: typecheck, test, migration check (migrations apply cleanly to a fresh local D1), build. Deploy job to Cloudflare on main, gated on the above.
8. **One-command local dev** (§3.4): a single script starts Wrangler + local D1 + Vite + mock issuer. Vitest with at least: JWT verification accept/reject cases, ping-store round-trip against local D1, error-envelope shape.

## Explicitly out of scope — do not build, even partially

The §4 data model beyond `ping` (no profiles/titles/playables tables). Any Bunny, TMDB, or email integration (mocks are 0B/1 concerns; not even stubs here). Real auth providers — no Auth0/Clerk accounts, SDKs, or tenants (that's the 0B spike). Invitations, uploads, playback, subtitles, metadata, recommendations, operator console. Expo/mobile anything. Drizzle or any ORM (§3.2: native D1 binding, prepared statements). Design tokens, Tailwind config beyond scaffold defaults, any DESIGN.md surface. Queues, replication, Containers. Additional packages beyond the three named. If a task seems to require any of these, stop and flag it rather than building it.

## Acceptance checks

- [ ] Fresh clone → README quickstart → local stack running with one command in under 15 minutes.
- [ ] `pnpm test` green; CI green on a PR; deploy succeeds on main.
- [ ] Deployed `GET /v1/health` returns 200 with requestId.
- [ ] `PUT /v1/ping-store` with a valid mock JWT writes to remote D1; `GET` returns it; both return 401 with the standard error envelope when the token is missing, expired, or has a wrong audience.
- [ ] Migration 0001 applies cleanly to a fresh database, locally and remotely, and demonstrates ADR-129 conventions.
- [ ] Zero TODOs referencing out-of-scope features; no unused dependencies.

## Non-goals of this brief

This brief does not restate the architecture. Where detail is missing here, the referenced sections are the answer; where they're silent, prefer the boring choice and record anything decision-shaped as a proposed ADR rather than silently deciding.

*On completion: date the 0A row in ARCHITECTURE.md §12, fold any learnings into ADRs, then discard this brief. Next: the 0B spike brief.*
