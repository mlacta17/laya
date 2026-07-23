import { getPlatformProxy } from "wrangler";
import migration0001 from "../../migrations/0001_create_ping_table.sql?raw";

// A real local D1 (miniflare, via wrangler's getPlatformProxy — no extra
// dependency) with the migrations applied to a clean slate. This also proves
// migration 0001 applies to a fresh database, which the brief's acceptance
// checks require. Phase 0A CI will additionally run Wrangler's migration
// command through the real CLI path.
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
  // migration. The real Wrangler CLI independently applies the unmodified
  // files in CI; this in-process database gives route tests an isolated D1.
  await db.prepare("DROP TABLE IF EXISTS ping").run();
  for (const migration of MIGRATIONS) {
    // Migration 0001 is one SQL statement. prepare() preserves its formatting,
    // comments and literals; the future CI migration check remains responsible
    // for proving multi-statement files through Wrangler's real CLI path.
    await db.prepare(migration).run();
  }

  return { db, dispose: () => proxy.dispose() };
}
