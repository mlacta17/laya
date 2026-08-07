# Phase 0B spike evidence

This directory holds reproducible evidence for Phase 0B's go/no-go decisions.
It contains written results only; disposable applications, credentials, tokens,
personal messages, and media files stay outside the repository.

## Current status

Authentication provider comparison: **complete — Clerk selected**.

Subtitle extraction matrix: **complete — embedded text accepted for supported
desktop browser uploads; sidecar/manual captions remain the fallback**.

ADR-127 selects Clerk for Phase 1 production integration. Auth0 remains a
technically viable but rejected spike candidate. No provider SDK, production
tenant credential, token, or disposable harness enters the production
codebase during Phase 0B.

The Apple Developer Program enrollment is active. Clerk's physical iPhone
development-build matrix, including native Apple sign-in, is complete. Auth0's
equivalent physical-iPhone Google, passwordless email, Apple, reopen, refresh,
logout, Worker-verification, and revocation flows are also recorded. Provider
selection is complete; production launch remains blocked on the explicitly
carried AUTH-12 production-instance isolation test and AUTH-16 trusted
real-Philippines run. The
[provider-neutral invitation/revocation contract](invitation-revocation.md)
and its API-boundary tests are complete Phase 0B evidence; production
invitation routes and schema remain intentionally deferred. A blocked device
gate is not treated as a pass and does not authorize production auth
integration.

## Authentication workflow

1. Complete [the comparison matrix](auth-provider-matrix.md) before changing
   production application code.
2. Copy [the test-run template](auth-test-run-template.md) into a provider
   result document for each test session.
3. Run the same scenarios against Auth0 and Clerk using disposable users and
   development environments.
4. Record failures and limitations as carefully as successes. Use `blocked`
   when a required device, account, credential, or provider answer is missing.
5. Commit only sanitized evidence allowed by
   [the evidence rules](evidence/README.md).
6. Select a provider only after every mandatory gate has a supported
   `pass`, `fail`, or `blocked` conclusion.
7. Update ADR-127 before integrating the selected provider into production
   code.

## Completed provider-neutral evidence

- [Invitation and membership-revocation contract](invitation-revocation.md)
- `apps/api/test/auth-membership-boundary.test.ts`, proving that provider
  authentication alone does not grant membership and that membership removal
  denies the same still-valid provider token

These artifacts close AUTH-13 and AUTH-14 for both candidates because the
boundary belongs to Laya rather than either provider. They do not select a
provider or implement the Phase 1 domain model.

## Remaining authentication work

The candidate comparison is complete. Auth0's unresolved external production
email provider is preserved as a rejection factor rather than work required for
the selected provider. Two Clerk production gates remain:

1. Create the separate production instance in Phase 1 and prove that
   development tokens fail against production before protected production
   routes are enabled (`AUTH-12`).
2. Run the reliability packet through a trusted tester on a real Philippine
   connection before launch (`AUTH-16`).

Phase 0B may now finish its remaining Bunny episode/settings/storage
measurements. Production Clerk and subtitle integration remain later-phase
scope.

## Prepared execution packets

- [US and Philippines authentication reliability runbook](auth-reliability-runbook.md)
- [Browser subtitle-extraction matrix](subtitle-results.md)
- [Bunny Stream behavior and encoding-size matrix](bunny-results.md)

These documents combine test contracts with recorded observations. Each file's
own status is authoritative; incomplete rows remain open until the required
physical connection, media/browser run, or disposable Bunny resource produces
an observation.

## Result vocabulary

- **Pass:** the expected behavior was reproduced and the required evidence is
  recorded.
- **Fail:** observed behavior does not meet the acceptance criterion.
- **Blocked:** the test cannot yet be completed because a named prerequisite is
  unavailable. A blocker is never treated as a pass.
- **Not run:** no test attempt has been made.

## Scope boundary

The spike may use temporary applications outside this repository. It must not
add both provider SDKs to Laya, create production tenants, create the production
identity schema, or weaken the production environment's current fail-closed
authentication behavior.
