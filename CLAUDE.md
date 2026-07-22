# Laya — Claude Code instructions

Laya is a private, invite-only streaming platform for ~10 friends/family (US + Philippines). Non-commercial. Solo developer. Stack: Hono on Cloudflare Workers, D1 (native binding, no ORM), React+Vite, Bunny Stream, React Native/Expo later.

## Authority and precedence

1. `docs/ARCHITECTURE.md` (v1.3) is the source of truth for all technical decisions. Read the sections relevant to your task before writing code — especially §3.3 (API conventions), §4.0 (D1 schema conventions), and the ADR register (§10).
2. `docs/DESIGN.md` governs all user-facing surfaces.
3. The active phase brief defines current scope:
   @docs/phases/active/PHASE-0A-BRIEF.md
4. If the brief and ARCHITECTURE.md disagree, ARCHITECTURE.md wins — and say so, because the brief has a bug.

## Hard rules

- **Scope**: the brief's out-of-scope list is binding. If a task seems to require something out of scope, STOP and flag it. Never build ahead "to save time."
- **Decisions**: anything decision-shaped (new dependency, schema change, provider behavior assumption, convention deviation) is proposed as an ADR in ARCHITECTURE.md §10 *before* implementation — never silently decided. Prefer the boring choice.
- **Verification**: never assume provider behavior (Bunny, D1, auth, TMDB). ARCHITECTURE.md §15 lists official sources; uncertain behavior becomes a spike or a flagged question, not code.
- **Database**: D1 via native Worker binding only. Prepared statements, `batch()` for multi-statement transitions, STRICT tables, UUIDv7 TEXT ids, INTEGER ms timestamps (§4.0). No ORM.
- **Never commit**: secrets (Worker/CI secret stores only; `.dev.vars.example` / `.env.example` document variables) or media files (originals live on the owner's drive per ADR-110).
- **Environments (ADR-132)**: dev and production are fully separate (Workers, D1, hostnames, secrets). The mock issuer exists only in dev; never add its audience, JWKS URL, or key to production configuration.
- **Style**: junior-readable over clever. Every non-obvious directory gets a 3-line README. Zod validates every external input.

## Housekeeping

- When a phase completes: date its row in ARCHITECTURE.md §12, fold learnings into ADRs, move the brief to `docs/phases/completed/` with its status block, and update the brief import above to the next brief.
- Any edit to ARCHITECTURE.md gets a changelog row (§14) — the changelog is the document's freshness key.
