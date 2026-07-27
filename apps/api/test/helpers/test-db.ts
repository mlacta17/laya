import { getPlatformProxy } from "wrangler";
import migration0001 from "../../migrations/0001_create_ping_table.sql?raw";
import migration0002 from "../../migrations/0002_drop_ping_table.sql?raw";

// A real local D1 (Miniflare, via Wrangler's getPlatformProxy — no extra
// dependency) with every forward-only migration applied to a clean slate.
// CI independently runs the unmodified files through Wrangler's migration
// command; this helper gives route tests an isolated current-schema database.
//
// New migrations must be imported and appended here in order. Each entry
// pairs the filename with its imported SQL so createTestDb can compare the
// list against the migrations/ directory — a forgotten entry fails loudly
// instead of silently running route tests against a stale schema.
const MIGRATIONS = [
  { file: "0001_create_ping_table.sql", sql: migration0001 },
  { file: "0002_drop_ping_table.sql", sql: migration0002 },
];

// Vite resolves this glob against the real migrations/ directory when the
// test bundle is transformed, so the keys are always the current directory
// listing — no filesystem access (or Node type dependency) required.
// Sorting also enforces that MIGRATIONS stays in numeric order.
const MIGRATION_FILES_ON_DISK = Object.keys(
  import.meta.glob("../../migrations/*.sql"),
)
  .map((path) => path.slice(path.lastIndexOf("/") + 1))
  .sort();

function assertMigrationsInSync() {
  const imported = MIGRATIONS.map((migration) => migration.file);
  if (JSON.stringify(MIGRATION_FILES_ON_DISK) !== JSON.stringify(imported)) {
    throw new Error(
      "test/helpers/test-db.ts MIGRATIONS is out of sync with " +
        `apps/api/migrations/ — on disk: [${MIGRATION_FILES_ON_DISK.join(", ")}], ` +
        `imported: [${imported.join(", ")}]. Import the missing migration ` +
        "and append it to MIGRATIONS in order.",
    );
  }
}

export async function createTestDb() {
  assertMigrationsInSync();
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
    await db.prepare(migration.sql).run();
  }

  return { db, dispose: () => proxy.dispose() };
}
