# Phase 0B Brief — Risk spikes

*Project Laya · Brief v0.1 · Active July 27, 2026 — authority lives in ARCHITECTURE.md v1.3.12 and DESIGN.md v0.3.2. If this brief and ARCHITECTURE.md disagree, ARCHITECTURE.md wins and this brief has a bug.*

> **Status:** Complete
>
> **Completed:** August 7, 2026
>
> **Milestone commit:** `5c96c57`
>
> **Outcome:** Passed with measured limitations carried into implementation
>
> **Learnings:** ADR-122, ADR-127, ADR-138, ADR-139, ADR-140, ADR-141

---

## Milestone (the only definition of done)

> **"The auth, provider and browser unknowns have written go/no-go results."**

This is a time-boxed evidence phase, not a feature phase. Finish within one week of hands-on spike work; pause the clock while waiting for provider support or required physical test material.

## Context for the implementing agent

Read ARCHITECTURE.md §2, §3.2–§3.4, §6.2, §8, §12, §13, and ADR-113, ADR-122, ADR-127, ADR-132, ADR-134, and ADR-137 before starting. Read DESIGN.md only to understand invite and subtitle UX constraints. Provider behavior must be demonstrated or sourced from current official documentation.

## In scope

1. **Managed-auth decision:** compare Auth0 and Clerk using development tenants. Prove the browser and Expo development-build flows on real target devices, including passwordless email, Google, Apple, session restore after reopen, refresh, logout, server-side revocation, Worker JWT/JWKS verification, issuer/audience separation, invitation enforcement, current pricing, operator recovery, and dev/production isolation.
2. **Invitation and revocation path:** write the provider-neutral sequence from invitation creation through redemption and membership enforcement, plus immediate access revocation. Identify the minimum provider and application records required. Do not create the production schema yet.
3. **Subtitle extraction matrix:** run ARCHITECTURE.md §6.2 against representative media outside git: large MKV (including about 8 GB), multiple and incorrect language tags, SRT, ASS/SSA, MP4 `mov_text`, Unicode and Filipino text, PGS/VobSub detection, supported desktop browsers, cancellation, refresh, parser failure, and concurrent TUS upload. Record duration, peak memory, and upload impact.
4. **Bunny evidence:** use a disposable test library to determine primary/replication-region behavior, duplicate same-language caption behavior (standard, SDH, forced), add/replace/delete cache behavior, and encoded output/storage size for a representative movie and episode. Obtain a support answer where official documentation is silent. Do not enable irreversible replication on a future real library.
5. **Written decisions:** place reproducible setup, evidence, measurements, limitations, and pass/fail conclusions in `docs/spikes/phase-0b/`. Update the affected ADRs before production implementation begins.
6. **JWKS hardening:** once a real-provider token is available, measure and add the minimum forced-refresh cooldown required by ARCHITECTURE.md §13.12, with concurrent and sequential unknown-`kid` tests.

## Explicitly out of scope — do not build, even partially

Production authentication integration or tenants; production invitations; the §4 domain schema; upload, catalog, player, subtitle, or mobile product features; provider SDKs in production code; a fourth workspace package; real-library Bunny replication; committed secrets, tokens, or media; unsupported claims based on a happy-path demo.

Spike code is disposable and must remain clearly separated from production code. Merge written results, tests for accepted shared infrastructure, and ADR changes—not throwaway applications or credentials.

## Required evidence and acceptance checks

- [x] An Auth0-vs-Clerk matrix covers every auth criterion above with links, reproducible observations, costs as of the test date, and an explicit winner or no-go. Clerk selected August 2, 2026; shared AUTH-12/AUTH-16 blockers remain explicit production gates.
- [x] Browser and Expo flows are tested on real target devices; session restore, logout, revocation, and Worker verification results are recorded.
- [x] The invitation/revocation sequence identifies the enforcement boundary and failure behavior without prematurely fixing the domain schema. Evidence: `docs/spikes/phase-0b/invitation-revocation.md` and `apps/api/test/auth-membership-boundary.test.ts`.
- [x] The complete subtitle matrix records browser, file/track type, result, duration, available memory observations, cancellation/recovery behavior, and upload impact. Completed August 6, 2026; unavailable standard memory APIs remain explicit limitations rather than zero measurements.
- [x] The written subtitle conclusion selects embedded-text extraction for supported desktop browser uploads, with sidecar/manual fallback and all format, mobile and measurement limits preserved.
- [x] Bunny duplicate-caption, caption-mutation, region, and encoding-size questions have measured or provider-confirmed answers.
- [x] ADR-122 and ADR-127 are accepted from evidence; related §13 gates are closed or explicitly carried as later implementation/pre-launch gates.
- [x] No spike secret, token, media file, production dependency, or irreversible provider setting enters git.

## Operator prerequisites

The owner supplies development-only Auth0 and Clerk accounts, Apple/Google test credentials where required, a real Expo-capable device, representative media files stored outside the repository, and a disposable Bunny Stream test library. Missing prerequisites are recorded as blockers; behavior is never inferred.

## Recommended sequence

1. Auth provider matrix and smallest browser/Expo proof, because Phase 1 cannot begin without ADR-127.
2. Invitation/revocation and Worker verification, including JWKS refresh hardening.
3. Subtitle extraction matrix.
4. Bunny behavior and representative encoding-size tests.
5. Consolidate evidence, update ADRs and open gates, then write the Phase 1 brief.

## Official starting references

- Expo authentication: <https://docs.expo.dev/develop/authentication/> and AuthSession: <https://docs.expo.dev/versions/latest/sdk/auth-session/>
- Auth0 React: <https://auth0.com/docs/quickstart/spa/react>, Expo: <https://auth0.com/docs/quickstart/native/react-native-expo>, pricing: <https://auth0.com/pricing>
- Clerk React: <https://clerk.com/docs/react/getting-started/quickstart>, Expo: <https://clerk.com/docs/expo/getting-started/quickstart>, session revocation: <https://clerk.com/docs/reference/backend/sessions/revoke-session>, pricing: <https://clerk.com/pricing>
- Bunny caption add/delete: <https://docs.bunny.net/api-reference/stream/manage-videos/add-caption> and <https://docs.bunny.net/reference/video_deletecaption>
- Bunny replication and pricing: <https://docs.bunny.net/stream/replication> and <https://docs.bunny.net/stream/pricing>

## Non-goals of this brief

This brief does not choose providers in advance or turn experiments into architecture by accident. When official sources and observed behavior disagree, preserve both, stop the affected implementation, and resolve the decision in ARCHITECTURE.md before Phase 1.
