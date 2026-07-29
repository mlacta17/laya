# Clerk authentication spike results

Status: **In progress**

Test date: **2026-07-28**

Scope: disposable Phase 0B browser harness; no Clerk SDK is installed in the
Laya application.

## Test configuration

- Provider environment: Clerk development instance
- Browser: Google Chrome 150.0.7871.182 (64-bit)
- Browser harness: React 19.2.8, Vite 6.4.3,
  `@clerk/react` 6.12.8
- Harness origin: `http://localhost:5174`
- Disposable mobile harness: Expo SDK 55.0.0, React Native 0.83.10,
  React 19.2.0, and `@clerk/expo` 3.1.12
- Mobile harness location: outside the Laya repository; linked to a disposable
  Expo project without recording its project or account identifiers here
- Mobile session storage: Clerk's `tokenCache` backed by Expo SecureStore
- Clerk Native API: enabled in the development instance on 2026-07-28
- Physical test location: United States
- Physical mobile target: iPhone 16 running iOS 26.5 (development build not yet
  created)
- iOS development-build prerequisite: USD 99/year Apple Developer Program
  enrollment purchased on 2026-07-28; activation remained pending when
  rechecked on 2026-07-29
- Sign-in method: Google
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

The exact `@clerk/expo` release explicitly declares Expo SDK 53 through 55
support. Its broad transitive dependency ranges currently resolve a newer
`@clerk/react` package whose React peer metadata starts at patch 19.2.3 while
Expo SDK 55 pins React 19.2.0. Expo's version was retained as the platform
authority. Expo Doctor passed all 19 checks, and the harness passed TypeScript
and lint validation. Runtime behavior still requires the physical development
build and remains part of the gate rather than being inferred from these
static checks.

## AUTH-01 browser sign-in

Result: **Pass for Google in the browser**

The disposable user completed Clerk's hosted Google sign-in and returned to
the local React harness in an authenticated state.

## AUTH-04 Google sign-in

Result: **Browser pass; Expo not run**

Google sign-in completed successfully in Chrome from the United States.
Phase 0B still requires the equivalent flow on a physical Expo development
build before AUTH-04 can pass.

## AUTH-03 passwordless email

Result: **Pass in browser**

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

## AUTH-06 session restore

Result: **Browser pass; Expo not run**

While signed in with Google, a normal browser refresh restored the Clerk
session without prompting the user to authenticate again. Closing the harness
tab, opening a new tab, and revisiting the same origin also restored the
authenticated session without another login. A passwordless email session
also survived both a normal refresh and a full tab close-and-reopen. The
equivalent physical Expo development-build behavior remains to be tested.

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

## AUTH-08 logout

Result: **Browser state pass; protected request and Expo not run**

After the user selected **Sign out**, the harness returned to its signed-out
state. Refreshing the page did not silently restore the Clerk session.
Closing the tab, opening a new tab, and revisiting the harness origin also
remained signed out. Repeating logout with a passwordless email session also
remained signed out after refresh and after closing the tab and revisiting the
same origin. A protected Worker request and the equivalent physical Expo
behavior remain to be tested.

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
provider's sub-minute token window. Physical Expo behavior remains to be
tested under the applicable client gates.

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

## AUTH-20 cost and limits

Result: **Pass**

Pricing and environment behavior were checked against Clerk's official
documentation on 2026-07-28:

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

## Remaining evidence

- Run physical Expo tests after Apple Developer Program enrollment, then
  complete the remaining provider-comparison gates.
