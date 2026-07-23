# dev/

Dev-only tooling that never ships in the Worker bundle: the committed mock-issuer key fixture (§3.4 deterministic fixtures) and a token-minting script.
Production can never trust these keys — its env validation rejects `MOCK_JWKS` and it has no issuer until Phase 0B (ADR-132/134).
Mint a token with `pnpm --filter @laya/api mint-token [subject] [ttl-seconds]`.
