# Phase 0B spike evidence

This directory holds reproducible evidence for Phase 0B's go/no-go decisions.
It contains written results only; disposable applications, credentials, tokens,
personal messages, and media files stay outside the repository.

## Current status

Authentication provider comparison: **in progress**.

No provider has been selected. Auth0 and Clerk remain development-only
candidates until every required test is recorded and ADR-127 is updated.

Current external blocker (checked 2026-07-29): Apple Developer Program
enrollment is still pending activation. Physical iPhone development-build and
native Apple sign-in checks remain explicitly blocked; browser, Worker,
subtitle, and Bunny evidence can continue independently. The
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

The matrix is intentionally not complete. The next evidence runs are:

1. Auth0 live Worker verification, expiry, JWKS, and operator revocation
   (`AUTH-07`, `AUTH-09`, `AUTH-10`, and `AUTH-11`).
2. Three consecutive US critical-flow runs for each provider (`AUTH-15`) and
   Clerk's protected-request logout sub-result (`AUTH-08`).
3. Auth0 operations/signing-key inspection (`AUTH-18`) and selection/pricing
   of its required production email sender (`AUTH-19`).
4. A trusted tester on a real Philippine connection (`AUTH-16`).
5. After Apple activates the membership, physical iPhone Expo and Apple
   sign-in runs (`AUTH-02` through the mobile portions of `AUTH-08`).
6. Provider selection and ADR-127 only after every mandatory row has supported
   evidence.

Until then, subtitle and Bunny spike work may proceed, but Phase 1 production
authentication integration may not.

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
