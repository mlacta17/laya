# @laya/shared

Zod schemas shared by `apps/api` and `apps/web`: the error envelope, retryable/terminal error-code classification, and request/response contracts for every `/v1` route.
Ships TypeScript source directly (no build step) — both consumers bundle it themselves.
