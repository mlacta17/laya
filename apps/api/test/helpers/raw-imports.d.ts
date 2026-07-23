// Vitest (via Vite) turns `?raw` imports into plain strings; this teaches
// the typechecker the same thing.
declare module "*.sql?raw" {
  const sql: string;
  export default sql;
}
