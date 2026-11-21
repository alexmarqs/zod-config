import { relative, resolve } from "node:path";
import { type AliasOptions, type Plugin, loadEnv } from "vite";
import { loadEnvFile } from "./lib/env/load-env-file";

/**
 * Options for the `zodConfigEnv` plugin.
 */
export type ZodConfigEnvOptions = {
  /**
   * Path of the env file, from the Vite root. Defaults to `env.ts` (or `.js`, `.mjs`, …) in
   * `src/`, then in the root.
   */
  file?: string;
};

// String aliases from the Vite config (`resolve.alias`, object or array form), so they also work
// in the env file. Regular-expression aliases are skipped.
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
 * It finds the env file (the one that calls `loadEnvConfig`) and runs it with `jiti` (install it
 * as a dev dependency). While the file runs, `import.meta.env` holds what Vite would read: the
 * `.env` files of the current mode, then `process.env`, plus `MODE`, `DEV` and `PROD`.
 *
 * The plugin only validates: it does not change the config or the bundle. It does nothing when
 * Vitest reads the config.
 */
export const zodConfigEnv = (options: ZodConfigEnvOptions = {}): Plugin => {
  // Vite only restarts for files imported by its config, so the dev server watches the env file
  // and restarts on a change, the way it does for `.env` files.
  let envFile: string | undefined;

  return {
    name: "zod-config:env",
    config(config, { mode, command }) {
      // Vitest reads the same config. The plugin is for `vite dev` and `vite build`: a test run
      // should not need every variable, and tests that import the env file still validate it.
      if (process.env.VITEST) {
        return;
      }

      const root = resolve(config.root ?? ".");
      // `envDir: false` turns `.env` files off (Vite 7+); the empty-prefix `loadEnv` call returns
      // the `.env` values with `process.env` on top.
      const values =
        config.envDir === false
          ? process.env
          : loadEnv(mode, resolve(root, config.envDir ?? "."), "");

      envFile = loadEnvFile(
        root,
        { name: "zodConfigEnv", withoutJiti: "Install it (npm i -D jiti)" },
        {
          file: options.file,
          alias: stringAliases(config.resolve?.alias),
          env: { ...values, MODE: mode, DEV: command === "serve", PROD: command === "build" },
        },
      );
    },
    configureServer(server) {
      const file = envFile;
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
