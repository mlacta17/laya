# Auth0 spike results

Status: **In progress**

Environment: **Development-only US tenant**

Production suitability: **Not decided**

No tenant secret, complete token, personal identity, tenant-specific hostname,
or provider user identifier is recorded here.

## Setup

| Field | Value |
| --- | --- |
| Browser application | Single Page Application |
| Disposable harness | React 19.2.8, Vite 6.4.3, `@auth0/auth0-react` 2.22.0 |
| Callback URL | `http://localhost:5173` |
| Logout URL | `http://localhost:5173` |
| Web origin | `http://localhost:5173` |
| API identifier | `https://laya-api-dev.lactao-maria04.workers.dev` |
| API JWT profile | Auth0 |
| Signing algorithm | RS256 |
| Physical test location | United States |
| Browser/version | Google Chrome 150.0.7871.182, official 64-bit build |

The disposable harness lives outside the repository in the operator's local
temporary directory. Its typecheck and production build passed before the first
interactive test. Its configuration contains public development Domain and
Client ID values and no client secret.

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
  not yet prove refresh, reopen, logout, revocation, invitation enforcement, or
  Worker verification against Auth0's live JWKS.

## AUTH-04 Google sign-in

Browser sub-result: **Pass**

Final matrix result: **Not run — Expo and production-owned credentials pending**

The operator completed Auth0 Universal Login through Google on Chrome from a
physical US connection. Auth0 returned to the registered callback and issued
the expected Laya API access token.

Limitations:

- This was one development run, not the required three-run US reliability
  sample.
- Expo Google sign-in remains untested.
- The provider configuration and cost for production-owned Google OAuth
  credentials remain unverified.

## AUTH-03 passwordless email

Browser sub-result: **Pass**

Final matrix result: **Not run — Expo and remaining OTP behavior pending**

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

Limitations:

- Expo passwordless behavior remains untested.
- Passwordless and Google connections create distinct Auth0 identities even
  when they use the same email address; Laya cannot treat an email address as
  stable domain identity. Invitation and account-linking implications remain
  part of AUTH-13.

## AUTH-06 session restore

Browser sub-result: **Pass**

Final matrix result: **Not run — Expo test pending**

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

## AUTH-08 browser logout

Browser sub-result: **Pass**

Final matrix result: **Not run — Expo test pending**

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

Official references checked 2026-07-29:

- [Auth0 built-in email provider limitations](https://support.auth0.com/center/s/article/Emails-to-Gmail-from-Auth0-never-arrive)
- [Auth0 email templates and external SMTP requirement](https://auth0.com/docs/customize/email/email-templates)

## AUTH-20 cost and limits

Result: **Pass with a required paid production tier**

Pricing was checked against Auth0's official pricing and tenant documentation
on 2026-07-28. Laya's expected usage is far below Auth0's user allowance:

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
