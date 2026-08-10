# Phase 1 Brief — First light

*Project Laya · Brief v0.3 · Active August 9, 2026 — authority lives in ARCHITECTURE.md v1.3.15 and DESIGN.md v0.3.3. If this brief and ARCHITECTURE.md disagree, ARCHITECTURE.md wins and this brief has a bug.*

---

## Milestone (the only definition of done)

> **“An invited user logs in, a movie plays with subtitles, and progress persists.”**

This phase builds the narrowest production-shaped vertical slice through
identity, authorization, upload, playback, subtitles, and progress. It is not
the catalog or polished-experience phase.

## Context for the implementing agent

Read ARCHITECTURE.md §2, §3.2–§3.4, §4.0–§4.3, §6, §7, §8, §12, and
ADR-108, ADR-110, ADR-118, ADR-121, ADR-122, ADR-124, ADR-125, ADR-127–ADR-132,
ADR-137–ADR-144 before writing code. Read DESIGN.md §3, §5, §7, §9, §13, and
§14.1 for the accessibility, token, invite-flow and sanitized-evidence
constraints. Verify current Clerk, Bunny, Cloudflare, and library documentation
at implementation time; Phase 0B evidence does not freeze provider SDK versions.

## In scope

1. **Production Clerk boundary.** Create separate development and production
   Clerk instances/configuration. Integrate the React client using explicit
   bearer tokens and keep the Worker's provider-neutral RS256/JWKS verifier.
   Before enabling protected production routes, prove that a development token
   is rejected by production (AUTH-12). Clerk authentication alone never grants
   Laya membership.
2. **Invitation and internal identity.** Implement the minimum invitation,
   profile, authentication-identity, library, and membership records required
   by the Phase 0B invitation/revocation contract. Invitations are one-time,
   hashed, email-bound, expiring, and revocable. Authorization resolves Clerk
   `(issuer, subject)` to one internal viewer profile and active membership in
   the shared MVP library (ADR-143). There is no household profile selector.
3. **Minimal first-light schema.** Add only the tables and indexes exercised by
   this slice: identity/invitations/membership, one movie title and stable
   playable, video asset, upload state, subtitle tracks, playback sessions,
   watch progress, provider webhook events, and audit events. Follow §4.0:
   forward-only expand/contract migrations, `STRICT` tables, UUIDv7 `TEXT` IDs,
   millisecond `INTEGER` timestamps, prepared statements, and atomic `batch()`
   transitions. Do not create unused Phase 2–6 tables preemptively.
4. **Admin-only TUS upload.** An authenticated operator requests an idempotent
   upload session; the Worker validates role, metadata, size, quota, and state,
   creates the Bunny object, and returns short-lived video-scoped TUS
   credentials. Video bytes travel browser-to-Bunny, never through the Worker.
   Signed webhooks are persisted before idempotent processing and advance the
   documented upload state machine.
5. **Production Bunny contract.** Provision Frankfurt main storage with no
   replicas (ADR-139), caption-scoped zero-cache rules before captions
   (ADR-140), `KeepOriginalFiles = false`, and `EnableMP4Fallback = true`
   before the first upload (ADR-141). Add a read-only startup/acceptance check
   for these load-bearing settings; do not silently repair provider settings.
6. **Subtitles.** Ship sidecar SRT/VTT ingestion and the accepted desktop
   embedded-text extraction path from ADR-122. Pin and review the Phase 0B
   parser versions, keep parsing streaming/cancellable in Web Workers, require
   uploader confirmation of language/label/default/forced/SDH semantics, and
   publish through stable opaque Bunny caption keys. Unsupported image tracks
   remain explicit and non-blocking; mobile extraction remains deferred.
7. **Playback.** Implement one authorized movie playback path using HLS.js and
   short-lived Bunny access. A playback-session response is scoped to an active
   member and stable `playable_id`, includes published subtitle tracks, and
   never exposes provider administrative credentials. The UI needs only the
   functional D0 controls required to prove play/pause, seek, quality,
   subtitles, fullscreen, loading, empty, and failure states—not Phase 3 polish.
8. **Progress.** Persist progress against `(profile_id, playable_id)` every
   15 seconds and on pause, seek, background, and completion. Writes carry a
   client timestamp, device ID, and monotonic version so stale updates cannot
   overwrite newer progress. Reloading and signing in again must resume the
   same stable playable after a provider-asset replacement fixture.
9. **Local and CI contract.** Keep mock auth/Bunny providers for deterministic
   local and CI tests; real-provider suites use separately supplied disposable
   secrets and authorized media. Because browser flows now exist, add focused
   Playwright coverage for invite/login, upload readiness, playback, subtitle
   selection, and progress restore. Preserve typecheck, lint, format, migration,
   unit, integration, build, and deployment gates.
10. **Operations and evidence.** Emit structured request/provider-transition logs without
    tokens or signed URLs. Surface retryable versus terminal upload/playback
    failures, actual Bunny stored bytes, and actionable webhook/caption errors.
    Capture a concise sanitized Phase 1 case-study record under
    `docs/case-study/` using synthetic or redacted artifacts; this documentation
    work does not authorize the public showcase or any additional product UI.

## Explicitly out of scope — do not build, even partially

- TMDB matching, filename parsing, artwork ingestion, repair queues, genres,
  full catalog browsing, or series/season/episode navigation (Phase 2).
- The polished Home, Browse, Search, Title, and custom-player experience
  described by DESIGN D1 (Phase 3).
- Friend/family uploads, general operator tooling, quotas UI, or audit UI
  beyond the single admin path needed for this milestone (Phase 4).
- Native mobile, offline downloads, SQLite reconciliation, or Expo production
  integration (Phase 5).
- Recommendations, analytics, transcription, OCR, premium encoding, D1 read
  replication, or Bunny storage replication (Phase 6 or trigger-gated ADRs).
- A runnable public portfolio demo, production-data mirror, or showcase-only
  application behavior. ADR-142 makes the interactive demo eligible only after
  Phase 3 stabilizes the real web experience; Phase 1 captures evidence only.
- A fourth workspace package, ORM, direct client D1 access, media through the
  Worker, committed secrets, or committed original media.

## Required evidence and acceptance checks

- [ ] Separate Clerk production configuration exists; production accepts its
      own token and rejects development/mock issuer tokens before protected
      routes are enabled.
- [ ] An uninvited but valid Clerk identity receives the standard forbidden
      response; an invited identity can redeem once and becomes an active
      member; revocation denies the same still-valid Clerk token immediately at
      Laya's authorization boundary.
- [ ] Fresh local and remote D1 migrations pass and contain only the minimum
      Phase 1 records, constraints, indexes, and audit/provider-event support.
- [ ] An admin obtains short-lived TUS credentials and uploads authorized media
      directly to Bunny; the API never receives media bytes; duplicate create
      requests and webhook replays are safe no-ops.
- [ ] The production Bunny library is verified read-only against ADR-139–141
      before its first media upload, including the caption Edge Rule.
- [ ] The uploaded movie reaches endpoint-correct ready state, plays through a
      short-lived HLS session, and exposes no provider administrative secret.
- [ ] Sidecar subtitles publish and render; supported desktop embedded text is
      extracted, confirmed, published, and selectable; unsupported tracks show
      an honest fallback.
- [ ] Progress survives reload and sign-in restore and remains attached to the
      playable when the provider-asset fixture is replaced.
- [ ] Unit, integration, Playwright, migration, build, lint, format, typecheck,
      secret-scan, and environment-isolation checks pass in CI.
- [ ] No disposable credential, token, provider identifier, signed URL, or
      original media enters git or logs.
- [ ] The Phase 1 case-study note records the problem, constraints, alternatives,
      evidence, outcome and lesson using only synthetic or redacted artifacts.

## Human/operator prerequisites

The owner must create or approve the separate Clerk production instance,
configure the production domain and OAuth credentials, provision the production
Bunny library and caption Edge Rule, place provider secrets in Worker/CI secret
stores, and select one authorized first-light movie outside the repository.
Codex must pause immediately before production account changes, secret entry,
provider setting mutations, DNS/OAuth changes, or the first real-media upload.

The trusted real-Philippines AUTH-16 reliability packet remains a pre-launch
gate, not a blocker for beginning this U.S.-based Phase 1 vertical slice.

## Recommended sequence

1. Schema/contracts and deterministic local provider seams.
2. Clerk production isolation plus invitation/membership enforcement.
3. Bunny configuration verification, upload state machine, and webhooks.
4. Sidecar and accepted embedded-subtitle publication.
5. Playback session, HLS player, and stable-playable progress.
6. Browser acceptance, observability, deployed verification, and review.

## Completion housekeeping

When the milestone and every required check pass, date Phase 1 in
ARCHITECTURE.md §12, fold learnings into ADRs, archive this brief with its
status block and milestone commit, then activate a bounded Phase 2 brief in
`AGENTS.md` and `CLAUDE.md`.
