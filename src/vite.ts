import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type Alias, type Plugin, loadEnv } from "vite";
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

// String aliases from the resolved Vite config, for the env file. Regular-expression aliases are
// skipped. Vite uses the first alias that matches, and accepts replacements relative to its root
// (`"@": "/src"`), so those are turned into file-system paths.
const stringAliases = (aliases: readonly Alias[], root: string): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const { find, replacement } of aliases) {
    if (typeof find !== "string" || find in result) {
      continue;
    }

    const fromRoot = join(root, replacement);
    result[find] = !existsSync(replacement) && existsSync(fromRoot) ? fromRoot : replacement;
  }

  return result;
};

/**
 * Vite plugin that validates the environment when `vite dev` or `vite build` starts, so a
 * missing or invalid variable stops the command instead of reaching the browser.
 *
 * It finds the env file (the one that calls `loadEnvConfig`) and runs it with `jiti` (install it
 * as a dev dependency). While the file runs, `import.meta.env` holds what Vite would read: the
 * `.env` files of the current mode, then `process.env`, plus Vite's own `MODE`, `DEV`, `PROD` and
 * `BASE_URL`. Unlike in the app, variables without the public prefix are included too.
 *
 * The plugin only validates: it does not change the config or the bundle. It does nothing when
 * Vitest reads the config, and for `vite preview`.
 */
export const zodConfigEnv = (options: ZodConfigEnvOptions = {}): Plugin => {
  // Vite only restarts for files imported by its config, so the dev server watches the env file
  // and restarts on a change, the way it does for `.env` files.
  let envFile: string | undefined;
  // `vite preview` only serves the built files: there is nothing to validate.
  let isPreview = false;

  return {
    name: "zod-config:env",
    config(_config, env) {
      isPreview = env.isPreview === true;
    },
    // `configResolved`, not `config`: by then every plugin has changed the config and Vite has
    // settled the root, the env directory, the mode and whether this is a production build.
    configResolved(config) {
      // Vitest reads the same config. The plugin is for `vite dev` and `vite build`: a test run
      // should not need every variable, and tests that import the env file still validate it.
      if (process.env.VITEST || isPreview) {
        return;
      }

      // `envDir: false` turns `.env` files off (Vite 7+); the empty-prefix `loadEnv` call returns
      // the `.env` values with `process.env` on top.
      const values =
        config.envDir === false ? process.env : loadEnv(config.mode, config.envDir, "");

      envFile = loadEnvFile(
        config.root,
        {
          name: "zodConfigEnv",
          withoutJiti: "Install it (npm i -D jiti)",
          aliasSources: 'resolve.alias of the Vite config, or the "paths" of tsconfig.json',
        },
        {
          file: options.file,
          alias: stringAliases(config.resolve.alias, config.root),
          // What the app gets in `import.meta.env`: the values, then Vite's own BASE_URL, MODE,
          // DEV and PROD (which follow NODE_ENV: `NODE_ENV=development vite build` is not PROD).
          env: { ...values, ...config.env, SSR: true },
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
