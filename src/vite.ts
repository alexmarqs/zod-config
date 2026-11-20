import { resolve } from "node:path";
import { type Plugin, loadEnv } from "vite";
import { type EnvSchemaInput, loadEnvConfigWithPrefix } from "./lib/env/load-env-config";

/**
 * The options of `loadEnvConfig` without `runtimeEnv`, as returned by `defineEnvConfig`, so that
 * both `loadEnvConfig` and the plugin can use it.
 */
export type ZodConfigEnvOptions = EnvSchemaInput & {
  /**
   * Prefix of the browser-accessible variables, e.g. `VITE_`. Required when `client` has keys.
   */
  clientPrefix?: string;
};

/**
 * Vite plugin that validates the environment when `vite dev` or `vite build` starts, so a
 * missing or invalid variable stops the command instead of reaching the browser.
 *
 * Values are read the way Vite reads them: the `.env` files of the current mode, then
 * `process.env`. The plugin only validates: it does not change the config or the bundle. It does
 * nothing when Vitest reads the config.
 */
export const zodConfigEnv = (options: ZodConfigEnvOptions): Plugin => ({
  name: "zod-config:env",
  config(config, { mode }) {
    // Vitest reads the same config. The plugin is for `vite dev` and `vite build`: a test run
    // should not need every variable, and tests that import the env file still validate it.
    if (process.env.VITEST) {
      return;
    }

    const root = resolve(config.root ?? ".");
    // `envDir: false` turns `.env` files off (Vite 7+); the empty-prefix `loadEnv` call returns
    // the `.env` values with `process.env` on top.
    const runtimeEnv =
      config.envDir === false
        ? process.env
        : loadEnv(mode, resolve(root, config.envDir ?? "."), "");

    loadEnvConfigWithPrefix(options?.clientPrefix, { ...options, runtimeEnv, isServer: true });
  },
});
