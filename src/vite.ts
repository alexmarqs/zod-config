import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import * as vite from "vite";
import type { Plugin } from "vite";
import { envConfigCandidates, envConfigLoadError, pickEnvConfig } from "./lib/env/find-env-config";
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

const PLUGIN_CALL = "zodConfigEnv(envConfig)";

// Loads `env.config.*` from `src/` or the root with Vite's module runner (Vite 6.1+), and returns
// the files it was loaded from so the dev server can watch them. The app's `resolve` options are
// passed on, so aliases from the Vite config also work in `env.config.ts`.
// Alternatives considered: `jiti` (works on every Vite version and reads tsconfig paths, but is a
// 1.7 MB dependency) and Node's type stripping (Node 22.18+, no aliases or enums).
const importEnvConfig = async (
  root: string,
  resolveOptions: vite.UserConfig["resolve"],
): Promise<{ options: ZodConfigEnvOptions; files: string[] }> => {
  const file = envConfigCandidates(root, join).find((candidate) => existsSync(candidate));

  if (!file) {
    throw new Error(
      `zodConfigEnv: no env.config.ts in src/ or the project root. Create it there, or import the definition and pass it: ${PLUGIN_CALL}`,
    );
  }

  // Not a named import: `runnerImport` only exists from Vite 6.1.
  const runnerImport = (vite as { runnerImport?: typeof vite.runnerImport }).runnerImport;

  if (!runnerImport) {
    throw new Error(
      `zodConfigEnv: finding env.config.ts needs Vite 6.1 or later. Import the definition and pass it instead, which works on any version: ${PLUGIN_CALL}`,
    );
  }

  let loaded: Awaited<ReturnType<typeof runnerImport<{ default?: unknown; envConfig?: unknown }>>>;
  try {
    loaded = await runnerImport(file, { root, logLevel: "silent", resolve: resolveOptions });
  } catch (error) {
    throw envConfigLoadError("zodConfigEnv", relative(root, file), root, error);
  }

  return {
    options: pickEnvConfig(loaded.module, "zodConfigEnv", relative(root, file)),
    files: [file, ...loaded.dependencies],
  };
};

/**
 * Vite plugin that validates the environment when `vite dev` or `vite build` starts, so a
 * missing or invalid variable stops the command instead of reaching the browser.
 *
 * Without an argument it loads the definition from `env.config.ts` in `src/` or the project
 * root (Vite 6.1+). Pass the definition to use another file or an older Vite.
 *
 * Values are read the way Vite reads them: the `.env` files of the current mode, then
 * `process.env`. The plugin only validates: it does not change the config or the bundle. It does
 * nothing when Vitest reads the config.
 */
export const zodConfigEnv = (envConfig?: ZodConfigEnvOptions): Plugin => {
  // Files of the loaded `env.config.*`. Vite only restarts for files imported by its config, so
  // the dev server watches these and restarts on a change, the way it does for `.env` files.
  let envConfigFiles: string[] = [];

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
        ({ options, files: envConfigFiles } = await importEnvConfig(root, config.resolve));
      }
      // `envDir: false` turns `.env` files off (Vite 7+); the empty-prefix `loadEnv` call returns
      // the `.env` values with `process.env` on top.
      const runtimeEnv =
        config.envDir === false
          ? process.env
          : vite.loadEnv(mode, resolve(root, config.envDir ?? "."), "");

      loadEnvConfigWithPrefix(options.clientPrefix, { ...options, runtimeEnv, isServer: true });
    },
    configureServer(server) {
      if (envConfigFiles.length === 0) {
        return;
      }

      const files = envConfigFiles.map((file) => resolve(file));
      server.watcher.add(files);
      server.watcher.on("change", (file) => {
        if (files.includes(resolve(file))) {
          server.config.logger.info(
            `${relative(server.config.root, file)} changed, restarting server...`,
            {
              timestamp: true,
            },
          );
          void server.restart();
        }
      });
    },
  };
};
