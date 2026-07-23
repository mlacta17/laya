import { useEffect, useState } from "react";
import { healthResponseSchema, type HealthResponse } from "@laya/shared";
import { env } from "./env";

// The Phase 0A health page (brief scope item 6): one unstyled page proving
// the web app can call the API and parse its shared contract. Plain fetch on
// purpose — TanStack Query (§3.2 approved stack) arrives with real data
// fetching, not for a single call. No styling until Phase 3; DESIGN.md owns
// appearance.

type HealthState =
  | { phase: "loading" }
  | { phase: "ok"; health: HealthResponse }
  | { phase: "error"; message: string };

export function App() {
  const [state, setState] = useState<HealthState>({ phase: "loading" });

  useEffect(() => {
    // Abort on unmount so a slow response never updates a dead component
    // (StrictMode double-invokes effects in dev; this keeps that harmless).
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const response = await fetch(new URL("/v1/health", env.VITE_API_URL), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        const health = healthResponseSchema.parse(await response.json());
        setState({ phase: "ok", health });
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    void loadHealth();
    return () => controller.abort();
  }, []);

  if (state.phase === "loading") {
    return <p>Checking API health…</p>;
  }
  if (state.phase === "error") {
    return (
      <main>
        <h1>Laya</h1>
        <p>
          API health check failed: {state.message}. Is the API running? Start
          everything with <code>pnpm dev</code> from the repository root.
        </p>
      </main>
    );
  }
  return (
    <main>
      <h1>Laya</h1>
      <p>
        API status: {state.health.status} · version {state.health.version} ·
        request {state.health.requestId}
      </p>
    </main>
  );
}
