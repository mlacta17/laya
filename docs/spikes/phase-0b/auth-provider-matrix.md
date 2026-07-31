# Authentication provider comparison matrix

Status: **In progress**

Candidates: **Auth0 and Clerk**

Decision authority: ARCHITECTURE.md ADR-127 and
`docs/phases/active/PHASE-0B-BRIEF.md`

## Decision method

Security and product requirements are mandatory gates, not weighted
preferences. A provider cannot be selected while a mandatory gate is failed or
blocked. If both providers pass every mandatory gate, use the following
tie-breakers in order:

1. Reliable behavior across the browser and physical Expo devices.
2. Least custom security and session-management code.
3. Clearest operational recovery, revocation, audit, and key-rotation path for
   a solo operator.
4. Lowest integration complexity and best junior-developer readability.
5. Verified cost at Laya's expected size and documented growth scenarios.

Dashboard appearance and marketing claims are not decision evidence.

## Test environment

Complete these fields for each provider result:

| Field | Auth0 | Clerk |
| --- | --- | --- |
| Development tenant/application name | Sanitized: Laya browser spike in a development tenant | Sanitized: Laya disposable development application |
| Tenant/application region, if selectable | United States | Not selected in the development-instance workflow |
| Provider plan | Development tenant: Free; minimum qualifying production setup: Essentials | Development instance: Hobby; qualifying production instance: Hobby |
| Test date | 2026-07-27 through 2026-07-29 | 2026-07-28 through 2026-07-29 |
| React/browser environment | React 19.2.8, Vite 6.4.3, `@auth0/auth0-react` 2.22.0, Chrome 150 | React 19.2.8, Vite 6.4.3, `@clerk/react` 6.12.8, Chrome 150 |
| Expo version and development-build type | Blocked: Apple Developer Program activation still pending as of 2026-07-29 | Expo SDK 55 native development-build harness prepared; build blocked on Apple Developer Program activation still pending as of 2026-07-29 |
| Physical phone model and OS | iPhone 16 / iOS 26.5 (planned) | iPhone 16 / iOS 26.5 (planned) |
| US network/location | Physical US connection; reliability sample still pending | Physical US connection; reliability sample still pending |
| Philippines network/location | Blocked: no trusted tester on a Philippine connection has run the harness | Blocked: no trusted tester on a Philippine connection has run the harness |
| Official documentation version/date checked | Current official documentation checked 2026-07-28 and 2026-07-29 | Current official documentation checked 2026-07-28 and 2026-07-29 |

Never record tenant secrets, full tokens, test-user addresses, invitation
contents, or provider administrative credentials in this file.

## Mandatory gates

Each result must be `Pass`, `Fail`, `Blocked`, or `Not run` and link to the
corresponding result section.

| ID | Criterion | Acceptance condition | Minimum evidence | Auth0 | Clerk |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | Browser sign-in | A disposable test user completes sign-in in the supported React browser flow. | Reproducible steps, browser/version, sanitized success observation | [Pass](auth0-results.md#auth-01-browser-sign-in) | [Pass for Google](clerk-results.md#auth-01-browser-sign-in) |
| AUTH-02 | Expo sign-in | The same identity can sign in through an Expo development build on a physical target device. | Device/OS/build details and sanitized success observation | Blocked: Apple Developer Program activation pending (rechecked 2026-07-29) | Blocked: Apple Developer Program activation pending (rechecked 2026-07-29) |
| AUTH-03 | Passwordless email | A disposable user completes passwordless email authentication without a password. | Delivery method, elapsed time, expiry/reuse behavior, sanitized result | Blocked on Expo after [browser pass](auth0-results.md#auth-03-passwordless-email) | Blocked on Expo after [browser pass](clerk-results.md#auth-03-passwordless-email) |
| AUTH-04 | Google | Google sign-in succeeds in browser and Expo, or a documented provider limitation causes a fail. | Both surfaces, redirect behavior, required credentials and plan | Blocked on Expo after [browser pass](auth0-results.md#auth-04-google-sign-in) | Blocked on Expo after [browser pass](clerk-results.md#auth-04-google-sign-in) |
| AUTH-05 | Apple | Apple sign-in succeeds in browser and Expo, or a documented provider limitation causes a fail. | Both surfaces, physical-device result, required credentials and annual cost | Blocked: $99/year enrollment purchased; activation pending | Blocked: $99/year enrollment purchased; activation pending |
| AUTH-06 | Session restore | A valid browser and Expo session survives refresh/reopen without unnecessary login. | Refresh plus full close/reopen observations and session age | Blocked on Expo after [browser pass](auth0-results.md#auth-06-session-restore) | Blocked on Expo after [browser pass](clerk-results.md#auth-06-session-restore) |
| AUTH-07 | Refresh and expiry | Tokens refresh according to documented policy and expired tokens are rejected. | Sanitized timestamps/claims and Worker response status | [Pass](auth0-results.md#auth-07-refresh-and-expiry) | [Pass](clerk-results.md#auth-07-refresh-and-expiry) |
| AUTH-08 | Logout | Logout removes the local session and the application cannot silently reuse it. | Before/after application state and protected-request result | Blocked on Expo/Worker after [browser pass](auth0-results.md#auth-08-browser-logout) | Blocked on Expo/protected-request completion after [browser pass](clerk-results.md#auth-08-logout) |
| AUTH-09 | Server revocation | An operator can revoke access and the measured enforcement delay is acceptable and documented. | Provider action/audit event, repeated Worker responses, elapsed time | [Pass with access-token-lifetime caveat](auth0-results.md#auth-09-server-revocation) | [Pass with sub-minute JWT caveat](clerk-results.md#auth-09-server-revocation) |
| AUTH-10 | JWT verification | The Worker accepts a valid RS256 provider token and rejects invalid signature, expiry, issuer, and audience. | Automated test output plus sanitized end-to-end request results | [Pass](auth0-results.md#auth-10-jwt-verification) | [Pass](clerk-results.md#auth-10-jwt-verification) |
| AUTH-11 | JWKS rotation safety | Unknown keys trigger bounded refresh behavior; concurrent requests share work and sequential garbage tokens are rate-limited by a measured cooldown. | Automated tests and observed provider JWKS behavior | [Pass](auth0-results.md#auth-11-jwks-rotation-safety) | [Pass](clerk-results.md#auth-11-jwks-rotation-safety) |
| AUTH-12 | Environment isolation | Development credentials cannot authenticate to production; production material is absent from development. | Negative HTTP result and sanitized configuration inspection | Blocked: provider production tenant is outside Phase 0B; Laya production remains fail-closed | Blocked: provider production instance is outside Phase 0B; Laya production remains fail-closed |
| AUTH-13 | Invitation boundary | Provider authentication alone grants no Laya membership; valid invitation redemption does. | Provider-neutral sequence and API boundary test/design evidence | [Pass](invitation-revocation.md#7-authorization-after-redemption) | [Pass](invitation-revocation.md#7-authorization-after-redemption) |
| AUTH-14 | Membership revocation | Removing Laya membership denies application access independently of provider account state. | Before/after authorization results and failure behavior | [Pass](invitation-revocation.md#8-revocation-sequence) | [Pass](invitation-revocation.md#8-revocation-sequence) |
| AUTH-15 | US reliability | Critical login, reopen, refresh, and logout flows complete reliably on the target US connection. | Location/network description, three consecutive runs, timings/failures | [Pass](auth-reliability-runbook.md#auth0-us-conclusion) | [Pass](auth-reliability-runbook.md#clerk-us-conclusion) |
| AUTH-16 | Philippines reliability | The same critical flows complete reliably on a real Philippine connection. | Physical location/network description, three consecutive runs, timings/failures | [Blocked: trusted Philippine test run unavailable](auth-reliability-runbook.md#philippines-execution-prerequisites) | [Blocked: trusted Philippine test run unavailable](auth-reliability-runbook.md#philippines-execution-prerequisites) |
| AUTH-17 | Account recovery | The provider offers a supportable recovery path, with operator escalation documented. | Reproducible recovery exercise or official limitation | [Pass](auth0-results.md#auth-17-account-recovery) | [Pass](clerk-results.md#auth-17-account-recovery) |
| AUTH-18 | Operations and audit | The operator can locate users, sessions, revocations, relevant audit events, and signing-key controls. | Sanitized dashboard observations and official references | [Pass](auth0-results.md#auth-18-operations-and-audit) | [Pass](clerk-results.md#auth-18-operations-and-audit) |
| AUTH-19 | Production email | Passwordless/invitation email has a production-grade path rather than development-only delivery. | Required configuration/provider, limitations, and verified price | Blocked: [custom production sender and price not selected](auth0-results.md#auth-19-production-email) | [Pass on documented production path](clerk-results.md#auth-19-production-email) |
| AUTH-20 | Cost and limits | Required features and environment isolation have a verified price at 10 and 100 active users. | Dated official pricing links and explicit calculation | [Pass at USD 35/month](auth0-results.md#auth-20-cost-and-limits) | [Pass at USD 0/month](clerk-results.md#auth-20-cost-and-limits) |

## Cross-cutting observations

Record non-gating differences only after the mandatory results exist:

| Concern | Auth0 | Clerk |
| --- | --- | --- |
| Dependencies and bundle impact | Pending | Pending |
| Configuration surface | Pending | Pending |
| React integration clarity | Pending | Pending |
| Expo integration clarity | Pending | Native harness is small and Expo Doctor passes 19/19, but Clerk's prebuilt native components are beta and current transitive React peer metadata does not exactly match Expo SDK 55's pinned patch |
| Worker/OIDC standards fit | Pending | Pending |
| Error quality and troubleshooting | Pending | Pending |
| Key rotation and incident response | Pending | Pending |
| Vendor lock-in and exit path | Pending | Pending |
| Known limitations/workarounds | Pending | Pending |

## Decision

Decision: **Pending**

Do not fill this section until all mandatory gates have a supported result.

- Selected provider or no-go:
- Decision date:
- Evidence summary:
- Rejected alternative and reason:
- Known limitations accepted:
- Reversal cost:
- ADR-127 update:
