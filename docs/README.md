# Laya documentation — reading guide

You do not need to read everything to contribute. Read what your task needs, in this order:

1. **Root `README.md`** — what Laya is and the project quickstart.
2. **`ARCHITECTURE.md` §0–§3** — how to read the docs, requirements, principles, and the approved stack. (§0 explains the rules; §2 explains the taste.)
3. **The active phase brief** in `phases/active/` — your bounded scope. Its "Context" section names the exact architecture sections and ADRs your work touches. That list, not the whole document, is your required reading.
4. **`DESIGN.md`** — only when the phase includes user-facing UI. The active brief will say so.
5. **The ADR register (`ARCHITECTURE.md` §10)** — before proposing any change of approach. Most alternatives were already evaluated; the reasoning is recorded there, including for reversed decisions.

The master documents remain authoritative over everything, including briefs. But the brief is the bounded reading path: nobody should have to read a 650-line architecture document to change a health endpoint — and nobody should change the database without reading §4.

`glossary.md` defines the handful of project-specific terms (playable, brief, spike, ADR) that appear everywhere else.
