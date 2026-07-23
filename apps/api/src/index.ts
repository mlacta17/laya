import { env } from "cloudflare:workers";
import { createApp } from "./app";
import { validateEnv } from "./env";

// Validate once when the Worker module starts. A missing or malformed binding
// prevents the isolate from serving requests instead of surfacing later as
// repeated authentication failures.
const config = validateEnv(env);

export default createApp(() => config);
