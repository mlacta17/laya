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
provider-neutral invitation/revocation, subtitle, and Bunny evidence can
continue independently. A blocked device gate is not treated as a pass and
does not authorize production auth integration.

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
