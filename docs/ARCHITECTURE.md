# Project Laya — Architecture & Decision Record (Master)

*Private streaming platform · v1.3 D1 baseline · July 22, 2026*
*This file REPLACES all earlier ARCHITECTURE.md versions (v0.1, v0.2, v1.0, v1.0.1, v1.1), ARCHITECTURE-v1.md, and REVIEW-of-uploaded-plan.md. Delete saved copies of those. If a document treats Jellyfin, Caddy, Docker Compose, a dedicated server, Supabase Postgres, Hyperdrive, direct client database access, progress keyed to a provider video asset, or browser subtitle extraction as already proven as a current decision, it is stale. Companion: DESIGN.md v0.2 (design program, phases D0–D5).*

---

## 0. How to use this document

This is the single source of truth for **what we are building, how, and why**. Section 1 is the requirements contract. Sections 2–9 define the architecture and operating model. Section 10 is the complete decision register, including reversed and superseded decisions. Section 11 makes the cost model reproducible. Section 12 defines delivery gates. Section 13 records unresolved decisions, and §15 links the official sources behind load-bearing provider claims.

Rules for maintaining it: any material change to the video provider, application database, database exposure model, API style, authentication provider, subtitle strategy, metadata source, regional replication, or offline authorization model gets a new ADR here *before* implementation. When a phase completes, its row in §12 gets a date. Junior developers and future-us read this top to bottom before touching production code.

**Verification discipline.** No architectural decision may rest on an unverified assumption about what a provider does, how a client behaves, or what a service costs. Provider behavior that remains uncertain is explicitly marked as a spike, support question, or implementation gate—not written as fact. Prices and capabilities were rechecked in July 2026; re-verify before launch and before enabling paid add-ons.

**Approval status.** Cloudflare D1 is approved as the application database. The authentication system remains a separate managed-service decision and cannot be considered final until the Phase 0B browser-and-Expo spike selects a provider. The browser subtitle-extraction path is **provisionally accepted** and cannot graduate into the upload implementation until its Phase 0B spike passes. Duplicate same-language caption behavior at Bunny is also an implementation gate.

---

## 1. Requirements

### 1.1 Product context

Private, invitation-only, non-commercial video streaming for a closed group of roughly 5–10 people: friends in the United States and family in the Philippines. Members stream a shared library, keep individual watch progress across devices, receive simple recommendations, upload media through a safe pipeline, and download titles for offline viewing on mobile. The entire user experience is custom-designed (see DESIGN.md); nothing user-facing is off the shelf.

### 1.2 Functional requirements

**FR-1 · Playback.** Browse and stream movies and series in the browser (iOS/Android later), with seeking, subtitle rendering, and automatic quality adaptation.

**FR-2 · Concurrency.** Up to ~6 simultaneous streams at peak with no server-attributable buffering, including viewers in the Philippines.

**FR-3 · Watch state.** Per-user resume positions ("continue watching"), history, and profiles, consistent across web and mobile. Progress belongs to a stable movie-or-episode playable, never to a replaceable provider asset.

**FR-4 · Offline.** Mobile users download titles and subtitle tracks into app-private storage through short-lived signed URLs. SQLite tracks local path, selected quality, byte progress, status, authorization expiry, last verification, device, and download version. Web is streaming-only. Revocation is enforced when the device reconnects or its offline authorization expires; a permanently offline device cannot receive an immediate revocation command.

**FR-5 · Uploads.** Any invited member with the uploader role can upload through the app. Uploads are resumable (TUS), quota'd, rate-limited, validated, and pass through an explicit state machine before publication. Users never place files directly into the published library.

**FR-6 · Recommendations.** Rule-based personalized rows computed from watch history ("Because you watched X," "From [friend]," "Recently added"). No ML—ten users never produce training-scale data, and honest curation beats fake algorithms.

**FR-7 · Custom experience.** All user-facing surfaces are designed in-house per DESIGN.md.

**FR-8 · Subtitles (non-negotiable).** Every title supports multi-language subtitle tracks. Text subtitles embedded in supported files should survive the upload path automatically after the Phase 0B extraction spike proves the path. Users can attach subtitle files at upload time or after publication. Subtitles work in web playback, mobile playback, and offline. Full design in §6.

### 1.3 Non-functional requirements

**NFR-1 · Budget:** stay under $100/month within the approved operating envelope defined in §11. "Under $100" is not an unlimited-usage promise; the operator console must show actual encoded storage, delivered data, projected spend, and threshold alerts before the envelope is exceeded.

**NFR-2 · Junior-friendliness:** boring, widely documented technology; one recommended way to perform each common task; the control plane runnable locally; a developer with roughly two years of experience can understand and modify any module without learning the entire system first.

**NFR-3 · Maintainability:** tolerate months of neglect—managed transcoding/CDN and managed authentication, native D1 operations, automated deployments and recovery exports, documented restore procedures, and a monthly operating ritual under 30 minutes.

**NFR-4 · Bounded scale:** designed for 10 users; must not block ~100; explicitly refuses complexity that only pays off beyond that.

**NFR-5 · Security:** invite-only, no public registration; HTTPS everywhere; every uploaded file treated as untrusted until validated; secrets never in Git; threat model is opportunistic scanners, stolen links, accidental bad uploads, and ordinary account compromise—not nation-states.

**NFR-6 · Legal posture:** private, closed-group, non-commercial. No public links or federation. This minimizes exposure but does not eliminate copyright risk inherent to shared media; provider-custody consequences are addressed in ADR-110. Not legal advice.

### 1.4 Non-goals (first release)

No 4K (1080p cap), no live streaming, no watch parties or chat, no smart-TV apps (TV = casting/HDMI, stated to users—ADR-116), no commercial DRM (FairPlay/Widevine/MediaCage deferred with its current base fee recorded in the cost exclusions), no Kubernetes, no microservices, no ML recommendations, no public registration, and no direct client access to application tables.

---

## 2. Guiding principles

**Buy the undifferentiated plumbing; build the experience.** Transcoding, CDN delivery, adaptive streaming and authentication infrastructure are solved problems. Our differentiation is the client experience, metadata quality, subtitle reliability and recommendation honesty.

**Boring technology, one provisional novelty budget.** Every component is mature and heavily documented except client-side embedded-subtitle extraction. That path is intentionally isolated, time-boxed and tested before the rest of the upload experience depends on it.

**The API never touches video bytes.** The control plane—authorization, metadata, progress, recommendations and provider commands—runs through our code. The data plane—TUS upload chunks, HLS segments, MP4 downloads and published VTT files—flows only between clients and the video provider/CDN.

**Stable domain identity beats provider identity.** Users watch movies and episodes, not Bunny video IDs. Provider assets are replaceable representations beneath stable `playables`.

**One-way doors get ADRs; two-way doors get defaults.** Expensive-to-reverse choices are recorded with alternatives and reversal costs. Cheap-to-reverse choices are made directly and changed when measurements justify it.

**Verify, do not assume.** External capabilities and prices get checked at decision time. Unverified behavior remains an open decision or spike acceptance criterion.

**Scale calibration is a feature.** Solo builder, evenings, ten users. The failure mode being designed against is not "wrong database"; it is "the foundation took four months and nobody ever watched a movie."

---

## 3. System architecture

### 3.1 Topology

```text
 Browser (React SPA) ──┐
 iOS / Android (Expo) ─┤── HTTPS ──▶ API — Hono on Cloudflare Workers
                       │                 │ control plane only
                       │                 ├──▶ Cloudflare D1 native binding
                       │                 ├──▶ Managed auth provider JWKS/OIDC API
                       │                 ├──▶ Bunny Stream control API
                       │                 └──▶ TMDB metadata API
                       │
                       └── video bytes ──▶ Bunny CDN edge
                            HLS segments · signed MP4s · published VTTs
                            never through our API

 Upload: client ── TUS resumable ──▶ Bunny Stream ── signed webhook ──▶ API
 Subtitles (provisional): Web Worker parse ──▶ API ──▶ Bunny caption API / VTT delivery
```

**Database access boundary.** Web and mobile clients never receive a D1 binding and cannot query application tables. They authenticate through the selected managed identity provider, send its session token to the Worker, and the Worker verifies the issuer, audience, signature and expiry before applying application permissions and querying D1 through its native binding.

**Regional baseline.** Create the production D1 database with the Eastern North America (`enam`) location hint because most writes originate from U.S. users. The hint expresses preference rather than a placement guarantee. Global read replication, currently a public-beta D1 capability, begins disabled; if Philippine metadata latency becomes measurable, enable it only with the D1 Sessions API and an explicit bookmark/consistency design.

### 3.2 Approved stack

| Layer | Choice | Note |
|---|---|---|
| Web app | React + Vite + TypeScript, React Router, TanStack Query | Authenticated SPA; no SSR/SEO requirement |
| UI system | Tailwind + design tokens (Tala token architecture reused), shadcn/ui primitives | Dark-first per DESIGN.md |
| Player | HLS.js + custom chrome | Captions and visible quality control |
| API | Hono on Cloudflare Workers | Modular monolith; control plane only |
| Application database | Cloudflare D1 through a native Worker binding | SQLite-compatible SQL, `STRICT` tables, prepared statements and atomic `batch()` operations |
| Authentication | Managed OIDC/JWT provider; exact provider selected in Phase 0B | Must support invite-only browser and Expo flows, passwordless email, Google, Apple, revocation and Worker-side token verification |
| Video | Bunny Stream Standard delivery | TUS, transcoding, HLS, CDN, caption API; multi-audio only after enabled and validated against codec/language limits |
| Mobile (Phase 5) | React Native + Expo, expo-video, expo-file-system, SQLite | Native project escape hatches retained |
| FFmpeg/OCR escape hatch | Cloudflare Containers, scale-to-zero | Trigger-gated and requires temporary access to the original file; ADR-113 |
| Contracts | Zod schemas in `packages/shared` | OpenAPI codegen deferred until a second developer or external consumer |
| Testing | Vitest now; Playwright when browser flows exist; Maestro when mobile exists | Tests follow shipped surfaces |
| Observability | Structured logs + Sentry free tier | Request IDs and actionable provider-state errors |
| Repo | pnpm workspace: `apps/web` · `apps/api` · `packages/shared` | Add packages only after a real boundary appears |
| CI/CD | GitHub Actions | typecheck, test, migration check, build, deploy |

Deliberately deferred, with return triggers in ADR-114: Turborepo and OpenAPI codegen (second developer/external consumer), PostHog (a real analytics question), a paid authentication tier (only if selected-provider free-tier limits or required session controls demand it), Expo Starter (build queue pain), Maestro (mobile exists), Playwright (browser flows exist), Cloudflare Queues (measured retry/backlog need), D1 global read replication (measured Philippine metadata latency), and Singapore video replication (measured Philippine video-origin problem).

### 3.3 API module boundaries

`apps/api` is a modular monolith—folders with clear boundaries, not distributed services: **identity** (profiles, invitations, devices) · **libraries** (membership and roles) · **catalog** (titles, seasons, episodes, playables, genres, artwork) · **uploads** (sessions, state machine, webhooks) · **subtitles** (§6) · **metadata** (§5) · **playback** (sessions, signed access) · **progress** (resume, history, conflict handling) · **recommendations** · **downloads** (mobile authorization, expiry and revocation) · **administration** (operator console, quotas, audit).

API conventions:

- REST under `/v1`; JSON request and response bodies.
- Zod validates every external input and provider webhook payload.
- Error envelope: `{ "error": { "code", "message", "requestId" } }`.
- UTC ISO-8601 timestamps at API boundaries; D1 stores Unix milliseconds as `INTEGER`.
- Cursor pagination for catalogs, activity and audit lists; no offset pagination for unbounded tables.
- `Idempotency-Key` on upload-session creation and other create operations vulnerable to client retry.
- Optimistic concurrency/version fields on watch progress, downloads and mutable administrative records.
- Explicit maximum request-body limits; media bytes are rejected by the API.
- Errors are classified as retryable or terminal in the shared contract.
- Atomic D1 `batch()` operations wrap state transitions plus their audit/provider-event records; a failed statement rolls back the batch.
- Mobile-compatible versioned paths from day one.

### 3.4 Local development contract

The control plane must be runnable without production credentials:

```text
Wrangler + local D1   local Worker runtime and SQLite-compatible database
Vite                  local browser application
Mock auth issuer      deterministic JWT/JWKS fixtures for authorization tests
Auth dev tenant       optional end-to-end browser/Expo tests for shortlisted providers
Mock Bunny provider   upload/playback state without real media billing
Mock TMDB provider    deterministic metadata fixtures
Fixture library       small authorized videos + SRT/ASS/VTT/MKV samples
Seed command          invited users, library, titles and progress
One command           start local control-plane development
```

Real Bunny/TMDB/auth-provider integration tests run separately with explicitly supplied secrets, disposable test users and disposable media assets. Local migrations use Wrangler's D1 tooling and the same numbered SQL files applied remotely.

---

## 4. Data model

Core tables: `profiles, auth_identities, invitations, devices, libraries, library_memberships, titles, seasons, episodes, playables, genres, title_genres, artwork, video_assets, uploads, subtitle_tracks, metadata_matches, playback_sessions, watch_progress, ratings, favorites, download_authorizations, audit_events, provider_webhook_events`. Migrations are numbered, forward-only production SQL files managed through Wrangler and reviewed like application code.

### 4.0 D1 schema conventions

D1 uses SQLite-compatible SQL rather than PostgreSQL. The project uses one convention for each primitive:

- IDs are application-generated UUIDv7 strings stored as `TEXT`.
- Timestamps are UTC Unix milliseconds stored as `INTEGER`.
- Booleans are `INTEGER NOT NULL CHECK (value IN (0,1))`.
- Enums are `TEXT` with `CHECK` constraints.
- Structured JSON is `TEXT` guarded by `json_valid()` when the field is queryable application data.
- Tables are declared `STRICT` unless a verified D1 limitation prevents it.
- Foreign keys are declared and enforced; destructive cascades require explicit review.
- Every query uses prepared statements and bound parameters.
- Multi-statement state changes use D1 `batch()` so failures roll back the full sequence.
- Large binaries, artwork and caption bodies do not live in D1; D1 stores metadata and provider/object keys only.

D1's paid-plan constraints are design inputs: 10 GB maximum per database and a single-threaded primary. They are comfortably above this private workload, but raw playback telemetry must be aggregated or expired rather than retained without bound.

### 4.1 Stable playable identity

A `playable` is the stable movie-or-episode identity that users watch. A provider asset is a replaceable technical representation.

```sql
CREATE TABLE playables (
    id          TEXT PRIMARY KEY,
    kind        TEXT NOT NULL CHECK (kind IN ('movie','episode')),
    title_id    TEXT REFERENCES titles(id),
    episode_id  TEXT REFERENCES episodes(id),
    created_at  INTEGER NOT NULL,
    CHECK (
      (kind = 'movie' AND title_id IS NOT NULL AND episode_id IS NULL) OR
      (kind = 'episode' AND episode_id IS NOT NULL AND title_id IS NULL)
    )
) STRICT;

-- video_assets.playable_id references playables(id)
-- watch_progress is unique on (profile_id, playable_id)
```

Replacing, re-encoding or migrating a Bunny asset does not reset watch history, favorites or download eligibility.

### 4.2 Load-bearing state rules

**Authentication identity mapping:** `auth_identities` maps the selected provider issuer + subject to one internal profile. Authorization uses internal profile/library IDs, never email addresses or provider-specific user IDs directly. Provider-account deletion or subject change is handled as an explicit relink/revocation operation.

**Invitation lifecycle:** `created → sent → accepted | expired | revoked`. Invitation tokens are stored as one-way hashes, bound to the intended email, expire, allow one redemption, record the inviter and accepted user, and can be revoked. Public self-registration is rejected even if the external identity provider permits account creation.

**Upload state machine:** `requested → uploading → uploaded → processing → ready | failed → deleted`. Every transition records the upload ID, actor/system source, timestamp and failure code where applicable.

**Progress conflict handling:** progress writes carry client timestamp, device ID and a monotonic version. A stale offline device cannot overwrite newer progress. `watch_progress` is unique on `(profile_id, playable_id)`.

**Webhooks:** persisted to `provider_webhook_events` before processing; signatures verified; processing idempotent; duplicate/replayed events are no-ops.

**Download authorization:** records include `playable_id, profile_id, device_id, quality, offline_authorized_until, last_verified_at, download_version, revoked_at`. A client can play while the local authorization is valid. Revocation is observed at reconnect or expiry.

### 4.3 Subtitle tracks

Bunny's caption endpoint uses `srclang` in the provider route and describes it as the unique caption shortcode. Until duplicate same-language behavior is confirmed, our domain supports multiple tracks, but only one provider-published track may occupy a given provider caption key.

```sql
CREATE TABLE subtitle_tracks (
    id                   TEXT PRIMARY KEY,
    video_asset_id       TEXT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    provider_caption_key TEXT,
    source_track_index   INTEGER,
    lang                 TEXT NOT NULL,
    label                TEXT NOT NULL,
    source               TEXT NOT NULL CHECK (
                           source IN ('embedded','sidecar','manual','transcribed')
                         ),
    format_in            TEXT NOT NULL,
    format_out           TEXT,
    is_default           INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
    is_forced            INTEGER NOT NULL DEFAULT 0 CHECK (is_forced IN (0,1)),
    is_sdh               INTEGER NOT NULL DEFAULT 0 CHECK (is_sdh IN (0,1)),
    checksum             TEXT,
    version              INTEGER NOT NULL DEFAULT 1,
    status               TEXT NOT NULL DEFAULT 'pending' CHECK (
                           status IN ('pending','published','unsupported','failed')
                         ),
    failure_code         TEXT,
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL,
    UNIQUE (video_asset_id, lang, label)
) STRICT;

CREATE UNIQUE INDEX subtitle_provider_key_unique
ON subtitle_tracks (video_asset_id, provider_caption_key)
WHERE provider_caption_key IS NOT NULL;
```

If Bunny cannot publish multiple English variants, the first release publishes one selected English track through Bunny and retains additional tracks for a later application-hosted VTT path.

### 4.4 Metadata matches

```sql
CREATE TABLE metadata_matches (
    upload_id         TEXT PRIMARY KEY REFERENCES uploads(id),
    parsed_title      TEXT,
    parsed_year       INTEGER,
    tmdb_id           INTEGER,
    confidence        TEXT NOT NULL CHECK (confidence IN ('high','low','none','manual')),
    resolved_by       TEXT REFERENCES profiles(id),
    resolved_at       INTEGER,
    tmdb_refreshed_at INTEGER
) STRICT;
```

Audit events are immutable and record role changes, deletions, metadata repairs, caption mutations, provider migrations and offline revocations.

---

## 5. Metadata subsystem

Metadata remains a first-class phase. Flow: adopt an existing release-name parser → TMDB search → confidence score.

- **High confidence:** may auto-publish with a visible "wrong match?" affordance.
- **Low/none:** enters a repair queue visible to the uploader and operator.
- Series structure, ordering and next-episode behavior derive from the confirmed TMDB record.
- TMDB key lives in Worker secrets.
- The app includes TMDB's required logo and notice in an About/Credits surface.
- TMDB-derived metadata and images are refreshed or purged within the provider's permitted cache window; the database records `tmdb_refreshed_at`.
- Artwork may be copied into application-controlled storage only under the current TMDB terms, with a refresh/purge job and attribution. It is not treated as permanently owned application data.

The metadata-repair screen in DESIGN.md §10 remains a first-class feature. Without it, the operator becomes the undocumented repair system forever.

---

## 6. Subtitle subsystem (FR-8)

### 6.1 Provider facts and unresolved provider behavior

Bunny exposes per-video caption add/delete APIs keyed by a caption shortcode and returns caption data in video/play-data responses. The route shape means same-language variants require an explicit provider test or support answer before the schema-to-provider mapping is considered final.

Bunny can process supported embedded multi-audio tracks after multi-audio support is enabled for the video library. This is **not** "zero effort for every source": provider codec, channel-layout and language-code limitations still apply and must be surfaced as processing errors rather than silently dropped.

The earlier assertion that every caption mutation requires purging a caption directory is not treated as verified. The implementation will purge only if current Bunny documentation, a support response or a reproducible integration test demonstrates that it is required.

### 6.2 Provisional primary path: browser extraction during upload

The target design remains a streaming Matroska/EBML parser in a Web Worker for MKV text tracks and MP4Box.js for supported MP4 text tracks. The browser already has the selected file, so extraction can run alongside TUS without routing the source through our API.

```text
User selects file
  ├── TUS resumable upload ─────────────▶ Bunny Stream
  └── Web Worker parse (provisional)
        ├── enumerate subtitle tracks and language metadata
        ├── extract supported text tracks
        ├── convert SRT/ASS/mov_text → WebVTT
        ├── uploader confirms/relabels tracks
        └── POST small VTT payloads ──▶ API ──▶ provider/application caption path
```

This is a hypothesis until the Phase 0B spike passes. Do not claim a fixed memory footprint or that parsing finishes before upload until benchmarks from the actual library demonstrate it.

#### Phase 0B acceptance matrix

The spike must test:

- Representative large MKVs from the actual library, including an approximately 8 GB file.
- Multiple text subtitle tracks and missing/incorrect language tags.
- SRT, ASS/SSA, MP4 `mov_text`, Unicode and Filipino text.
- Detection of PGS/VobSub without attempting false conversion.
- Chrome, Edge, Safari and Firefox on Windows/macOS where supported.
- Cancellation, refresh, parser failure and concurrent TUS upload.
- Peak browser memory, extraction duration and upload-throughput impact.
- Duplicate same-language tracks such as English, English SDH and English forced.
- Bunny add/replace/delete behavior and stale-caption behavior.

**Pass condition:** extraction is reliable on the representative matrix without unacceptable browser memory, upload degradation or corrupted timing. **Fail condition:** S1 embedded extraction becomes a deferred enhancement; S2 sidecar files become the MVP path.

### 6.3 Source hierarchy

**S1 · Embedded (provisional automatic)** — enabled only after §6.2 passes.

**S2 · Sidecar** — dropzone accepts `.srt`, `.vtt` and supported `.ass` files beside the video; also available post-publication through "add subtitles."

**S3 · Manual** — operator relabel, replace, set default/forced/SDH flags, or delete. Caption cache purge occurs only when verified provider behavior requires it.

**S4 · Generated (deferred)** — Bunny transcription as an explicit paid per-title operator action, not an automatic background cost.

### 6.4 Honest limits and escape hatch

**PGS/VobSub image subtitles** require OCR and are unsupported in the MVP. The uploader is told to attach an SRT/VTT, and the track is recorded as `unsupported` so real demand is measurable.

**ASS/SSA styling** is flattened for WebVTT; timing and text are preserved where conversion permits, but positioning, karaoke and complex styling are not promised.

**Mobile uploads** do not run the browser extraction worker; they use sidecar/manual paths unless a later native extraction feature is justified.

The Cloudflare Container FFmpeg/OCR escape hatch is incomplete unless it can access the original source. The approved future flow is:

```text
User reselects original file
  → temporary direct upload for processing
  → scale-to-zero container extracts/OCRs requested track
  → VTT published
  → temporary source deleted and deletion audited
```

Canonical originals on the owner's local drive are not assumed to be directly reachable by Cloudflare.

### 6.5 Playback and offline

Playback-session responses include the published subtitle tracks available to the requesting profile. Web uses HLS.js and track controls styled per the accessibility baseline in DESIGN.md. Mobile uses expo-video with side-loaded local or remote tracks where supported.

Offline bundles contain the signed MP4 plus every selected published VTT. The local manifest records caption checksums and versions so changed tracks can be refreshed without redownloading the video.

---

## 7. Core flows

**Upload:** client requests upload session → API validates uploader role, file metadata, quota and concurrency (2/user) → API creates Bunny video object and returns short-lived TUS credentials → client uploads directly to Bunny → optional subtitle worker runs only if ADR-122 has passed → Bunny transcodes → signed webhook is persisted and processed idempotently → asset becomes `ready` → metadata match runs → title publishes or enters repair queue.

**Playback:** client requests a playback session for a `playable` → API verifies profile, membership and publication → API creates a session and returns a short-lived signed HLS URL plus published tracks → player streams directly from Bunny CDN → progress reports every 15 seconds and on pause, seek, background and completion.

**Offline:** mobile requests authorization for `playable + quality + device` → API returns short-lived signed MP4/VTT URLs plus `offline_authorized_until` → client downloads resumably to app-private storage and persists SQLite state → startup reconciliation compares SQLite, local files and native task state → expired download authorization is refreshed before resuming where possible → playback remains available until authorization expiry → revoked access removes the local copy when the application reconnects or the authorization expires.

---

## 8. Security, data exposure and operations

### 8.1 Authentication and authorization

- The exact managed auth provider is selected in Phase 0B; Auth0 and Clerk are the initial candidates, not simultaneous production dependencies.
- The acceptance test must cover passwordless email, Google, Apple, browser sessions, Expo sessions, logout, revocation and Worker-side JWT verification.
- The Worker validates token signature, issuer, audience and expiry against the selected provider's JWKS/OIDC metadata.
- `auth_identities` maps external issuer + subject to an internal profile; business records never use provider IDs as primary domain identity.
- Invitation acceptance is enforced by our API and D1 records. A valid external identity alone does not grant library access.
- Web and mobile clients have no direct D1 access. Every business authorization check occurs in the Hono API.
- Provider administrative credentials and machine-to-machine secrets remain only in Worker/CI secret stores.

### 8.2 Media and provider security

- Playback and download URLs are short-lived and authorized per profile/device.
- Provider API keys remain in Worker secrets.
- Upload TUS credentials expire and are scoped to the intended upload.
- API request-size limits reject video payloads.
- Webhooks are signature-verified, persisted before processing and idempotent.
- Uploaded filenames and metadata are never trusted as executable paths or HTML.

### 8.3 Recovery and production gate

D1 Time Travel is the first recovery layer: up to 30 days on Workers Paid and 7 days on Workers Free under the current limits. It is not the only portability layer. A scheduled logical export is written to owner-controlled R2 or equivalent storage on a documented cadence, retained beyond the Time Travel window, and tested through a restore rehearsal before friends or family depend on the service.

The production gate requires Workers Paid, successful authentication-provider web/Expo tests, D1 Time Travel verification, a successful logical export/restore rehearsal, budget alerts, and documented account-recovery ownership. Canonical original media remains under owner control (ADR-110); Bunny is a delivery copy, not the only copy.

### 8.4 Required alerts and operator console

Alerts:

- Bunny projected spend at 50%, 75% and 90% of the monthly budget.
- Actual encoded storage and monthly delivery exceed scenario assumptions.
- D1 storage, rows-read, rows-written or query-latency metrics approach operating thresholds.
- Video processing or caption publication failures spike.
- Playback authorization errors or time-to-first-frame regress.
- Webhook retries/backlog accumulate.
- Backup or restore verification fails.

Operator console:

- Pending/failed uploads and metadata repair.
- Subtitle track status, unsupported formats and provider-key conflicts.
- Actual encoded GB, delivered GB and projected cost.
- User invitations, roles, quotas and revocations.
- Library health: missing artwork, missing captions and stale TMDB refresh dates.
- Immutable audit view.

---

## 9. Scaling path (bounded, honest)

**10 users:** one D1 database, read replication disabled, indexed prepared queries, and no infrastructure changes. Measure real upload, playback, D1 row metrics, query latency and cost behavior.

**~25–50 users:** add Cloudflare Queues only if webhook/recommendation retries create a measured backlog; cache home-feed responses at the application layer; precompute recommendation rows if queries become visible in traces. Enable D1 global read replication only if Philippine metadata latency is material, the public-beta risk remains acceptable, and the Sessions API is used with bookmark propagation.

**~100 users:** tune indexes and query shapes before adding architecture. Aggregate or expire raw playback heartbeat events, keep watch-progress as the durable summary, and monitor the 10 GB per-database ceiling. A second D1 database or tenant split is considered only when measured storage/throughput—not user count alone—requires it.

**D1 throughput posture:** the primary is single-threaded, so slow scans directly reduce throughput. Every production list/filter query needs an index review and row-scan measurement. At the stated scale this is an engineering-discipline concern, not a capacity concern.

**Video-storage crossover:** compare Bunny invoices against dedicated storage only when actual encoded storage approaches the documented trigger range. Revisit ADR-102 with real storage, delivery and operating labor—not a title-count approximation.

Beyond that is a different product. This document refuses to design for it prematurely.

---

## 10. Decision register (complete, including reversals)

Reversed and superseded decisions remain in the register because the reasoning trail matters.

| ID | Decision | Status | Essence and history |
|---|---|---|---|
| **ADR-101** | Build custom experience on managed plumbing | Accepted | Avoid months of infrastructure work before a user can watch anything. |
| **ADR-102** | Bunny Stream as video platform | Accepted | Reversed self-hosted Jellyfin. Per-GB storage/delivery and managed transcoding fit the private scale; canonical originals mitigate exit cost. |
| **ADR-103** | Offline via signed MP4/VTT files in app-private storage, no DRM | Accepted; amended by ADR-123 | Practical for the closed group. Signed URLs deter casual sharing but do not equal commercial DRM. |
| **ADR-104** | Visible quality choice plus provider-generated adaptive ladder | Accepted | Data-saver and manual quality controls remain important for Philippine connections. |
| **ADR-105** | Modular monolith, Hono on Workers, REST `/v1`, Zod contracts | Accepted | Folders before packages; services only when measured boundaries justify them. |
| **ADR-106** | React/Vite web; React Native/Expo mobile; TanStack Query | Accepted | Authenticated SPA and one mobile codebase with native escape hatches. |
| **ADR-107** | Supabase Postgres + Auth; magic-link first | Superseded by ADR-126 and ADR-127 | D1 replaces the application database; authentication becomes a separate managed-provider decision. |
| **ADR-108** | TUS uploads, quotas, upload state machine, signed idempotent webhooks | Accepted | Resumability is load-bearing for Philippine uploads. |
| **ADR-109** | Versioned progress writes and title-level reconciliation | Superseded in part by ADR-121 | Versioning remains; stable playable identity replaces provider-asset/title reconciliation. |
| **ADR-110** | Canonical originals stay under owner control | Accepted | A provider suspension, price change or migration cannot destroy the library. |
| **ADR-111** | Metadata parse → TMDB → confidence gate → human repair | Accepted; amended | Required attribution and maximum cache window are now explicit; permanent ownership of TMDB artwork is not assumed. |
| **ADR-112** | Browser subtitle extraction + Bunny captions as already-approved path | Superseded by ADR-122 | Earlier version stated unbenchmarked behavior too confidently. |
| **ADR-113** | PGS/VobSub unsupported in MVP; scale-to-zero FFmpeg/OCR escape hatch | Approved if triggered; amended | Future processing requires temporary re-upload/reselection of the original; local originals are not cloud-accessible by assumption. |
| **ADR-114** | Deferral list with named triggers | Accepted; amended | Deferrals are tied to measured need. Current triggers include a paid auth tier, D1 read replication, queues, analytics, OpenAPI codegen, Turborepo and paid Expo tooling. |
| **ADR-115** | Production-grade delivery for passwordless and invitation emails | Accepted; amended | Use the selected auth provider’s production email path or a dedicated transactional provider; development-only mail delivery is not acceptable for external users. |
| **ADR-116** | TV v1 = casting + HDMI | Accepted | Native TV applications remain outside the first-release scope. |
| **ADR-117** | Rules-based recommendations with visible reasons and editorial row | Accepted | Honest explanations and curation outperform fake ML at this scale. |
| **ADR-118** | 1080p ceiling; 720p default offline quality | Accepted | Controls storage, bandwidth and device usage. |
| **ADR-119** | Hyperdrive + `pg` for Worker-to-Supabase connectivity | Superseded by ADR-126 | Native D1 binding removes the external Postgres connection and pooling layer. |
| **ADR-120** | API-only Supabase application-data access in a non-public schema | Superseded in implementation by ADR-128 | The API-only principle remains; D1 has no client binding or Postgres schema/RLS model. |
| **ADR-121** | Stable `playable` identity for movie/episode progress | Accepted | Provider assets are replaceable; progress, playback sessions and downloads reference `playable_id`. |
| **ADR-122** | Subtitle extraction and caption-key mapping are provisional | Provisionally accepted | Time-boxed Phase 0B spike, representative file/browser matrix and Bunny duplicate-language test determine the MVP path. |
| **ADR-123** | Offline authorization has an expiry and best-effort revocation | Accepted | Offline devices cannot receive immediate revocation. Removal occurs at reconnect or expiry; resumable tasks reconcile on startup. |
| **ADR-124** | Cost model uses explicit storage/viewing assumptions and scenarios | Accepted | Opaque ranges are rejected. Actual encoded/delivered GB drive alerts and budget decisions. |
| **ADR-125** | Invitation lifecycle and API idempotency conventions | Accepted | One-time hashed invitations, cursor pagination, request IDs and retry-safe creation are defaults from the first migration. |
| **ADR-126** | Cloudflare D1 as the application database | Accepted | Native Worker binding, low fixed cost and sufficient capacity fit this metadata/progress workload. Supabase Postgres and Hyperdrive are removed. |
| **ADR-127** | Authentication is a separate managed OIDC/JWT service | Provisionally accepted | Phase 0B compares Auth0 and Clerk on browser + Expo passwordless/social flows, revocation, session UX and Worker verification before one provider is accepted. *Branch note:* a parallel revision (v1.1-A) selected self-hosted Better Auth on D1; that option carries documented Workers pitfalls (single-instance requirement to avoid SQLite write-lock hangs; scrypt too CPU-heavy for password flows) and greater owned auth code. It may be included as a third spike candidate only if the zero-new-vendor property is judged worth those costs; the managed-OIDC default stands otherwise. |
| **ADR-128** | API-only D1 access | Accepted | Clients never query D1 directly; the Worker owns all business authorization and prepared SQL. |
| **ADR-129** | D1 schema conventions: `STRICT`, UUIDv7 `TEXT`, millisecond `INTEGER` timestamps | Accepted | One predictable SQLite-compatible representation replaces PostgreSQL-specific types and defaults. |
| **ADR-130** | D1 Time Travel plus scheduled logical exports | Accepted | Point-in-time recovery is operational protection; owner-controlled exports provide portability and retention beyond the platform window. |
| **ADR-131** | D1 read replication deferred until measured | Accepted | Eastern North America primary hint first; Philippine read acceleration requires Sessions API/bookmarks and is added only after latency evidence. |
| **ADR-132** | Strict dev/production environment separation | Accepted | Separate Worker, D1 database, hostname and secrets per environment (`laya-api-dev`/`laya-dev` vs production). The mock JWT issuer exists only in development configuration; production must be structurally unable to validate a mock-issuer token (no mock audience, JWKS URL or key in its config). Acceptance-tested from Phase 0A onward. |
| **ADR-133** | Lean catalog surface: search = titles + genres; limited cast from cached TMDB metadata; no people/credits tables; no user-visible "versions" | Accepted | The design's people-search and cast-browsing implied `people`/`title_credits` tables the data model never defined. MVP: search covers titles and genres; title pages show limited cast read from cached metadata; person pages/filters deferred until demonstrated demand. Provider encodes are never user-visible (ADR-121); if editorial variants (director's cut) ever matter, they become an explicit `editions` domain concept via a new ADR — not exposed provider assets. |

---

## 11. Cost model

### 11.1 Formula

```text
Monthly video cost =
    encoded storage GB × enabled-region storage rate
  + North America delivered GB × North America delivery rate
  + Asia/Oceania delivered GB × Asia/Oceania delivery rate
  + optional premium encoding, transcription or DRM
```

Conservative launch budget assumption: Bunny's default storage region plus U.S. East replication, pending the §13 region support answer. The model therefore uses **$0.02 per encoded GB/month** for two stored copies. It uses the currently documented Standard delivery rates of **$0.01/GB for North America** and **$0.03/GB for Asia/Oceania**.

### 11.2 Planning assumptions

These are budgeting inputs, not provider guarantees:

| Input | Baseline |
|---|---:|
| Encoded storage per catalog hour | 3.0 GB |
| Delivered data per viewing hour | 1.5 GB |
| Viewing distribution | 85% U.S. / 15% Philippines |
| Video ceiling | 1080p |
| Offline default | 720p |
| Storage copies in conservative budget | 2 |

Actual encoded size changes with source complexity, enabled renditions, MP4 fallback, retained originals, codecs and audio tracks. The operator console uses provider-reported bytes; it does not estimate from title count.

### 11.3 Fixed platform costs

| Item | Development | Production |
|---|---:|---:|
| Cloudflare Workers Paid + D1 | $5 | $5 |
| Managed authentication | $0 expected during provider free allowance | $0 expected at 5–10 users; paid tier is a trigger-gated exception |
| Domain | ~$1.50 | ~$1.50 |
| Transactional email, Sentry, TMDB | $0 initially | $0 within free allowances |
| Apple Developer (Phase 5+) | — | ~$8.25/month annualized |
| Google Play (Phase 5+) | — | $25 one time |
| Expo Starter | $0 | Optional $19/month only if build queues justify it |

Workers Paid currently includes the first 25 billion D1 rows read per month, 50 million rows written per month and 5 GB of total D1 storage; additional storage is currently $0.75/GB-month. A paid D1 database has a 10 GB per-database maximum. The expected private workload remains within the included D1 allowance; indexes still count toward storage and indexed writes.

### 11.4 Reproducible scenarios

| Scenario | Catalog | Monthly viewing | Bunny estimate | Core monthly infrastructure* | With annualized Apple + first-year Google |
|---|---:|---:|---:|---:|---:|
| Development / first light | 50 h (~150 GB) | 50 h (~75 GB) | ~$4 | ~$10.50 | Not applicable |
| Starter production | 100 h (~300 GB) | 200 h (~300 GB) | ~$9.90 | ~$16.40 | ~$26.73 |
| Typical private use | 300 h (~900 GB) | 750 h (~1,125 GB) | ~$32.63 | ~$39.13 | ~$49.46 |
| Heavy private use | 500 h (~1,500 GB) | 2,000 h (~3,000 GB) | ~$69 | ~$75.50 | ~$85.83 |

\*Core infrastructure includes Workers Paid with expected included D1 usage, the domain, Bunny and an authentication provider remaining within its free allowance. Taxes are excluded. Expo Starter would add $19 when intentionally enabled. If the selected authentication provider requires a paid plan for acceptable session behavior or production environments, its verified price is added explicitly before approval.

The approved operating envelope runs through the **Heavy private use** scenario under the current D1/auth assumption, but the application still warns before projected spend reaches $50, $75, $90 and $100. Video—not D1—is expected to remain the meaningful variable-cost driver.

### 11.5 User-count growth scenarios

The §11.4 scenarios are workload-shaped; this table maps them to user counts for planning. Assumptions: ~20 viewing hours per user per month; catalog grows with uploaders (100 h at 10 users → ~650 h at 100); blended delivery $0.013/GB (85/15 US/PH); Apple fee applies once mobile ships (20+ columns). Both storage answers to open decision §13.2 are shown, since that answer is worth real money at scale.

| Monthly total | 10 users | 20 users | 50 users | 100 users |
|---|---:|---:|---:|---:|
| Single-region storage ($0.01/GB) | ~$13 | ~$29 | ~$46 | ~$74 |
| Conservative two-region ($0.02/GB) | ~$16 | ~$35 | ~$58 | ~$94 |

Composition at 100 users (conservative): Bunny ~$79 (storage $40 + delivery $39), Workers+D1 $5, domain ~$1.50, Apple ~$8.25, auth/email/D1 usage ~$0 within allowances. Marginal cost ≈ $0.40–0.60 per additional active user, almost entirely delivery. The two-region question (§13.2) is worth ~$20/month at 100 users — the strongest reason to get the support answer before budget lock. Every line scales smoothly or is already paid; no subscription thresholds remain, with one watch item: the selected auth provider must stay within its free allowance or its verified price is added explicitly (ADR-127).

### 11.6 Excluded or trigger-gated costs

- Labor, design work, test devices and household internet.
- Content licensing or legal advice.
- Premium encoding, automated transcription and commercial DRM.
- Singapore replication until Philippine measurements justify an irreversible storage-region addition.
- Paid authentication, Sentry or PostHog plans until a required feature or real allowance is exceeded.
- 4K outputs.

---

## 12. Delivery phases

| Phase | Ships | Milestone sentence | Done |
|---|---|---|---|
| **0A · Skeleton** (days) | pnpm workspace, local D1, Worker binding, Vite app, CI, mock JWT issuer, first D1 migrations, deployed health/read-write path | "The API can authenticate a test token and read/write through D1" | |
| **0B · Risk spikes** (time-boxed ≤1 week) | Auth0-vs-Clerk browser/Expo spike and decision; invitation/revocation path; subtitle extraction matrix; duplicate-language Bunny caption test; representative encoding-size sample | "The auth, provider and browser unknowns have written go/no-go results" | |
| **1 · First light** | Selected managed auth, admin TUS upload → Bunny → browser playback, stable playable record, progress saved, sidecar subtitles; embedded extraction only if 0B passed | "An invited user logs in, a movie plays with subtitles, and progress persists" | |
| **2 · Catalog** (largest) | Filename parse → TMDB → attribution/cache handling → artwork → series model → repair queue | "Uploads become real titles with posters, on their own" | |
| **3 · Experience** | DESIGN.md D1: home, browse, title pages, custom player | "It feels like the product I designed" | |
| **4 · Everyone uploads** | Invites, roles, quotas, upload UI, subtitle confirmation, status tracking | "A friend added a movie without messaging me" | |
| **5 · Mobile + offline** | Expo app, resumable signed-MP4/VTT downloads, expiry/revalidation, progress sync | "My sibling watched on a plane, with subtitles" | |
| **6 · Polish** | Recommendation rows, Philippine measurements, optional D1 read replication, optional Singapore video replica, optional transcription | "Measured improvements replace assumptions" | |

Design runs one phase ahead of engineering per DESIGN.md where applicable. Phase 0B is a hard gate, not an excuse to expand foundation work indefinitely.

### 12.1 Production sign-off measurements

- Philippine residential upload throughput and disconnect recovery.
- Time to first frame for fresh uncached titles in the U.S. and Philippines.
- Buffering ratio and selected rendition over 30-minute sessions.
- Actual encoded GB/hour for a representative movie/episode sample.
- Subtitle extraction matrix results, timing, memory and upload impact.
- Offline pause/resume across Wi-Fi, cellular, app termination and URL expiry.
- SQLite/local-file/native-task reconciliation after mobile restart.
- At least 10 independent concurrent playback sessions.
- D1 query latency, rows scanned/written and storage metrics for representative endpoints.
- Auth-provider login, refresh/reopen, logout and revocation behavior in both Vite and Expo.
- D1 Time Travel verification plus logical export/restore rehearsal.

---

## 13. Open decisions and implementation gates

1. **Managed authentication provider:** Phase 0B selects Auth0 or Clerk after browser and Expo testing. The decision must include session duration/UX, passwordless email, Google, Apple, revocation, invite enforcement, production-environment separation and verified cost.
2. **Bunny Stream primary/replication region:** confirm whether the Stream primary can be U.S.-side or default + U.S. East replication is required. Region additions may be difficult or impossible to remove; obtain a support answer before budget lock.
3. **Duplicate same-language captions:** can Bunny publish English, English SDH and English forced simultaneously, and what provider key should each use? Phase 0B test/support answer required.
4. **Caption mutation caching:** does add/replace/delete require an explicit purge under the current platform? Record evidence before implementing purge behavior.
5. **Subtitle extraction:** Phase 0B determines whether S1 embedded extraction ships in MVP or S2 sidecar becomes the initial path.
6. **Canonical originals location:** select the physical drive, backup policy and habit that keeps ADR-110 true.
7. **Offline authorization period:** choose the initial number of offline days and renewal behavior.
8. **Series at launch:** full season/episode browsing in Phase 3 or movies-first. Movies-first remains the cheapest meaningful scope cut.
9. ~~Product name~~ **Decided: Laya** (Filipino, "freedom" — fits the Play Lexi/Tala naming convention and the product's own thesis). Domain registration remains open.
10. **Library model:** one shared library or separate friend/family libraries.
11. **Profile model:** one profile per account or household profiles.

---

## 14. Document changelog

| Version | Date | Change |
|---|---|---|
| v0.1 | Jul 22, 2026 | Initial: self-hosted Jellyfin on dedicated server. |
| v0.2 | Jul 22, 2026 | Corrected pre-encoded ladder and official-app offline assumptions. |
| review | Jul 22, 2026 | Bunny pricing verified; provider switch recommended; metadata/subtitle/TV/custody gaps identified. |
| v1.0 | Jul 22, 2026 | Bunny stack adopted; scope trimmed; metadata and subtitle subsystems added; ADR register consolidated. |
| v1.0.1 | Jul 22, 2026 | Reissued under the master filename; stale Jellyfin-era premises removed from companion design references. |
| **v1.1** | **Jul 22, 2026** | **Principal-engineering review applied:** Hyperdrive/least-privilege DB boundary, stable playables, provisional subtitle spike, provider caption-key gate, TMDB cache/attribution rules, offline expiry semantics, reproducible cost scenarios, invitation/API conventions, local-development contract and production upgrade gate. |
| **v1.2** | **Jul 22, 2026** | **D1 architecture adopted:** Supabase Postgres/Hyperdrive removed; native D1 binding, SQLite `STRICT` conventions, D1 recovery/export plan and read-replication trigger added; managed authentication separated into a Phase 0B provider decision; production costs reduced and recalculated. |
| v1.2.1 | Jul 22, 2026 | **Fork reconciliation + review.** Two v1.1 revisions existed in parallel: v1.1-A (chat branch: D1 + self-hosted Better Auth, growth cost table) and v1.1-B (this lineage: playables, spikes, provider gates, reproducible scenarios). v1.2 is confirmed as canonical — it independently converged on D1 and additionally corrected three v1.1-A defects (unbenchmarked subtitle-extraction claims → ADR-122 spike; caption-purge asserted from a third-party client doc → demoted to §13.4 gate; container escape hatch lacking source access → re-upload flow in ADR-113). Reconciliation adds: §11.5 user-count scenarios, ADR-127 branch note on the Better Auth option, and this row. All v1.2 cost arithmetic and D1 allowance claims re-verified. |
| v1.2.2 | Jul 22, 2026 | **Project named: Laya** (§13.9 closed; domain still open). Codename "Sine" retired throughout. |
| v1.3 | Jul 22, 2026 | **Synchronized release after external documentation review.** ADR-132 (dev/prod isolation; mock issuer never in production) and ADR-133 (lean catalog surface) added. DESIGN.md reconciled to v0.3 (v1.2-era decisions propagated: provider-neutral onboarding, ADR-121/122 language, phase remapping, metered-storage operator metrics, virus-scan claim removed). Brief bumped to v1.1 with environment isolation, precise ping-store semantics, expanded JWT rejection matrix, env/secret file requirements, static quality gates, and archive-on-completion. Docs governance: briefs live in `docs/phases/active|completed/`; `docs/README.md` reading path and glossary added. |

---

## 15. Verification references

Official sources behind the current load-bearing external claims:

- Cloudflare D1 overview and Worker binding: <https://developers.cloudflare.com/d1/> and <https://developers.cloudflare.com/d1/worker-api/>
- D1 pricing and limits: <https://developers.cloudflare.com/d1/platform/pricing/> and <https://developers.cloudflare.com/d1/platform/limits/>
- D1 local development and migrations: <https://developers.cloudflare.com/d1/best-practices/local-development/> and <https://developers.cloudflare.com/d1/reference/migrations/>
- D1 data location and read replication: <https://developers.cloudflare.com/d1/configuration/data-location/> and <https://developers.cloudflare.com/d1/best-practices/read-replication/>
- D1 Time Travel and import/export: <https://developers.cloudflare.com/d1/reference/time-travel/> and <https://developers.cloudflare.com/d1/best-practices/import-export-data/>
- D1 foreign keys and batch behavior: <https://developers.cloudflare.com/d1/sql-api/foreign-keys/> and <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>
- Auth0 pricing/features candidate reference: <https://auth0.com/pricing>
- Clerk pricing candidate reference: <https://clerk.com/pricing>
- Bunny Stream pricing and replication: <https://docs.bunny.net/stream/pricing> and <https://docs.bunny.net/stream/replication>
- Bunny caption API and play data: <https://docs.bunny.net/api-reference/stream/manage-videos/add-caption> and <https://docs.bunny.net/api-reference/stream/manage-videos/get-video-play-data>
- Bunny multi-audio: <https://docs.bunny.net/stream/multi-audio>
- Expo FileSystem behavior: <https://docs.expo.dev/versions/latest/sdk/filesystem/>
- TMDB API use, attribution and cache restrictions: <https://developer.themoviedb.org/docs/faq> and <https://www.themoviedb.org/api-terms-of-use>
- Cloudflare Containers pricing: <https://developers.cloudflare.com/containers/pricing/>