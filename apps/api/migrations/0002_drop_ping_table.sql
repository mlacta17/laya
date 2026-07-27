-- Migration 0002 — remove the disposable Phase 0A proof table.
--
-- /v1/ping-store existed only to prove that verified authentication context
-- reached D1. Phase 0A passed locally and against both deployed environments;
-- its reusable auth and D1 patterns now live in test-only reference coverage.
-- Migration 0001 remains immutable because it has been applied remotely.

DROP TABLE IF EXISTS ping;
