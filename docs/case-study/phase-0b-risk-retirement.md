# Phase 0B — retiring the risks before building the product

Status: Validated internally; publication review pending
Date: 2026-08-08
Canonical sources: `docs/phases/completed/PHASE-0B-BRIEF.md`,
`docs/spikes/phase-0b/README.md`, and ADR-122, ADR-127, ADR-138–ADR-141 in
`docs/ARCHITECTURE.md`

## Problem

Laya's first meaningful user journey depends on three external boundaries that
could invalidate the planned architecture: managed authentication must preserve
Laya's invitation and revocation rules, desktop browsers must recover usable
text subtitles from representative media without blocking upload, and Bunny
Stream must provide predictable caption behavior, delivery topology and storage
costs. Building the application before testing those assumptions would turn
provider surprises into expensive product rewrites.

## Constraints

- A solo developer must be able to operate the system after months of neglect.
- The service is private and invite-only for roughly ten people in the United
  States and the Philippines.
- Video bytes never pass through the Worker API.
- Subtitles are non-negotiable, including Filipino and Unicode text.
- Production credentials, provider identifiers and original media cannot enter
  Git or case-study artifacts.
- The result must stay within Laya's bounded cost model and preserve an exit
  path through owner-controlled originals.

## Alternatives considered

- **Authentication:** Auth0, Clerk and self-hosted Better Auth were evaluated.
  Self-hosting transferred too much security and operational ownership to one
  developer. Auth0 remained technically viable but added separate-environment
  cost and a production-email dependency at Laya's scale.
- **Subtitles:** provider-only extraction, sidecar-only upload and desktop
  browser extraction were considered. Provider-only behavior did not satisfy
  the required control and evidence; sidecar-only remained reliable but imposed
  avoidable work on supported desktop uploads.
- **Bunny topology and storage:** retaining originals, disabling MP4 fallback,
  or adding a second storage region could each reduce a particular risk, but
  every choice changes cost, offline capability or reversibility.

## Decision

- Use Clerk for managed authentication while keeping Laya's API responsible for
  invitations, memberships and authorization. Provider identity alone never
  grants access.
- Accept streaming desktop-browser extraction for supported embedded text
  tracks, with sidecar SRT/VTT as the permanent fallback. Unsupported image
  subtitles remain explicit rather than silently disappearing.
- Launch Bunny Stream with Frankfurt main storage and no replica, disable
  duplicate original retention, keep MP4 fallback for the future offline path,
  and apply a caption-scoped zero-cache rule before publication.
- Treat Bunny caption keys as opaque provider identifiers while Laya owns
  language, label, default, forced and SDH semantics.

## Evidence

- Symmetric authentication flows were exercised in React and on a physical
  iPhone, including passwordless and social sign-in, refresh/reopen, logout,
  invitation enforcement and revocation. Development-token rejection in the
  eventual production instance remains a Phase 1 gate; trusted Philippines
  reliability evidence remains a pre-launch gate.
- The subtitle matrix covered Windows and macOS desktop browsers, multiple text
  formats, Unicode and Filipino content, multiple and mistagged tracks,
  unsupported image tracks, invalid input, cancellation, parser recovery,
  concurrent upload and a representative 8.46 GB source. Accepted outputs were
  deterministic across the tested browsers.
- Caption add, replace and delete behavior was verified through provider
  metadata, direct CDN responses and fresh player sessions with a path-scoped
  cache rule.
- A representative movie and episode measured 4.802 stored delivery GB per
  catalog hour after excluding duplicate retained originals. The architecture
  rounds this to a 5.0 GB/hour planning baseline while actual provider-reported
  bytes drive alerts.

## Outcome

Phase 0B passed with measured limitations. Five decision groups moved from
assumptions to accepted ADRs: authentication, JWKS refresh protection,
subtitle extraction and caption identity, Bunny topology/cache behavior, and
storage retention/cost. Phase 1 can now build a production-shaped vertical
slice without reopening those choices or hiding their remaining gates.

## Lesson

The highest-leverage early work was not scaffolding more application code; it
was making failure-prone assumptions falsifiable with representative evidence.
The spikes also show why fallback paths are architectural features: browser
extraction is acceptable because sidecars remain available, and managed video
delivery is acceptable because canonical originals remain under owner control.

## Publication review

- [x] Synthetic or redacted data only
- [x] No secrets, identifiers, signed URLs, private paths, or personal data
- [x] No third-party media or imagery included
- [x] Claims link to validated repository sources or state their remaining gate
- [ ] Final public copy and any future visuals receive a separate privacy and
      licensing review
