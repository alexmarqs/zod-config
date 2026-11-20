import { relative, resolve } from "node:path";
import { type AliasOptions, type Plugin, loadEnv } from "vite";
import { loadEnvConfigFile } from "./lib/env/find-env-config";
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

// String aliases from the Vite config (`resolve.alias`, object or array form), so they also work
// in `env.config.ts`.
// Regular-expression aliases are skipped.
const stringAliases = (alias: AliasOptions | undefined): Record<string, string> => {
  const entries = Array.isArray(alias)
    ? alias.map(({ find, replacement }) => [find, replacement] as const)
    : Object.entries(alias ?? {});

  return Object.fromEntries(entries.filter(([find]) => typeof find === "string"));
};

/**
 * Vite plugin that validates the environment when `vite dev` or `vite build` starts, so a
 * missing or invalid variable stops the command instead of reaching the browser.
 *
 * Without an argument it loads the definition from `env.config.ts` in `src/` or the project
 * root, with `jiti` (install it as a dev dependency). Or pass the definition.
 *
 * Values are read the way Vite reads them: the `.env` files of the current mode, then
 * `process.env`. The plugin only validates: it does not change the config or the bundle. It does
 * nothing when Vitest reads the config.
 */
export const zodConfigEnv = (envConfig?: ZodConfigEnvOptions): Plugin => {
  // The loaded `env.config.*`. Vite only restarts for files imported by its config, so the dev
  // server watches it and restarts on a change, the way it does for `.env` files.
  let envConfigFile: string | undefined;

  return {
    name: "zod-config:env",
    async config(config, { mode }) {
      // Vitest reads the same config. The plugin is for `vite dev` and `vite build`: a test run
      // should not need every variable, and tests that import the env file still validate it.
      if (process.env.VITEST) {
        return;
      }

      const root = resolve(config.root ?? ".");
      let options = envConfig;
      if (!options) {
        ({ options, file: envConfigFile } = loadEnvConfigFile(
          root,
          { name: "zodConfigEnv", call: "zodConfigEnv(envConfig)", install: "npm i -D jiti" },
          stringAliases(config.resolve?.alias),
        ));
      }
      // `envDir: false` turns `.env` files off (Vite 7+); the empty-prefix `loadEnv` call returns
      // the `.env` values with `process.env` on top.
      const runtimeEnv =
        config.envDir === false
          ? process.env
          : loadEnv(mode, resolve(root, config.envDir ?? "."), "");

      loadEnvConfigWithPrefix(options.clientPrefix, { ...options, runtimeEnv, isServer: true });
    },
    configureServer(server) {
      const file = envConfigFile;
      if (!file) {
        return;
      }

      server.watcher.add(file);
      server.watcher.on("change", (changed) => {
        if (resolve(changed) === file) {
          server.config.logger.info(
            `${relative(server.config.root, file)} changed, restarting server...`,
            { timestamp: true },
          );
          void server.restart();
        }
      });
    },
  };
};
