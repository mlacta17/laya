# Authentication provider comparison matrix

Status: **Complete — Clerk selected; shared production gates carried explicitly**

Candidates: **Auth0 and Clerk**

Decision authority: ARCHITECTURE.md ADR-127 and
`docs/phases/active/PHASE-0B-BRIEF.md`

## Decision method

Security and product requirements are mandatory gates, not weighted
preferences. A provider cannot be selected while one of its provider-specific
mandatory gates is failed or blocked. A shared external blocker may be carried
as an explicit pre-production gate only when it cannot distinguish the
candidates, the system remains fail-closed, and the blocker does not authorize
production integration. If both providers pass every provider-specific gate,
use the following tie-breakers in order:

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
| Test date | 2026-07-27 through 2026-08-02 | 2026-07-28 through 2026-08-02 |
| React/browser environment | React 19.2.8, Vite 6.4.3, `@auth0/auth0-react` 2.22.0, Chrome 150 | React 19.2.8, Vite 6.4.3, `@clerk/react` 6.12.8, Chrome 150 |
| Expo version and development-build type | Expo SDK 55 EAS development build with `react-native-auth0` 5.11.0 installed and tested | Expo SDK 55 EAS development build with `@clerk/expo` 4.1.2 installed and tested |
| Physical phone model and OS | iPhone 16 / iOS 26.5 (tested) | iPhone 16 / iOS 26.5 (tested) |
| US network/location | Physical US connection; browser reliability packet and physical-iPhone flows completed | Physical US connection; browser reliability packet and physical-iPhone flows completed |
| Philippines network/location | Blocked: no trusted tester on a Philippine connection has run the harness | Blocked: no trusted tester on a Philippine connection has run the harness |
| Official documentation version/date checked | Current official documentation checked 2026-07-28 through 2026-08-02 | Current official documentation checked 2026-07-28 through 2026-08-02 |

Never record tenant secrets, full tokens, test-user addresses, invitation
contents, or provider administrative credentials in this file.

## Mandatory gates

Each result must be `Pass`, `Fail`, `Blocked`, or `Not run` and link to the
corresponding result section.

| ID | Criterion | Acceptance condition | Minimum evidence | Auth0 | Clerk |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | Browser sign-in | A disposable test user completes sign-in in the supported React browser flow. | Reproducible steps, browser/version, sanitized success observation | [Pass](auth0-results.md#auth-01-browser-sign-in) | [Pass for Google](clerk-results.md#auth-01-browser-sign-in) |
| AUTH-02 | Expo sign-in | The same identity can sign in through an Expo development build on a physical target device. | Device/OS/build details and sanitized success observation | [Pass](auth0-results.md#auth-02-expo-sign-in) | [Pass](clerk-results.md#auth-02-expo-sign-in) |
| AUTH-03 | Passwordless email | A disposable user completes passwordless email authentication without a password. | Delivery method, elapsed time, expiry/reuse behavior, sanitized result | [Pass in browser and Expo with production-email caveat](auth0-results.md#auth-03-passwordless-email) | [Pass in browser and Expo](clerk-results.md#auth-03-passwordless-email) |
| AUTH-04 | Google | Google sign-in succeeds in browser and Expo, or a documented provider limitation causes a fail. | Both surfaces, redirect behavior, required credentials and plan | [Pass in browser and Expo with production-credential caveat](auth0-results.md#auth-04-google-sign-in) | [Pass in browser and Expo](clerk-results.md#auth-04-google-sign-in) |
| AUTH-05 | Apple | Apple sign-in succeeds in browser and Expo, or a documented provider limitation causes a fail. | Both surfaces, physical-device result, required credentials and annual cost | [Pass in browser and on physical iPhone with production-credential caveat](auth0-results.md#auth-05-apple-sign-in) | [Pass in browser and on physical iPhone](clerk-results.md#auth-05-apple-sign-in) |
| AUTH-06 | Session restore | A valid browser and Expo session survives refresh/reopen without unnecessary login. | Refresh plus full close/reopen observations and session age | [Pass in browser and Expo](auth0-results.md#auth-06-session-restore) | [Pass in browser and Expo](clerk-results.md#auth-06-session-restore) |
| AUTH-07 | Refresh and expiry | Tokens refresh according to documented policy and expired tokens are rejected. | Sanitized timestamps/claims and Worker response status | [Pass](auth0-results.md#auth-07-refresh-and-expiry) | [Pass](clerk-results.md#auth-07-refresh-and-expiry) |
| AUTH-08 | Logout | Logout removes the local session and the application cannot silently reuse it. | Before/after application state and protected-request result | [Pass in browser and Expo](auth0-results.md#auth-08-browser-logout) | [Pass in browser and Expo](clerk-results.md#auth-08-logout) |
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
| Dependencies and bundle impact | Separate React and native SDKs; the native SDK requires an Expo development build and config plugin. No spike dependency enters the production workspace. | Separate React and Expo SDKs; the native SDK uses Expo SecureStore. No spike dependency enters the production workspace. |
| Configuration surface | Separate SPA, Native, API, connection, callback/logout, offline-access, refresh-rotation, token-lifetime, and email-provider settings. Separate production/development tenants require Essentials. | One application with distinct development/production instances, session-token claims, social/passwordless methods, Native API, iOS bundle registration, and production-domain DNS. |
| React integration clarity | Standards-oriented Universal Login with explicit token-cache/refresh choices; persistent browser refresh tokens add an XSS-sensitive design decision. | Prebuilt and headless React paths with provider-managed browser session restoration; fewer token-lifecycle choices for Laya to own. |
| Expo integration clarity | Small native harness and successful physical build using Auth0 Universal Login; TypeScript, lint, and Expo Doctor 19/19 passed. Exact callback/logout allowlisting was required. | Small native harness and successful physical build; Expo Doctor passed 19/19. The initial `@clerk/expo` 3.1.12 pod graph failed, while 4.1.2 built and passed all target flows. Clerk's prebuilt native components remain beta. |
| Worker/OIDC standards fit | RS256/JWKS verified end to end. Audience arrays and `azp` are valid provider behavior already supported by the provider-neutral Worker. | RS256/JWKS verified end to end. Exact audience is stable; native tokens omitted `azp`, which the Worker correctly does not require. |
| Error quality and troubleshooting | Callback mismatch, missing offline access, expired tokens, and revoked refresh grants produced actionable errors and audit events. | OTP reuse/expiry and session revocation produced actionable UI errors/events. The initial outdated Expo SDK package produced a non-obvious CocoaPods failure resolved by the current package. |
| Key rotation and incident response | Current/next signing keys are visible; dashboard grant revocation and audit events worked. Already-issued JWTs remain valid until expiry, so production token lifetime must be chosen deliberately. | Signing keys are provider-managed; device revocation and `session.revoked` audit events worked. One-minute session JWTs bounded the offline-verifier delay. |
| Vendor lock-in and exit path | OIDC/JWT boundary and `(issuer, subject)` identity mapping limit application lock-in; Universal Login configuration and Auth0-specific refresh semantics remain migration work. | OIDC/JWT boundary and `(issuer, subject)` identity mapping limit application lock-in; prebuilt auth UI/session APIs create more client coupling than the Worker boundary. |
| Known limitations/workarounds | Essentials is USD 35/month for separate environments. Production email requires a separate provider. Development Apple credentials are not production credentials. | Hobby fixes sessions at seven days, keeps one day of logs, and retains Clerk branding. Custom session lifetime/MFA require Pro. Native prebuilt components are beta. |

## Decision

Decision: **Select Clerk for Phase 1 production integration**

- Selected provider or no-go: Clerk on the Hobby plan, with a separate Clerk
  development instance and future production instance.
- Decision date: August 2, 2026.
- Evidence summary: both candidates passed the browser, physical-iPhone,
  passwordless, Google, Apple, session, refresh, logout, revocation, Worker
  JWT/JWKS, invitation-boundary, recovery, audit, and US reliability paths.
  Clerk additionally has a documented production email-delivery path within
  the selected provider and costs USD 0/month at Laya's 10- and 100-user
  scenarios. Auth0 requires Essentials at USD 35/month for separate
  production/development environments and still requires a separately selected
  production email provider.
- Rejected alternative and reason: Auth0 is technically viable, but adds a
  paid tenant tier, an external production-email dependency, more application
  and token-lifecycle configuration, and a longer configurable stateless-token
  revocation window without delivering a required advantage at Laya's scale.
- Known limitations accepted: Hobby has a fixed seven-day session lifetime,
  one-day application-log retention, Clerk branding, provider-managed signing
  keys, and no paid MFA/custom session lifetime. `@clerk/expo` 4.1.2 is the
  tested baseline; the initial 3.1.12 pod graph failed, and prebuilt native
  components remain beta.
- Shared blockers carried as pre-production gates: AUTH-12 remains fail-closed
  until the future Clerk production instance proves issuer/audience separation;
  AUTH-16 requires a trusted real-Philippines run before launch. Neither shared
  blocker distinguishes Auth0 from Clerk or authorizes production integration
  during Phase 0B.
- Reversal cost: replace the web/mobile provider SDKs and hosted-login
  configuration, rotate issuer/audience/JWKS settings, and relink external
  identities through an audited flow. Domain records and email/social
  credentials also move. Business records remain stable because they reference
  internal profiles rather than provider IDs.
- ADR-127 update: accept Clerk; preserve explicit bearer-token CORS, the
  provider-neutral Worker verifier, and `(issuer, subject)` mapping. Production
  integration begins only in Phase 1 after its brief is approved.
