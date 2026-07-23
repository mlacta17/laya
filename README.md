# Laya

A private, invite-only streaming platform for family and friends — movies and series the group uploads and shares, with watch progress, subtitles, recommendations, and offline viewing. Built for about ten people across the US and the Philippines. Non-commercial, personal project.

*Laya* is Filipino for "freedom": no subscriptions, no engagement algorithms, no platform deciding what your family can watch.

## Status

**Phase 0A (Skeleton) in progress.** The workspace, environment split, D1 migration, mock JWT verification, authenticated ping-store, and rejection/round-trip tests exist. The web health page, one-command development script, static tooling, and CI remain. Track progress in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §12, where completed phases get dated.

## How this project is organized

Two living documents are the source of truth. Everything else defers to them:

| Document | What it owns |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | What we're building, how, and **why** — requirements, stack, data model, subsystems, cost model, delivery phases, and the full decision register (ADRs), including reversed decisions and their reasoning |
| [`docs/DESIGN.md`](docs/DESIGN.md) | The design program — who the users are, information architecture, design phases D0–D5, and definitions of done for every surface |
| [`docs/phases/`](docs/phases/) | One-page briefs scoping each phase — `active/` holds the current brief (auto-loaded by the agent instruction files); `completed/` archives finished briefs with their outcomes |

**Reading order for a newcomer:** see [`docs/README.md`](docs/README.md) — short version: this README → ARCHITECTURE.md §0–§2 → §12 (where we are) → the active brief in `docs/phases/active/`. The ADR register (§10) answers every "why didn't you just…" question — please read it before proposing changes, because most alternatives were already evaluated and the reasoning is recorded.

## Repository layout

pnpm workspace with exactly three packages (ARCHITECTURE.md §3.2):

- [`apps/api`](apps/api) — Hono on Cloudflare Workers; the control plane.
- [`apps/web`](apps/web) — Vite + React SPA.
- [`packages/shared`](packages/shared) — Zod contracts imported by both.

## Quickstart

> The Phase 0A acceptance target is: fresh clone → running local stack (Worker + local D1 + web app + mock auth) with **one command, in under 15 minutes**. The one-command script arrives later in 0A; until then:

1. Install pnpm 9 (`npm install -g pnpm@9` with any Node). pnpm then downloads the project's pinned Node automatically (`.npmrc`) — no system Node upgrade needed.
2. `pnpm install`
3. `pnpm --filter @laya/api exec wrangler d1 migrations apply DB --local` — apply migration `0001` to a fresh or existing local D1 database.
4. `pnpm --filter @laya/api dev` — API on <http://localhost:8787>; try <http://localhost:8787/v1/health>.
5. In another terminal, run `pnpm --filter @laya/api mint-token local-dev-user` and copy the printed development token.
6. Prove the authenticated write/read path:
   - `curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"value":"hello-laya"}' http://localhost:8787/v1/ping-store`
   - `curl -H "Authorization: Bearer <token>" http://localhost:8787/v1/ping-store`
7. `pnpm --filter @laya/web dev` — web app (placeholder page for now).
8. `pnpm typecheck` and `pnpm test` run everything, from the root.

## Development workflow

Work proceeds in phases (ARCHITECTURE.md §12), each with a one-page brief and a milestone sentence that defines done. Design runs one phase ahead of engineering (DESIGN.md §6). Two rules keep the project coherent:

1. **Decisions before code.** Any material change — provider, schema, dependency, convention — gets an ADR in ARCHITECTURE.md *before* implementation.
2. **Docs are canonical in git.** The changelog at the bottom of ARCHITECTURE.md is the freshness key; the copy with the latest row wins.

Most implementation happens with AI coding agents (Claude Code, Codex). [`AGENTS.md`](AGENTS.md) carries their standing instructions — one canonical file for every tool; [`CLAUDE.md`](CLAUDE.md) is a thin shim that imports it for Claude Code.

## What you will never find in this repo

- **Secrets** — API keys and credentials live in Cloudflare Worker / CI secret stores. `.dev.vars.example` and `.env.example` document every required variable.
- **Media** — video files never enter git. Canonical originals live on owner-controlled storage (ARCHITECTURE.md, ADR-110).

## License / access

Private repository, private service, closed group. Not accepting external contributions or access requests.
