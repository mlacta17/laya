# Provider-neutral invitation and revocation contract

Status: **Phase 0B evidence — implementation deferred**

This document defines the application boundary from invitation creation through
membership revocation. It intentionally does **not** define the production D1
schema, select an authentication provider, or add production invitation routes.
Those actions remain outside Phase 0B.

Authority:

- `docs/ARCHITECTURE.md` §4.2, §8.1, ADR-125, ADR-127, and ADR-132
- `docs/DESIGN.md` §4, §9, and §13
- `docs/phases/active/PHASE-0B-BRIEF.md`
- The architecture-alignment report in the Laya Research Paper file

## 1. Boundary in one sentence

The managed provider authenticates an external identity; Laya maps the
provider's `(issuer, subject)` pair to an internal profile and authorizes every
business operation through an active internal library membership.

A valid provider token alone never grants access to Laya.

## 2. Non-negotiable invariants

1. Public self-registration does not create a Laya membership.
2. Provider identities are keyed by both issuer and subject. A subject alone is
   not globally unique.
3. Email is used only to prove ownership of an email-bound invitation. Email is
   not a domain identifier and never replaces `(issuer, subject)`.
4. Two provider identities with the same email are not linked automatically.
   Relinking is an explicit, audited operator or recovery action.
5. Invitation tokens are cryptographically random, stored only as one-way
   hashes, expire, allow one acceptance, and may be revoked.
6. The raw invitation token is available only to the delivery path and
   accepting client. It is never written to logs, analytics, audit events, or
   database fields.
7. Invitation acceptance and membership creation are one atomic, retry-safe
   application transition.
8. Every protected request rechecks internal authorization. Provider session
   state is not the Laya authorization boundary.
9. Membership revocation does not require deleting or revoking the provider
   account.
10. Failure responses never reveal the intended invitation email, whether an
    unrelated account exists, or provider identifiers.

## 3. Minimum conceptual records

These are responsibilities, not a proposed table layout. Phase 1 will define
the D1 schema under §4.0 conventions.

| Owner | Record | Minimum responsibility |
| --- | --- | --- |
| Provider | External identity | Issuer, subject, verified email claims, authentication methods |
| Provider | Session | Provider session lifecycle, refresh, logout, and provider-side revocation |
| Laya | Invitation | One-way token hash, intended email, inviter, lifecycle state, expiry, accepted profile, timestamps/version |
| Laya | Profile | Stable person-facing application identity |
| Laya | Auth identity mapping | Provider issuer + subject → exactly one internal profile |
| Laya | Library membership | Profile + library + role + active/revoked state |
| Laya | Idempotency result | Stable result for retry-prone invitation creation/redemption requests |
| Laya | Audit event | Actor, action, target, result, timestamp, request ID; no raw token or sensitive claim |

An implementation may combine responsibilities only if it preserves their
independent lifecycle and audit behavior.

## 4. Member journey: three user surfaces

The following seven system stages must not become seven screens.

### Surface 1 — invitation landing

1. The recipient opens an HTTPS invitation link.
2. Laya performs a non-mutating invitation lookup using a digest derived from
   the presented token.
3. The page explains who invited the recipient, what Laya is, and that the
   invitation expires.
4. The primary action is **Continue**. The product never presents public
   **Create account** as the access model.
5. Invalid public links use a generic unavailable response. They do not reveal
   the intended email or whether a membership already exists.

The final token transport and URL/referrer protections are a Phase 1 security
decision. Whatever mechanism is selected must prevent the raw token from
appearing in server access logs, analytics, browser referrers, or persistent
client storage.

### Surface 2 — provider authentication

1. Laya sends the user through an allowed provider-owned method such as
   passwordless email, Google, or Apple.
2. Recovery stays provider-owned; the Laya operator is the escalation path.
3. The client sends the provider access/session token and invitation token to
   the Laya API over HTTPS.
4. The Worker validates signature, algorithm, issuer, audience, expiry, and
   required claims against the configured provider JWKS.

Successful authentication proves only control of the provider identity.

### Server transition — identity match and one-time redemption

For an authenticated redemption request, the API:

1. validates the request with the future shared Zod contract;
2. hashes the presented invitation token before lookup;
3. verifies that the invitation exists, is active, unexpired, and unused;
4. resolves the provider identity by `(issuer, subject)`;
5. requires a provider-verified email and compares it with the invitation using
   one centrally defined email-matching policy;
6. resolves or creates the internal profile and explicit auth-identity mapping;
7. atomically marks the invitation accepted, creates the library membership,
   records the idempotency result, and appends a sanitized audit event; and
8. returns the same successful result when the client safely retries the same
   completed operation.

The email comparison/canonicalization policy is intentionally unresolved.
Phase 1 must choose and document one policy instead of scattering ad hoc
lowercasing rules across clients and APIs.

### Surface 3 — profile and entry

Only after redemption succeeds:

1. collect display name and optional avatar;
2. collect subtitle, autoplay, and quality/data-saver preferences;
3. keep taste seeding optional and skippable; and
4. enter the authorized library.

Validation, identity mapping, redemption, and audit are server transitions,
not additional navigational screens. A short processing state may appear, but
the user is never told that the page must remain open.

## 5. Invitation creation and operator actions

Invitation creation is a retry-safe operation protected by an
`Idempotency-Key`. The API validates recipient email, role input, expiry bounds,
and operator permission before generating a cryptographically secure token.

The raw token is returned to the delivery path once; only its digest is
retained. Consequently:

- an old invitation link cannot be reconstructed from storage;
- **Copy link** is available only while the raw value is still present in the
  immediate creation/delivery context; and
- later **Resend** or **Copy new link** behavior must rotate/reissue a token
  through an explicitly accepted operation.

Whether a duplicate active invitation returns the existing record, rotates it,
or is rejected is still an open decision. Retry safety does not silently decide
recipient-level deduplication.

The initial role taxonomy and which roles an inviter may grant are also open
decisions. The UX must label them as such until an ADR accepts them.

## 6. Failure and recovery behavior

| Condition | User-facing behavior | Permitted recovery | Must not expose |
| --- | --- | --- | --- |
| Malformed or unknown token | Invitation unavailable | Ask inviter/operator for a new invitation | Intended email, record existence |
| Expired or revoked | Invitation no longer available | Ask for a new invitation | Intended email, internal IDs |
| Already accepted by same profile | Continue to sign-in/library path | Safe status reconciliation | Raw token, audit details |
| Already accepted by another profile | Generic unavailable response | Operator escalation | Accepting identity |
| Wrong provider account/email | Invitation belongs to another verified account | Switch provider account | Intended address |
| Provider identity has no invitation/membership | Invitation required | Present a valid invitation | Other users or libraries |
| Provider unavailable | Sign-in temporarily unavailable | Retry later with invitation context retained safely | Provider internals |
| Redemption result unknown | Checking whether acceptance completed | Close/reopen and reconcile before another mutation | Partial transition details |
| Concurrent redemption | One transition wins; others receive the stored terminal result | Reconcile | Competing actor |

Public and unauthenticated responses are deliberately less specific than
authenticated recovery states. Possession of a token does not authorize
disclosure of another person's identity.

## 7. Authorization after redemption

Every protected request follows this order:

1. authenticate the provider token;
2. map `(issuer, subject)` to an internal profile;
3. load the requested library membership;
4. require active membership and the necessary role;
5. perform the operation using internal profile/library IDs; and
6. record security-relevant mutations in the audit trail.

The Phase 0B test `auth-membership-boundary.test.ts` models this boundary
without creating the production schema:

- a valid provider token with no identity/membership receives HTTP 403;
- an identity mapping without active membership receives HTTP 403;
- the same token receives HTTP 200 after active membership is present; and
- removing membership returns the same still-valid token to HTTP 403.

The existing Worker contract uses HTTP 401 for failed authentication. HTTP 403
for an authenticated identity without application permission is the proposed
Phase 1 convention and must be accepted in the API contract/ADR before
production implementation.

## 8. Revocation sequence

An authorized operator revokes Laya membership through an idempotent,
optimistically concurrent application transition:

1. recheck the operator's own active membership and role;
2. identify the target by internal profile and library IDs;
3. atomically deactivate/revoke the target membership and append an audit event;
4. make subsequent protected API authorization checks fail; and
5. notify connected clients only as a responsiveness optimization, never as
   the enforcement mechanism.

Provider-session revocation is a separate incident-response action. It may be
appropriate after account compromise, but it is not required for ordinary
library removal.

### Enforcement timing

| Surface | Revocation guarantee |
| --- | --- |
| Protected Laya API | Denied on the next request that observes the committed membership revocation |
| New playback/download authorization | Denied on the next request |
| Already-issued Bunny URL | May remain usable until its deliberately short expiry |
| Buffered media | Cannot be recalled byte-for-byte from the client |
| Offline download | Revocation is observed at reconnect or offline-authorization expiry |
| Provider session | Remains valid unless separately revoked by the provider/operator |

The UI must not promise instantaneous interruption of already-buffered media or
a permanently offline device.

## 9. Concurrency, idempotency, and audit requirements

- Invitation creation and redemption use client-generated idempotency keys.
- Mutable invitation and membership operations use monotonic versions or an
  equivalent optimistic-concurrency condition.
- The acceptance transition and its audit/idempotency records commit together
  in one D1 `batch()`.
- Replayed provider webhooks and repeated client requests are no-ops after the
  terminal result has been recorded.
- Audit events contain internal IDs, action, actor, result, request ID, and
  timestamps. They exclude raw tokens, full provider claims, email-code links,
  and secrets.
- Logs distinguish authentication failure, authorization denial, provider
  outage, and concurrency conflict without returning those internals to an
  unauthorized client.

## 10. Acceptance scenarios for Phase 1

Before production invitation integration is accepted, automated tests must
cover:

1. valid identity without invitation is denied;
2. valid invitation with wrong verified account is denied without enumeration;
3. valid invitation redeems exactly once;
4. an unknown client result can be reconciled safely;
5. concurrent redemptions produce one membership;
6. expired and revoked invitations cannot redeem;
7. repeated idempotent creation/redemption returns the original result;
8. membership revocation denies the same still-valid provider token;
9. provider session revocation and Laya membership revocation remain
   independently testable;
10. a revoked member cannot mint new playback/download authorization;
11. audit records contain no raw token or provider credential; and
12. dev identities/configuration cannot authenticate to production.

## 11. Open decisions deliberately not fixed here

The following require an ADR or the Phase 1 domain/API contract:

- authentication provider selection;
- email matching and account-linking/relinking policy;
- invitation token transport and referrer/log protections;
- resend/reissue and duplicate-recipient behavior;
- role taxonomy and inviter grant limits;
- one shared library versus separate friend/family libraries;
- one profile per account versus household profiles;
- exact offline-authorization duration;
- authenticated authorization error code/copy; and
- notification channels and retention.

Until those decisions are accepted, research and UI artifacts must label them
as open rather than presenting them as implemented behavior.
