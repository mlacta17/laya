# Auth0 spike results

Status: **Complete for the tested US browser and physical-iPhone scope**

Environment: **Development-only US tenant**

Production suitability: **Technically viable but not selected for Laya**

No tenant secret, complete token, personal identity, tenant-specific hostname,
or provider user identifier is recorded here.

## Setup

| Field | Value |
| --- | --- |
| Browser application | Single Page Application |
| Disposable harness | React 19.2.8, Vite 6.4.3, `@auth0/auth0-react` 2.22.0 |
| Native application | Auth0 Native application used only by the disposable Phase 0B harness |
| Disposable mobile harness | Expo SDK 55.0.28, React Native 0.83.10, React 19.2.0, `react-native-auth0` 5.11.0 |
| Mobile redirect scheme | `layaphase0bauth0` |
| iOS bundle identifier | `com.mlacta20.layaphase0bauth0` |
| Callback URL | `http://localhost:5173` |
| Logout URL | `http://localhost:5173` |
| Web origin | `http://localhost:5173` |
| API identifier | `https://laya-api-dev.lactao-maria04.workers.dev` |
| API JWT profile | Auth0 |
| Signing algorithm | RS256 |
| Physical test location | United States |
| Browser/version | Google Chrome 150.0.7871.182, official 64-bit build |
| Physical device | iPhone 16, iOS 26.5 |
| Native build | EAS iOS development build |

The disposable harness lives outside the repository in the operator's local
temporary directory. Its typecheck and production build passed before the first
interactive test. Its configuration contains public development Domain and
Client ID values and no client secret.

The separate disposable mobile harness also lives outside the repository. It
uses Auth0 Universal Login through the official React Native SDK and an EAS
development build; Expo Go is intentionally unsupported because the SDK has a
native config plugin. Before provider configuration, the harness passed
TypeScript, Expo lint, and all 19 Expo Doctor checks with placeholder public
identifiers. It requests the exact Laya development API audience plus
`openid profile email offline_access`, stores credentials through the SDK's
native credentials manager, displays only safe JWT metadata, and can exercise
the isolated Laya Worker without persisting a captured token. The EAS
development build was installed and exercised on the physical device recorded
above. The Auth0 application allows only the harness's exact custom-scheme
callback and logout URLs; no wildcard redirect was added.

## AUTH-01 browser sign-in

Result: **Pass**

Date: July 27, 2026

Evidence source: operator-observed result from the disposable browser harness

### Procedure

1. Start the isolated Vite harness on `http://localhost:5173`.
2. Select **Sign in with Auth0**.
3. Authenticate a non-administrator test identity through Auth0 Universal
   Login.
4. Return to the harness.
5. Request an access token through the Auth0 React SDK.
6. Display only sanitized token metadata; never display or persist the complete
   token.

### Observations

- Auth0 returned to the configured callback successfully.
- The harness reported an authenticated user.
- The access token used `RS256`, contained an expiry, and used the expected
  Auth0 issuer form.
- The `aud` claim was an array containing both the requested Laya development
  API identifier and the tenant's `/userinfo` audience.
- No token, authorization code, cookie, test-user identity, or tenant-specific
  hostname was copied into the repository.

### Shared-infrastructure regression

`apps/api/test/auth.test.ts` now proves that the Worker accepts its configured
audience when it appears inside a provider audience array. The focused
authentication suite passes 24 tests.

Limitations:

- This result proves initial React sign-in and token acquisition only. It does
  not by itself prove refresh, reopen, logout, revocation, or invitation
  enforcement. Worker verification and JWKS behavior are recorded separately
  under AUTH-10 and AUTH-11.

## AUTH-02 Expo sign-in

Result: **Pass**

Date: August 2, 2026

Evidence source: operator-observed results from the disposable EAS development
build on the physical device recorded in Setup

The operator completed Auth0 Universal Login on the physical iPhone. The
native SDK returned to the registered custom-scheme callback, stored the
session in its native credentials manager, and recovered valid credentials
after the app was fully closed and reopened. Safe access-token inspection
showed `RS256`, the expected Auth0 issuer form, an audience array containing
the exact Laya development API identifier, a matching authorized-party claim,
and an expiration. No complete token or personal identity is retained here.

## AUTH-04 Google sign-in

Browser sub-result: **Pass**

Physical-iPhone sub-result: **Pass**

Final matrix result: **Pass with production-credential caveat**

The operator completed Auth0 Universal Login through Google on Chrome from a
physical US connection. Auth0 returned to the registered callback and issued
the expected Laya API access token.

On the physical iPhone, Google sign-in completed in 13.28 seconds without an
error or retry. The session survived a full app termination and reopen, the
harness confirmed that stored credentials were valid, and a forced refresh
produced a later expiration. Logout completed in 6.96 seconds, and the session
remained signed out after another full app termination and reopen.

Limitations:

- This was one development run, not the required three-run US reliability
  sample.
- The provider configuration and cost for production-owned Google OAuth
  credentials remain unverified.

## AUTH-05 Apple sign-in

Browser sub-result: **Pass using Auth0 development credentials**

Physical-iPhone sub-result: **Pass using Auth0 development credentials**

Final matrix result: **Pass with production-credential caveat**

On August 2, 2026, the operator enabled Auth0's built-in Apple social
connection only for the disposable web and native applications. The connection
used Auth0's development credentials: Client ID, client-secret signing key,
Apple Team ID, and Key ID were intentionally left blank. No Apple private key
was created, copied, or stored for this run.

The physical-iPhone Apple sign-in completed through Auth0 Universal Login in
37.11 seconds. Safe access-token inspection showed `RS256`, the expected Auth0
issuer form, an audience array containing the exact Laya development API
identifier, a matching authorized-party claim, and an expiration. The token
was accepted by the isolated Laya Worker with **HTTP 200**.

The disposable React browser harness independently completed Apple sign-in
through the same Universal Login connection. Safe metadata showed `RS256`, the
expected Auth0 issuer form, an audience array containing the exact Laya
development API identifier, an expiration, and a signing-key identifier. No
relay address, complete key identifier, token, or provider user identifier is
retained as evidence.

The Apple session survived a full app termination and reopen, and the native
credentials manager reported valid stored credentials. A forced refresh
produced a later expiration. Logout completed in 1.40 seconds; after Metro was
restarted and the actual application—not merely the Expo development
launcher—was reopened, the application remained signed out.

Auth0 development credentials prove the disposable Universal Login path only.
Production requires Laya-controlled Apple credentials, including an Apple
Services ID, signing key, Team ID, and Key ID, plus the required Apple
Developer Program membership. This production setup remains a documented
implementation requirement rather than an inferred result.

Official references checked August 2, 2026:

- [Auth0 Apple connection overview](https://auth0.com/blog/try-sign-in-with-apple-in-your-auth0-apps-today/)
- [Apple web authentication configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)

## AUTH-03 passwordless email

Browser sub-result: **Pass**

Physical-iPhone sub-result: **Pass**

Final matrix result: **Pass with production-email caveat**

Configuration:

- Email passwordless connection enabled only for the disposable SPA.
- Universal Login authentication profile set to **Identifier First**.
- One-time password length: 6 characters.
- One-time password expiry: 180 seconds.
- Auth0 development email provider and default template.

Observed result:

- The initial attempt under the password-first profile incorrectly presented a
  password field. No password was entered or created.
- After selecting **Identifier First**, the explicit `connection=email` browser
  flow requested an email one-time password.
- The development email arrived in under 10 seconds, in the recipient's spam
  folder.
- The one-time code successfully completed authentication without a password.
- The passwordless session remained authenticated after a full page refresh
  under the rotating-refresh-token configuration.
- The passwordless session remained authenticated after closing the application
  tab and opening the application in a new tab.
- Logout returned to the unauthenticated harness, and the passwordless session
  remained signed out after closing and reopening the application tab.
- In a controlled replay test, Code A completed one login, a second login
  transaction issued Code B, and reusing Code A returned an invalid-code error.
  The unused Code B then completed the second login, proving that the
  transaction was healthy and the consumed code alone was rejected.
- In a controlled expiry test, fresh Code C was held for 195 seconds against
  the configured 180-second lifetime. Auth0 rejected it with **Code is
  invalid**.
- On the physical iPhone, the email code arrived in 6.55 seconds but was routed
  to spam. Total sign-in time was 57.69 seconds with no error or retry.
- The physical-iPhone token had the same safe structure as the successful
  Google result. The passwordless session survived a full app termination and
  reopen, and the credentials manager reported valid stored credentials.
- Physical-iPhone logout completed in 1.20 seconds. The session remained
  signed out after the app was fully closed and reopened.

Limitations:

- Passwordless and Google connections create distinct Auth0 identities even
  when they use the same email address; Laya cannot treat an email address as
  stable domain identity. Invitation and account-linking implications remain
  part of AUTH-13.

## AUTH-06 session restore

Browser sub-result: **Pass**

Physical-iPhone sub-result: **Pass**

Final matrix result: **Pass**

### In-memory baseline

1. The harness used the Auth0 SDK defaults explicitly: in-memory cache and no
   refresh tokens.
2. Initial sign-in succeeded.
3. A full page refresh returned the harness to its unauthenticated state.

This is an expected limitation of an in-memory SPA cache, not yet a provider
failure. Auth0 documentation states that the default cache does not persist
through page refresh and that silent authentication can be affected by
third-party-cookie restrictions. The next controlled run will enable refresh
token rotation and the SDK's documented persistent-cache configuration. The
security tradeoff—browser persistence improves session continuity but increases
the impact of an XSS vulnerability—must remain part of the final decision.

Official references:

- <https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation>
- <https://auth0.com/docs/secure/tokens/refresh-tokens/use-refresh-token-rotation>
- <https://support.auth0.com/center/s/article/Why-is-authentication-lost-after-refreshing-my-SPA>

### Rotating-refresh-token retest

Configuration:

- Auth0 application already had idle and maximum refresh-token expiry enabled.
- Auth0 application already had refresh-token rotation enabled.
- Disposable SDK harness changed to `useRefreshTokens` with
  `cacheLocation="localstorage"`.
- No client secret was present.

Observed result:

- Initial sign-in succeeded.
- The user remained signed in after a full page refresh.
- The user remained signed in after closing the application tab and opening the
  application in a new tab.

Security note:

Persistent browser storage makes session restoration independent of third-party
cookie behavior, but a successful XSS attack could read browser-stored tokens.
The final provider decision must compare this exposure with alternative Auth0
session designs, Clerk's behavior, access-token lifetime, Content Security
Policy, and the cost/availability of a same-site custom authentication domain.

### Physical-iPhone retest

The Google, passwordless-email, and Apple sessions survived a full app
termination and reopen. In each case, the native credentials manager reported
valid stored credentials. This is native secure credential storage behavior,
not the browser `localStorage` design discussed above.

## AUTH-07 refresh and expiry

Result: **Pass**

On 2026-07-29, the disposable custom API's access-token lifetimes were
temporarily reduced from 86,400 seconds (maximum) and 7,200 seconds
(implicit/hybrid) to 300 seconds. The operator signed out and completed a fresh
Google sign-in so the harness received a newly issued five-minute token.

The harness:

1. captured the current token only in transient browser memory;
2. confirmed its safe metadata contained the expected `RS256`, issuer,
   audience, and five-minute expiration;
3. held that exact token until five seconds after `exp`; and
4. sent it to the isolated Laya Worker.

The Worker rejected the expired captured token with **HTTP 401**, so expiry
enforcement passes.

The first SDK replacement-token attempt returned a sanitized **Missing Refresh
Token** error. The application already allowed the `refresh_token` grant, but
the custom API had not enabled **Allow Offline Access**. After enabling that API
setting, the disposable harness made `offline_access` explicit in its
authorization scope. A complete logout and new Google authorization then
displayed Auth0's consent screen and issued the required rotating refresh
token.

The forced-refresh retest:

1. bypassed the access-token cache to obtain a first token;
2. waited two seconds and bypassed the cache again;
3. observed that the second token's safe `exp` value was later than the first;
   and
4. received **HTTP 200** when the isolated Laya Worker verified the second
   token.

The physical-iPhone Apple flow independently produced a later expiration after
a forced native credential refresh. The refreshed Apple access token was
accepted by the same isolated Laya Worker with **HTTP 200**. For the bounded
native revocation run, both API lifetime fields were temporarily set to 300
seconds before a fresh authorization, then restored to 86,400 and 7,200
seconds immediately after the test.

No complete access token, refresh token, authorization code, cookie, subject,
or account identifier was displayed, logged, or retained as evidence.

After the bounded AUTH-09 revocation measurement, the operator restored the API
token-lifetime fields to their recorded 86,400- and 7,200-second values.

Official references rechecked 2026-08-02:

- [Auth0 API settings](https://auth0.com/docs/get-started/apis/api-settings)
- [Auth0 access-token lifetime](https://auth0.com/docs/secure/tokens/access-tokens/update-access-token-lifetime)
- [Auth0 get refresh tokens](https://auth0.com/docs/secure/tokens/refresh-tokens/get-refresh-tokens)
- [Auth0 refresh-token use](https://auth0.com/docs/secure/tokens/refresh-tokens/use-refresh-tokens)

## AUTH-08 browser logout

Browser sub-result: **Pass**

Physical-iPhone sub-result: **Pass**

Final matrix result: **Pass**

Procedure and observations:

1. Begin with the rotating-refresh-token session still authenticated after
   refresh and tab reopen.
2. Select **Sign out** in the disposable harness.
3. Auth0 returns to the registered logout URL.
4. The harness displays its unauthenticated **Sign in with Auth0** state.
5. Close the application tab, open the application in a new tab, and wait for
   SDK initialization.
6. The harness remains in the unauthenticated state.

The old access token's Worker behavior and server-side session revocation are
separate tests.

On the physical iPhone, Google logout completed in 6.96 seconds and
passwordless-email logout completed in 1.20 seconds. Each flow remained signed
out after the app was fully closed and reopened. Apple logout completed in
1.40 seconds and also remained signed out after the actual application was
reopened.

## AUTH-09 server revocation

Result: **Pass with access-token-lifetime caveat**

On 2026-07-29, the isolated harness captured a five-minute Auth0 access token
and confirmed that the Laya Worker initially accepted it with **HTTP 200**. The
operator then opened the active Google-connected disposable user in Auth0 and
revoked **Laya Web Auth Spike** under **Authorized Applications**.

The already-issued access token remained valid until its normal expiry, as
Auth0 documents. The polling harness observed the Worker reject that same token
with **HTTP 401** 243 seconds after capture. The page could still display its
locally cached user name; that presentation state was not treated as proof of
API authorization.

After revocation, a forced SDK refresh failed with the sanitized provider error
**Unknown or invalid refresh token**. This proves that the revoked application
grant could not mint a replacement access token after the captured token
expired.

### Physical-iPhone confirmation

On August 2, 2026, the native Apple session captured a newly refreshed
five-minute access token and received **HTTP 200** from the isolated Laya
Worker. The operator revoked **Laya Mobile Auth Spike** under the Apple test
user's authorized applications. The Worker later rejected that same captured
token with **HTTP 401** 270 seconds after capture, and a forced credential
renewal failed with the sanitized provider error **Unknown or invalid refresh
token**.

The local verifier process was temporarily unavailable during the polling
window. After it was restarted, the still-running harness observed the expired
captured token's **HTTP 401** response. The result proves the same token's
before/after authorization boundary and failed renewal, but it does not claim
uninterrupted two-second sampling or a more precise click-to-enforcement
latency than the token's expiry bound.

Operational consequence: Laya's maximum provider-revocation delay is bounded by
the access-token lifetime. Independent Laya membership revocation remains the
immediate application-level control described by AUTH-14.

If Auth0 is selected, the production client must treat this refresh failure as
an authentication boundary: clear its cached presentation state and return to
sign-in. A stale user name is not API access, but leaving it visible would be
confusing and should not be copied from the disposable harness.

No complete access token, refresh token, cookie, provider user identifier, or
account identifier was displayed, logged, or retained as evidence.

Official reference checked 2026-07-29:

- [Revoke Auth0 refresh tokens](https://auth0.com/docs/secure/tokens/refresh-tokens/revoke-refresh-tokens)

## AUTH-10 JWT verification

Result: **Pass**

On 2026-07-29, the disposable browser harness obtained a fresh Auth0 access
token and sent it directly to an isolated local Wrangler Worker. The Worker
reused Laya's production-path `requireAuth` and `verifyAccessToken`
implementation with the exact development issuer, Laya development API
audience, and Auth0 public JWKS URL. The token received **HTTP 200**.

Only safe metadata was displayed:

- signing algorithm `RS256`;
- the expected Auth0 issuer form;
- an audience array containing the Laya development API identifier and Auth0
  `/userinfo`;
- an expiration timestamp; and
- a shortened signing-key identifier.

The complete token was held only in browser memory for the request. It was not
displayed, copied, logged, or persisted as evidence. Neither deployed Laya
environment was changed.

On August 2, the disposable physical-iPhone harness also sent a live Apple
access token to this isolated Worker and received **HTTP 200**. Safe inspection
confirmed the same required algorithm, issuer, audience, authorized party, and
expiration structure. The later captured-token run received **HTTP 401** after
expiry.

The repository's provider-neutral rejection suite covers invalid signature,
unknown key ID, expiry, issuer, audience, missing claims, future `nbf`,
malformed JWTs, JWKS failures, cache behavior, and bounded unknown-key refresh.
The full API suite passed 78/78 tests after the invitation/membership boundary
tests were added.

## AUTH-11 JWKS rotation safety

Result: **Pass**

The isolated Worker successfully fetched Auth0's real public JWKS and verified
the live token. ADR-138's provider-neutral hardening then supplies the rotation
and abuse guarantees: one forced refresh for a legitimate unknown key, shared
work for concurrent misses, and a five-minute forced-refresh cooldown per JWKS
URL for sequential garbage key IDs.

Automated tests prove successful verification after a simulated rotation,
concurrent fetch sharing, cooldown enforcement/resumption, and cooldown
activation even after a failed forced fetch. Actual tenant signing-key rotation
was not performed because AUTH-18 requires inspection—not an unnecessary
destructive rotation. Auth0 officially exposes current and next keys in JWKS,
which is the shape exercised by the automated rotation test.

Official reference checked 2026-07-29:

- [Auth0 signing-key rotation](https://auth0.com/docs/get-started/tenant-settings/signing-keys/rotate-signing-keys)

## AUTH-13 and AUTH-14 application authorization

Result: **Pass through provider-neutral Laya evidence**

These gates do not depend on an Auth0-specific membership feature. The
[invitation and revocation contract](invitation-revocation.md) defines Auth0 as
the authenticator and Laya membership as the authorization boundary. The
repository test `apps/api/test/auth-membership-boundary.test.ts` proves that:

- a valid provider token without Laya membership receives HTTP 403;
- identity mapping without active membership still receives HTTP 403;
- active membership permits the same token; and
- removing membership denies that still-valid token without changing the
  provider account.

The model keys external identity by `(issuer, subject)`, not email or subject
alone. This is Phase 0B boundary evidence, not a production invitation schema
or route.

## AUTH-17 account recovery

Result: **Pass for the tested browser methods, with operator escalation**

The controlled passwordless tests exercised both ordinary and failure recovery:
a consumed code was rejected, a newly issued code then completed sign-in, and
an expired code was rejected without damaging the account. Google sign-in also
provides a separate provider-owned authentication method for an identity that
has that connection.

Laya does not reset provider credentials. A user who still controls an enabled
provider method starts a new provider-owned sign-in transaction. Loss of the
only provider identity, conflicting same-email Auth0 profiles, or identity
relinking escalates to the Laya operator. The operator may revoke/reissue an
invitation or perform a future audited relink; Laya must never auto-link by
email.

Auth0 documents passwordless as a separate connection and warns that the same
email used through different connections can create distinct user profiles.
That limitation is why the Phase 1 relinking policy remains an explicit
decision.

Official reference checked 2026-07-29:

- [Auth0 passwordless authentication](https://auth0.com/docs/authenticate/passwordless)

## AUTH-18 operations and audit

Result: **Pass**

The supported Essentials-level path must not assume Auth0's Enterprise-only
session-management endpoints. Current official documentation distinguishes:

- dashboard revocation under **User Management > Users > Authorized
  Applications**, which invalidates the user's refresh-token grant for the
  application;
- Enterprise-only Management API endpoints for enumerating and deleting user
  sessions or bulk-managing refresh tokens;
- tenant logs under **Monitoring > Logs**; and
- signing-key inspection/rotation under **Settings > Signing Keys**.

Auth0 also documents that an already-issued access token cannot be revoked.
The live test must therefore measure two independent observations:

1. the captured access token remains usable only until its deliberately short
   expiry; and
2. after the operator revokes the authorized application, the SPA cannot use
   its refresh-token grant to obtain another access token.

The operator located the active Google-connected disposable user and the
authorized Laya application, revoked its grant, and inspected the sanitized
tenant audit timeline. The relevant observations were:

- an **API Operation — Delete a grant by id** event at
  `2026-07-30T01:34:37.165Z`, matching the dashboard revocation;
- a group of **Failed Exchange — Token could not be decoded or is missing in
  DB** events between `2026-07-30T01:39:53.013Z` and
  `2026-07-30T01:42:53.196Z`, matching the bounded window in which the
  disposable SPA attempted to exchange the revoked refresh token; and
- an **API Operation — Update a resource server** event at
  `2026-07-30T01:45:18.293Z`, matching the later restoration of the custom
  API's token-lifetime settings rather than the revocation itself.

The failed exchanges used the expected disposable application label and
occurred during the controlled test window. Their repetition is preserved as
an observation, but the spike did not capture request-correlation data and
therefore does not assign an unsupported cause to every duplicate event.

The operator also confirmed that the development dashboard exposes one signing
key as **currently used** and another as **next in queue**. No key was rotated,
revoked, downloaded, copied, or revealed.

The August 2 physical-iPhone revocation run produced the same operational
trail for the disposable native application:

- two **API Operation — Delete a grant by id** entries appeared in the
  controlled revocation window;
- a **Failed Exchange — Token could not be decoded or is missing in DB** event
  appeared at `2026-08-02T19:19:01.225Z` for the disposable native
  application;
- an **API Operation — Update a resource server** event appeared at
  `2026-08-02T19:19:58.791Z`, matching restoration of the temporary token
  lifetimes; and
- a **Success Logout** event appeared at `2026-08-02T19:20:12.511Z` for the
  Apple connection and disposable native application.

One grant-deletion event corresponds to the explicit dashboard revocation.
The spike did not capture correlation identifiers and therefore does not assign
an unsupported cause to the second entry.

Official references checked 2026-07-29:

- [Revoke refresh tokens](https://auth0.com/docs/secure/tokens/refresh-tokens/revoke-refresh-tokens)
- [Manage user sessions](https://auth0.com/docs/manage-users/sessions/manage-user-sessions-with-auth0-management-api)
- [Incident response using logs](https://auth0.com/docs/secure/security-guidance/incident-response-using-logs)
- [Rotate signing keys](https://auth0.com/docs/get-started/tenant-settings/signing-keys/rotate-signing-keys)

## AUTH-19 production email

Result: **Blocked — production sender and price not selected**

The development tenant's Email passwordless connection warns that Auth0's
built-in email provider is intended only for development/trial use. It uses
Auth0's default sender and templates; configured template customizations do not
take effect without a custom email provider.

The first US browser OTP message arrived in under 10 seconds but was delivered
to spam. Authentication still succeeded, but this is negative deliverability
evidence for the built-in development sender.

This is acceptable for the disposable Phase 0B test only. It does not satisfy
ADR-115's production-grade email requirement. The final Auth0 evaluation must
identify and price the custom provider, verify sender-domain authentication,
exercise delivery to US and Philippine test addresses, and document bounce,
rate-limit, and operator-recovery behavior.

Auth0's official guidance confirms that its built-in email provider is for
testing only, is rate-limited, and is not designed for production reliability.
Custom templates also require an external SMTP provider. Auth0 therefore has a
valid integration path, but Auth0 alone does not determine the production email
vendor or its price. This gate remains blocked rather than being inferred as a
pass.

Official references rechecked 2026-08-02:

- [Auth0 built-in email provider limitations](https://support.auth0.com/center/s/article/Emails-to-Gmail-from-Auth0-never-arrive)
- [Auth0 email templates and external SMTP requirement](https://auth0.com/docs/customize/email/email-templates)

## AUTH-20 cost and limits

Result: **Pass with a required paid production tier**

Pricing was rechecked against Auth0's official pricing and tenant documentation
on 2026-08-02. Laya's expected usage is far below Auth0's user allowance:

| Scenario | Active users | Required Auth0 B2C tier | Provider cost |
| --- | ---: | --- | ---: |
| Expected private use | 10 MAU | Essentials | USD 35/month |
| Growth check | 100 MAU | Essentials | USD 35/month |

The user count alone would fit Auth0 Free, which includes up to 25,000 external
active users, passwordless authentication, and social connections. That is not
the complete Laya requirement, however. ADR-132 requires fully separate
development and production authentication environments. Auth0 recommends a
separate tenant per environment, and its support documentation says the Free
plan permits only one tenant. The pricing page lists separate production and
development environments under Essentials, starting at USD 35/month for up to
500 MAU. Using unrelated accounts to evade the tenant limit would create an
unsupported operational and ownership arrangement and is not accepted as an
architecture option.

The Apple Developer Program fee is a shared external prerequisite for both
candidate providers and is not included in the Auth0 provider cost.

Official references:

- [Auth0 pricing](https://auth0.com/pricing)
- [Auth0 multiple environments](https://auth0.com/docs/get-started/auth0-overview/create-tenants/set-up-multiple-environments)
- [Auth0 second tenant on Free](https://support.auth0.com/center/s/article/Second-Tenant-on-a-Free-Plan)
