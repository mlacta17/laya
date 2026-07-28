// Vitest (via Vite) turns `?raw` imports into plain strings; this teaches
// the typechecker the same thing.
declare module "*.sql?raw" {
  const sql: string;
  export default sql;
}

// Vite's import.meta.glob. test-db.ts uses only its KEYS — the directory
// listing Vite resolves at transform time — so the lazy module loaders in
// the values are typed but never called.
interface ImportMeta {
  glob(pattern: string): Record<string, () => Promise<unknown>>;
}
