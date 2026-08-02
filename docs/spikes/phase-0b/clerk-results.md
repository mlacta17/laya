# Clerk authentication spike results

Status: **Complete for the tested US browser and physical-iPhone scope**

Test dates: **2026-07-28 through 2026-08-02**

Scope: disposable Phase 0B browser and Expo development-build harnesses; no
Clerk SDK is installed in the Laya application.

## Test configuration

- Provider environment: Clerk development instance
- Browser: Google Chrome 150.0.7871.182 (64-bit)
- Browser harness: React 19.2.8, Vite 6.4.3,
  `@clerk/react` 6.12.8
- Harness origin: `http://localhost:5174`
- Disposable mobile harness: Expo SDK 55.0.0, React Native 0.83.10,
  React 19.2.0, and `@clerk/expo` 4.1.2
- Mobile harness location: outside the Laya repository; linked to a disposable
  Expo project without recording its project or account identifiers here
- Mobile session storage: Clerk's `tokenCache` backed by Expo SecureStore
- Clerk Native API: enabled in the development instance on 2026-07-28
- Physical test location: United States
- Physical mobile target: iPhone 16 running iOS 26.5 with an EAS development
  build installed directly on the registered device
- iOS development-build prerequisite: USD 99/year Apple Developer Program
  enrollment, activated before the physical tests on 2026-08-02
- Mobile sign-in methods: Apple, Google, and passwordless email code
- Secrets: no Clerk secret key was used; the development publishable key was
  stored only in the disposable harness's ignored local environment file

Tenant identifiers, user identifiers, email addresses, full tokens, signing
key identifiers, and credentials are intentionally omitted.

The mobile harness uses Clerk's prebuilt native `AuthView` to exercise the
provider's native SwiftUI integration with minimal spike-only code. Clerk
documents this surface as beta as of 2026-07-28, so successful functional tests
will not erase that maturity risk. The harness never displays or persists a
complete access token; it can display only the signing algorithm, issuer,
audience, authorized party, and expiration time.

The first EAS attempt used `@clerk/expo` 3.1.12 and failed during CocoaPods
installation. Its bundled native Google integration pulled an App Check
dependency chain whose pods were not compatible with the generated static
framework configuration. The disposable harness was upgraded to
`@clerk/expo` 4.1.2, whose supported Expo peer range includes SDK 55 and which
no longer bundled that failing native pod path. Expo Doctor then passed all 19
checks, TypeScript and lint passed, EAS produced an installable development
build, and the physical-device flows below passed. This is evidence for the
tested version pair, not a promise that arbitrary Clerk/Expo versions are
interchangeable.

## AUTH-01 browser sign-in

Result: **Pass for Google in the browser**

The disposable user completed Clerk's hosted Google sign-in and returned to
the local React harness in an authenticated state.

## AUTH-02 Expo sign-in

Result: **Pass on a physical iPhone development build**

The registered iPhone installed the EAS development build and completed
Apple, Google, and passwordless email-code authentication through Clerk's
native `AuthView`. Apple and Google each completed in under five seconds.
Passwordless email delivery took approximately 5.75 seconds and the complete
email sign-in took approximately 6.08 seconds, with no retry or error. The
application returned to its authenticated spike screen after each flow.

## AUTH-04 Google sign-in

Result: **Pass in browser and Expo**

Google sign-in completed successfully in Chrome from the United States.
The same provider flow completed in under five seconds on the physical iPhone
development build. The resulting session survived a full app close and reopen,
and explicit logout remained signed out after reopening.

## AUTH-05 Apple sign-in

Result: **Pass in browser and on a physical iPhone**

The disposable React browser harness completed Apple sign-in and returned to
the authenticated application state. Safe token metadata showed `RS256`, the
expected Clerk development issuer form, the exact Laya development API
audience, the browser origin as authorized party, an expiration, and a signing
key identifier. No relay address, complete key identifier, token, or provider
user identifier is retained as evidence.

After the Apple social connection and Clerk native iOS application were
configured, Sign in with Apple completed in under five seconds on the physical
iPhone. The test identity used Apple's private email relay, and Clerk displayed
the resulting relay identity without exposing it in this document. The session
survived a full app close and reopen, renewed its token, and remained signed
out after explicit logout and reopen.

## AUTH-03 passwordless email

Result: **Pass in browser and Expo**

In the Clerk development instance:

- email sign-up is enabled and requires an email address;
- sign-up verification uses an email verification code;
- email sign-in uses an email verification code;
- email verification links are disabled; and
- password sign-up and adding a password to an account are disabled.

A real verification code arrived in the normal inbox, not spam, in
approximately five seconds and completed a passwordless browser sign-in
successfully. Protected-Worker and physical Expo behavior are covered by
their separate gates and remain to be tested.

The passwordless session also remained authenticated after a normal browser
refresh and after closing the harness tab, opening a new tab, and revisiting
the same origin.

A used verification code (Code A) was submitted during a later sign-in
attempt after a fresh Code B had been requested. Clerk rejected Code A with
the user-facing message **"Incorrect code"**, demonstrating one-time-use
behavior. Entering the fresh Code B on the same screen then completed sign-in,
showing that the invalid attempt did not break recovery. Code-expiry behavior
was then measured separately.

A fresh Code C email did not state its lifetime. After approximately 10
minutes and 30 seconds, Clerk rejected Code C with the user-facing message
**"The verification has expired. You must create a new one."** This proves
expiry enforcement at that elapsed time; it does not claim the unobserved
exact expiration boundary.

On the physical iPhone, a new passwordless code arrived in the normal inbox in
approximately 5.75 seconds and completed sign-in in approximately 6.08
seconds. The session survived a full app close and reopen. After logout, it
remained signed out after reopening. Code reuse and expiry were already
demonstrated in the browser and were not redundantly re-measured on iOS.

## AUTH-06 session restore

Result: **Pass in browser and Expo**

While signed in with Google, a normal browser refresh restored the Clerk
session without prompting the user to authenticate again. Closing the harness
tab, opening a new tab, and revisiting the same origin also restored the
authenticated session without another login. A passwordless email session
also survived both a normal refresh and a full tab close-and-reopen. On the
physical iPhone, Apple, Google, and passwordless email sessions each
survived a full app close and reopen without another authentication prompt.

## AUTH-07 refresh and expiry

Result: **Pass**

The harness inspected safe metadata from a signed-in session token, waited
more than the documented 60-second token lifetime, and inspected again. The
user remained signed in and the second token's expiration moved later than
the first, demonstrating the Clerk browser SDK's automatic token renewal.
Exact timestamps and full tokens were not recorded.

The isolated Laya Worker accepted a live provider token with HTTP 200. The
harness then held one token only in transient memory until five seconds after
its `exp` time and sent that same captured token; the Worker rejected it with
HTTP 401. The SDK's newer replacement token was intentionally not used for
the negative request.

On the physical iPhone, the spike inspected an Apple session token, waited for
the SDK to renew it, and observed that the second expiration moved later than
the first while the session stayed authenticated. Exact timestamps and tokens
were not recorded.

## AUTH-08 logout

Result: **Pass in browser and Expo**

After the user selected **Sign out**, the harness returned to its signed-out
state. Refreshing the page did not silently restore the Clerk session.
Closing the tab, opening a new tab, and revisiting the harness origin also
remained signed out. Repeating logout with a passwordless email session also
remained signed out after refresh and after closing the tab and revisiting the
same origin.

On the physical iPhone, explicit logout for Apple, Google, and passwordless
email returned the application to the signed-out screen. Each method remained
signed out after a full app close and reopen, so the application had no session
token to reuse silently.

## AUTH-09 server revocation

Result: **Pass with bounded stateless-token caveat**

While the disposable user was actively signed in to the browser harness, the
operator selected **Revoke device** for its active Windows/Chrome device in
the Clerk development dashboard. The harness automatically changed to its
signed-out state in approximately three seconds without a manual refresh.
Refreshing the harness did not restore the revoked session. Closing the
harness tab, opening a new tab, and revisiting the same origin also remained
signed out.

The Clerk Application Logs showed a matching `session.revoked` event at the
test time, providing an operator-visible audit record.

For the protected-request test, the harness captured a freshly minted token,
proved that the isolated Laya Worker initially accepted it, and polled that
Worker every two seconds with the same token while the operator revoked the
device. The browser returned to signed-out state in approximately 3.72
seconds. The captured token was rejected with HTTP 401 at 60 seconds after
capture, matching Clerk's short session-token lifetime. The exact
revocation-click-to-401 duration was not captured, so the supported conclusion
is the conservative bound **less than 60 seconds after revocation**, not an
invented exact value.

This is expected for offline JWT verification: revoking provider state cannot
retroactively invalidate an already-issued signature. Immediate Laya access
removal must therefore remain an application authorization operation enforced
against D1 membership on every protected request (AUTH-14), independent of the
provider's sub-minute token window.

The physical iPhone test produced the same security shape with better client
revocation responsiveness. Revoking its active device in the Clerk dashboard
returned the app to its signed-out screen in approximately 1.31 seconds. The
app remained signed out after reopening, and Application Logs contained a
matching `session.revoked` event.

For the physical protected-request measurement, the app captured one token
only in transient memory, first proved that the isolated Laya Worker accepted
it with HTTP 200, and then polled with that same token after device revocation.
The captured token received HTTP 401 at 31 seconds after capture. The exact
revocation-click-to-401 duration was not measured, and the token was already
partway through its approximately one-minute lifetime; therefore 31 seconds is
a measured post-capture bound, not proof of immediate JWT revocation. D1
membership remains Laya's immediate authorization control.

## AUTH-13 and AUTH-14 application authorization

Result: **Pass through provider-neutral Laya evidence**

These gates do not depend on Clerk Organizations or a Clerk-specific membership
feature. The [invitation and revocation contract](invitation-revocation.md)
defines Clerk as the authenticator and Laya membership as the authorization
boundary. The repository test
`apps/api/test/auth-membership-boundary.test.ts` proves that:

- a valid provider token without Laya membership receives HTTP 403;
- identity mapping without active membership still receives HTTP 403;
- active membership permits the same token; and
- removing membership denies that still-valid token without revoking the Clerk
  account or waiting for the token to expire.

The model keys external identity by `(issuer, subject)`, not email or subject
alone. This is Phase 0B boundary evidence, not a production invitation schema
or route.

## AUTH-10 JWT verification

Result: **Pass**

The browser harness inspected only safe token metadata and did not display or
store the complete token. The observed default Clerk session token had:

- the `RS256` signing algorithm;
- an issuer ending in `.accounts.dev`;
- an expiration claim;
- an authorized-party (`azp`) claim equal to the harness origin; and
- no audience (`aud`) claim.

Laya's Worker correctly requires an explicit API audience. The `azp` claim
identifies the browser origin and is not an API audience, so the default token
must not be accepted as a substitute. The default Clerk token therefore cannot
pass Laya's current verification boundary without supported provider
configuration.

Clerk's official documentation says custom claims can be added to the
session token from **Dashboard > Sessions > Customize session token**. The
development instance was configured with an `aud` claim for the exact Laya
development API origin. After the browser harness was refreshed, a newly
issued token contained an audience ending in `.workers.dev`, confirming that
the supported customization took effect.

This is configuration evidence, not yet end-to-end verification. The stable
development Worker remains intentionally configured for the Phase 0A mock
issuer, and its disposable authenticated probe route was removed when that
phase closed. The test therefore used an isolated, disposable verifier rather
than overwrite the stable development environment. The Worker verifier was
not weakened for this test.

An isolated local Wrangler Worker then reused Laya's production-path
`requireAuth` and `verifyAccessToken` implementation with the exact Clerk
development issuer, configured Laya development API audience, and Clerk's
public JWKS URL. A live Clerk session token received **HTTP 200**. The Worker
log contained only the route, response status, and duration; the token was
neither logged nor persisted. Neither deployed Laya environment was changed.

Tokens issued to the physical iPhone for Apple, Google, and passwordless email
also used `RS256`, an issuer ending in `.accounts.dev`, the exact configured
Laya development Worker audience, and an expiration claim. They did not contain
`azp`. Laya's verifier does not require `azp`; it requires signature, issuer,
audience, expiry, and subject. The iPhone app sent a live token to the same
isolated verifier and received HTTP 200.

The same isolated Worker rejected a captured expired Clerk token with HTTP
401. The repository's automated rejection matrix then passed **27/27** auth
tests, covering invalid signature, unknown key ID, expiry, wrong issuer, wrong
audience, missing expiry/subject, future `nbf`, malformed JWTs, JWKS failures,
cache behavior, concurrent fetch sharing, and one bounded refresh on an
unknown rotation key. The full API suite passed **75/75** tests.

## AUTH-11 JWKS rotation safety

Result: **Pass**

The isolated Worker successfully fetched and used Clerk's public JWKS. ADR-138
then closed the sequential unknown-`kid` abuse path with a provider-neutral
five-minute forced-refresh cooldown per JWKS URL per Worker isolate.

Automated tests prove that concurrent misses share one fetch, a legitimate
unknown rotation key triggers one refresh and then verifies, forced refreshes
resume after the cooldown, sequential garbage key IDs cannot amplify provider
fetches, and a failed forced fetch still starts the cooldown. The focused auth
suite passed 27/27 tests and the full API suite passed 75/75 tests. Lint,
formatting, package type-checks, and Wrangler's generated-type check also
passed.

Official references checked on 2026-07-28:

- [Clerk Expo quickstart and native API requirement](https://clerk.com/docs/expo/getting-started/quickstart)
- [Clerk native AuthView](https://clerk.com/docs/reference/expo/native-components/auth-view)
- [Customize your session token](https://clerk.com/docs/guides/sessions/customize-session-tokens)
- [Session token claims](https://clerk.com/docs/guides/sessions/session-tokens)
- [JWT templates](https://clerk.com/docs/guides/sessions/jwt-templates)
- [Clerk manual verification and JWKS caching](https://clerk.com/docs/guides/sessions/verifying)
- [Auth0 JWKS minimum-refresh guidance](https://support.auth0.com/center/s/article/jwks-endpoint-latency-and-timeout-impact)

## AUTH-17 account recovery

Result: **Pass for the tested browser methods, with operator escalation**

The controlled passwordless tests exercised ordinary and failure recovery: a
used code was rejected, a newly issued code then completed sign-in, and an
expired verification directed the user to create a new one. Google sign-in
also completed as an independent provider-owned authentication method.

Laya does not reset provider credentials. A user who still controls an enabled
method starts a new Clerk-owned sign-in transaction. Loss of the only identity,
an unexpected account-linking state, or a requested identity relink escalates
to the Laya operator. The operator may revoke/reissue an invitation or perform
a future audited relink; Laya must never auto-link accounts by email.

Official reference rechecked 2026-08-02:

- [Clerk sign-up and sign-in options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options)

## AUTH-18 operations and audit

Result: **Pass with Hobby retention and provider-managed signing-key caveats**

The operator located the disposable users, linked sign-in methods, active
Windows/Chrome and iPhone devices, and the **Revoke device** action in the
Clerk dashboard. After each revocation, Application Logs showed the matching
`session.revoked` event. The same action signed the active client out and
caused its captured short-lived token to stop working within the measured
bound documented in AUTH-09.

Clerk documents dashboard user management, session revocation, and Application
Logs. Hobby retains Application Logs for one day, so an application-owned Laya
audit trail is still required for durable business and security events. Clerk
manages the JWT signing keys exposed through its JWKS; Laya consumes those keys
through bounded caching and refresh rather than operating the signing keys.
Any future Clerk Backend API secret key can be rotated independently per
environment. No backend secret was required or created for this spike.

Official references checked 2026-07-29:

- [Clerk user management](https://clerk.com/docs/guides/users/managing)
- [Clerk session revocation](https://clerk.com/docs/reference/backend/sessions/revoke-session)
- [Clerk Application Logs](https://clerk.com/docs/guides/dashboard/logs/application-logs)
- [Clerk API-key rotation](https://clerk.com/docs/guides/secure/rotate-api-keys)

## AUTH-19 production email

Result: **Pass on the documented production path; live delivery remains a
Phase 1 operational check**

The development code arrived in approximately five seconds in the normal
inbox, but development delivery is not treated as production evidence. Clerk
documents that a production instance sends from the application's own domain,
requires domain verification with SPF and DKIM during setup, and uses Clerk's
production email infrastructure. Self-delivery through the `email.created`
webhook is optional if Laya later needs its own provider.

At Laya's expected 10 users and 100-user growth check, the required Clerk Hobby
plan is USD 0/month and includes the production-instance path. No additional
email vendor is required by the documented default path. Delivery to the US
and Philippines must still be measured before launch; that is an operational
readiness check, not an unpriced architecture dependency.

Official reference rechecked 2026-08-02:

- [Clerk email deliverability](https://clerk.com/docs/guides/development/troubleshooting/email-deliverability)

## AUTH-20 cost and limits

Result: **Pass**

Pricing and environment behavior were rechecked against Clerk's official
documentation on 2026-08-02:

| Scenario | Retained users | Required Clerk tier | Provider cost |
| --- | ---: | --- | ---: |
| Expected private use | 10 MRU | Hobby | USD 0/month |
| Growth check | 100 MRU | Hobby | USD 0/month |

Clerk's Hobby plan includes up to 50,000 monthly retained users per
application, unlimited applications, passwordless and social authentication,
custom session-token claims, device tracking and revocation, and one day of
Application Log retention. Laya's Google and Apple methods fit within the
Hobby plan's limit of three social connections.

Each Clerk application starts with a development instance and can activate a
separate production instance with distinct `pk_test_`/`sk_test_` and
`pk_live_`/`sk_live_` credentials. This satisfies the shape required by
ADR-132 without sharing user data or credentials between environments.
Development instances are capped at 100 users; that cap is acceptable for
development and does not limit the separate production instance.

The Hobby plan has a fixed seven-day maximum session lifetime and only one day
of Application Log retention. Those are operational limitations to weigh in
the final decision, not hidden costs. Features tagged as paid in the
development dashboard must not be assumed available in Hobby production.

The Apple Developer Program fee is a shared external prerequisite for both
candidate providers and is not included in the Clerk provider cost.

Official references:

- [Clerk pricing](https://clerk.com/pricing)
- [Clerk development and production instances](https://clerk.com/docs/guides/development/managing-environments)
- [Deploy a Clerk production instance](https://clerk.com/docs/guides/development/deployment/production)

## Remaining evidence and blockers

- AUTH-12 remains fail-closed until Phase 1 creates the separate production
  instance and proves development-token rejection.
- AUTH-16 remains explicitly blocked until a trusted tester runs the
  reliability packet on a real Philippine connection.
- Production-instance email delivery remains a Phase 1 operational gate; the
  production path and price are documented in AUTH-19.
