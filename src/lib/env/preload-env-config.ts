import { $ZodObject, $ZodUnknown } from "zod/v4/core";
import type { Adapter, SchemaConfig, SyncAdapter } from "../../types";
import { loadConfig } from "../config";

export type PreloadEnvConfigOptions = {
  /**
   * Returns the adapters to read. It is a function so that adapter modules (and SDKs such as the
   * AWS SDK) are only loaded when the preload actually runs.
   */
  adapters: () => Array<Adapter | SyncAdapter> | Promise<Array<Adapter | SyncAdapter>>;
  /**
   * Whether to load. Defaults to `process.env.NODE_ENV === "production"`.
   */
  enabled?: boolean;
};

// Looked up inside the function (not at module level) so bundlers can drop this module from
// client bundles that only use `loadEnvConfig`.
const getStateKey = () => Symbol.for("zod-config.nextjs.preload");

const preload = async (options: PreloadEnvConfigOptions) => {
  const adapters = await options.adapters();

  if (!adapters || adapters.length === 0) {
    return;
  }

  // Accept any keys: validation happens later, in `loadEnvConfig`.
  const schema = new $ZodObject({
    type: "object",
    shape: {},
    catchall: new $ZodUnknown({ type: "unknown" }),
  }) as unknown as SchemaConfig;

  const data = (await loadConfig({ schema, adapters })) as Record<string, unknown>;

  for (const [key, value] of Object.entries(data)) {
    // Variables that are already set (by the platform or a .env file) always win. An empty
    // value counts as not set, as it does in `loadEnvConfig`.
    if (process.env[key] !== undefined && process.env[key] !== "") {
      continue;
    }

    // process.env only holds flat string values.
    if (typeof value === "string") {
      process.env[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      process.env[key] = String(value);
    }
  }
};

/**
 * Read zod-config adapters once, when the server starts, and copy their values into
 * `process.env`, so that `loadEnvConfig` can validate them like any other variable.
 *
 * Call it from `register()` in Next.js `instrumentation.ts`.
 *
 * - Runs only when `enabled` (default: production) and only on the Node.js runtime.
 * - Runs at most once per process.
 * - Never overwrites a variable that is already set.
 */
export const preloadEnvConfig = (options: PreloadEnvConfigOptions): Promise<void> => {
  if (typeof process === "undefined") {
    return Promise.resolve();
  }

  const enabled = options.enabled ?? process.env.NODE_ENV === "production";

  if (!enabled) {
    return Promise.resolve();
  }

  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return Promise.resolve();
  }

  const STATE_KEY = getStateKey();
  const state = globalThis as { [key: symbol]: Promise<void> | undefined };

  if (!state[STATE_KEY]) {
    state[STATE_KEY] = preload(options).catch((error) => {
      // If the `adapters` function itself fails, nothing is remembered and the next call tries
      // again. A failing adapter read is different: `loadConfig` logs a warning and carries on.
      delete state[STATE_KEY];
      throw error;
    });
  }

  return state[STATE_KEY] as Promise<void>;
};
