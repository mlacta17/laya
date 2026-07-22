# Laya glossary

*Place at `docs/glossary.md`. Add terms only when they appear in two or more documents.*

**ADR** — Architecture Decision Record. A row in ARCHITECTURE.md §10 recording a decision, its reasoning, and its status (accepted / provisional / superseded). Decisions happen here *before* code. Superseded ADRs are never deleted; the reasoning trail is the point.

**Brief** — A one-page document scoping a single phase of work (`docs/phases/`). Defines the milestone, scope, out-of-scope list, and acceptance checks. Defers to ARCHITECTURE.md on all detail; archived (never deleted) on completion.

**Playable** — The stable identity of a movie or episode that users watch (ADR-121). Watch progress, downloads, and sessions attach to playables. Provider video assets (Bunny encodes) are replaceable technical representations behind a playable and are never user-visible.

**Spike** — A time-boxed experiment answering a go/no-go question before an approach is accepted (e.g., Phase 0B: auth provider selection, browser subtitle extraction). Output is a written result and an ADR status change, not production code.

**Operator** — The person running Laya (currently the owner): metadata repair, invitations, quotas, budget monitoring. A first-class user role with its own console (DESIGN.md D3).
