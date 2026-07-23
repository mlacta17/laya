import { getPlatformProxy } from "wrangler";
import migration0001 from "../../migrations/0001_create_ping_table.sql?raw";

// A real local D1 (miniflare, via wrangler's getPlatformProxy — no extra
// dependency) with the migrations applied to a clean slate. This also proves
// migration 0001 applies to a fresh database, which the brief's acceptance
// checks require; CI additionally runs `wrangler d1 migrations apply` for
// the real Wrangler path.
//
// New migrations must be imported and appended here in order.
const MIGRATIONS = [migration0001];

export async function createTestDb() {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: "wrangler.jsonc",
    persist: false,
  });
  const db = proxy.env.DB;

  // Clean slate regardless of any leftover local state, then apply every
  // migration exactly as written.
  await db.prepare("DROP TABLE IF EXISTS ping").run();
  for (const migration of MIGRATIONS) {
    for (const statement of splitStatements(migration)) {
      await db.prepare(statement).run();
    }
  }

  return { db, dispose: () => proxy.dispose() };
}

// Our migrations are plain statements separated by ";" with "--" comments.
// Comments are stripped BEFORE splitting so a ";" inside a comment cannot
// cut a statement in half. Limitation, documented on purpose: never put
// "--" or ";" inside a string literal in a migration — keep them simple.
function splitStatements(sql: string): string[] {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
