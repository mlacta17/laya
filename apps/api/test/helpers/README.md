# API test helpers

These helpers provide deterministic JWT fixtures, isolated current-schema D1 databases, and the minimal app wiring for test-only routes.
They exist only for tests and must never be imported by the deployed Worker.
Keep shared setup small; behavior-specific fixtures belong beside the test that uses them.
