# auth/

Worker-side JWT verification (§8.1): `requireAuth` guards a route, `verify-token` checks signature/issuer/audience/expiry/subject, `jwks` supplies public keys (inline mock keys in dev, fetched+cached provider JWKS from Phase 0B).
The real provider is a config swap, not a rewrite (ADR-127): only the env vars change.
Every rejection is a 401 with the standard envelope and a structured `auth_rejected` log naming the real reason.
