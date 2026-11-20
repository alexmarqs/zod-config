import type { EnvSchemaInput } from "./load-env-config";

const ENV_CONFIG_FILES = [
  "env.config.ts",
  "env.config.mts",
  "env.config.cts",
  "env.config.js",
  "env.config.mjs",
  "env.config.cjs",
];

/**
 * Paths where `env.config.*` is looked up, in order: `src/` first, then the project root.
 * Takes `join` as an argument so this module stays free of Node imports (`zod-config/nextjs`
 * is also bundled for the browser).
 */
export const envConfigCandidates = (root: string, join: (...parts: string[]) => string) =>
  ["src", ""].flatMap((dir) => ENV_CONFIG_FILES.map((file) => join(root, dir, file)));

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * The definition exported by a loaded `env.config.*` module: its default export, a named
 * `envConfig` export, or the module itself for CommonJS (`module.exports = defineEnvConfig()`).
 * `caller` and the relative `file` are for the error message.
 */
export const pickEnvConfig = (module: unknown, caller: string, file: string): EnvSchemaInput => {
  const exports = isObject(module) ? module : {};
  const envConfig =
    exports.default ??
    exports.envConfig ??
    ("server" in exports || "client" in exports ? exports : undefined);

  if (!isObject(envConfig)) {
    throw new Error(
      `${caller}: ${file} must export the result of defineEnvConfig, as its default export or as "envConfig"`,
    );
  }

  return envConfig as EnvSchemaInput;
};

/**
 * Error for an `env.config.*` file that threw while loading. Paths under `root` are made
 * relative (with either separator), and the original error is kept as `cause`.
 */
export const envConfigLoadError = (caller: string, file: string, root: string, error: unknown) => {
  let message = error instanceof Error ? error.message : String(error);
  for (const prefix of [`${root}/`, `${root}\\`, `${root.replaceAll("\\", "/")}/`]) {
    message = message.replaceAll(prefix, "");
  }

  const loadError = new Error(`${caller}: could not load ${file}: ${message}`);
  (loadError as { cause?: unknown }).cause = error;

  return loadError;
};
