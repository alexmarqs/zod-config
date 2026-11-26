import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type Alias, loadEnv, type Plugin } from "vite";
import { loadEnvFile } from "./lib/env/load-env-file";

export type ZodConfigEnvOptions = {
  /** Path of the env file, from the Vite root. Defaults to `env.ts` in `src/`, then the root. */
  file?: string;
};

// Vite's string aliases for jiti: first match wins, and root-relative paths (`"/src"`) are resolved.
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
 * Validates the environment when `vite dev` or `vite build` starts, by running the env file with
 * jiti. Does not change the config or the bundle, and does nothing under Vitest or `vite preview`.
 */
export const zodConfigEnv = (options: ZodConfigEnvOptions = {}): Plugin => {
  let envFile: string | undefined;
  let isPreview = false;

  return {
    name: "zod-config:env",
    config(_config, env) {
      isPreview = env.isPreview === true;
    },
    // Resolved config: root, envDir, mode and PROD as Vite settled them.
    configResolved(config) {
      if (process.env.VITEST || isPreview) {
        return;
      }

      // All `.env` values (empty prefix), with `process.env` on top.
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
          // Becomes `import.meta.env`, with Vite's MODE, DEV, PROD and BASE_URL.
          env: { ...values, ...config.env, SSR: true },
        },
      );
    },
    // Vite only restarts for its config's imports and `.env`, so watch the env file too.
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
