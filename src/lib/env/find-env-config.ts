import type { EnvSchemaInput } from "./load-env-config";

const ENV_CONFIG_FILES = ["env.config.ts", "env.config.mts", "env.config.js", "env.config.mjs"];

/**
 * Paths where `env.config.*` is looked up, in order: `src/` first, then the project root.
 * Takes `join` as an argument so this module stays free of Node imports (`zod-config/nextjs`
 * is also bundled for the browser).
 */
export const envConfigCandidates = (root: string, join: (...parts: string[]) => string) =>
  ["src", ""].flatMap((dir) => ENV_CONFIG_FILES.map((file) => join(root, dir, file)));

/**
 * The definition exported by a loaded `env.config.*` module: its default export, or a named
 * `envConfig` export.
 */
export const pickEnvConfig = (
  module: { default?: unknown; envConfig?: unknown },
  file: string,
): EnvSchemaInput => {
  const envConfig = module.default ?? module.envConfig;

  if (typeof envConfig !== "object" || envConfig === null) {
    throw new Error(
      `${file} must export the result of defineEnvConfig, as its default export or as "envConfig"`,
    );
  }

  return envConfig as EnvSchemaInput;
};
