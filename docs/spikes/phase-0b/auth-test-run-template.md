# Authentication test-run template

Copy this template into a provider-specific result document. Use one test-run
section for one provider, surface, device, location, and date so another
developer can reproduce the observation without guessing.

## Run identity

| Field | Value |
| --- | --- |
| Matrix test ID | |
| Provider | |
| Date and local time | |
| Tester | |
| Development tenant/application | |
| Provider plan | |
| Surface | Browser / Expo development build / Worker |
| Application revision | Git commit or disposable-spike revision |
| Browser and version | |
| Device and OS | |
| Physical test location | |
| Network type/provider | |

Use a stable evidence label such as `auth0-auth-01-2026-07-28`. Evidence labels
must not contain a person's email address, token subject, invitation code, or
other private identifier.

## Prerequisites

- [ ] Development-only provider environment confirmed.
- [ ] Disposable test identity confirmed.
- [ ] Required callback/logout URLs recorded without secrets.
- [ ] Test identity is invited or uninvited as required by the scenario.
- [ ] Screen recording, screenshot, terminal, and logs are ready to be
      sanitized.
- [ ] No production credential or tenant is in use.

Missing prerequisites:

## Acceptance condition

Write the expected observable result before running the test:

## Procedure

Number every action precisely. Include navigation, commands, waiting periods,
refresh/reopen behavior, and the exact point where measurements start and stop.

1.
2.
3.

## Observations

| Observation | Result |
| --- | --- |
| Started at | |
| Completed at | |
| Elapsed time | |
| Application behavior | |
| Worker HTTP status | |
| Provider dashboard/audit behavior | |
| Retry count | |
| Unexpected behavior | |

For token-related tests, record only safe metadata needed to understand the
result, such as algorithm, issuer hostname, intended audience, expiry timestamp,
and a shortened key identifier. Never record a full access token, refresh token,
authorization code, cookie, client secret, or private key.

## Negative test

Describe the invalid, expired, revoked, uninvited, wrong-environment, or
otherwise forbidden case paired with the successful case.

Expected rejection:

Observed rejection:

## Evidence

Link sanitized files under `evidence/` or include short sanitized command output
directly:

- Evidence label:
- What it proves:
- Redactions performed:

## Result

Result: **Pass / Fail / Blocked**

Reason:

Limitations:

Follow-up:

Matrix updated: **Yes / No**
