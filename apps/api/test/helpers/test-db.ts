import { getPlatformProxy } from "wrangler";
import migration0001 from "../../migrations/0001_create_ping_table.sql?raw";
import migration0002 from "../../migrations/0002_drop_ping_table.sql?raw";

// A real local D1 (Miniflare, via Wrangler's getPlatformProxy — no extra
// dependency) with every forward-only migration applied to a clean slate.
// CI independently runs the unmodified files through Wrangler's migration
// command; this helper gives route tests an isolated current-schema database.
//
// New migrations must be imported and appended here in order.
const MIGRATIONS = [migration0001, migration0002];

export async function createTestDb() {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: "wrangler.jsonc",
    persist: false,
  });
  const db = proxy.env.DB;

  // persist:false is isolated, but dropping the Phase 0A probe also makes this
  // helper deterministic if Wrangler's implementation ever reuses a process.
  await db.prepare("DROP TABLE IF EXISTS ping").run();
  for (const migration of MIGRATIONS) {
    // Every migration is currently one statement. The CI migration check owns
    // multi-statement verification through Wrangler's real CLI path.
    await db.prepare(migration).run();
  }

  return { db, dispose: () => proxy.dispose() };
}
