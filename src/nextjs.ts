import { envConfigCandidates, envConfigLoadError, pickEnvConfig } from "./lib/env/find-env-config";
import {
  type EnvSchemaInput,
  type LoadEnvConfigInput,
  defineEnvConfigInput,
  loadEnvConfigWithPrefix,
} from "./lib/env/load-env-config";
import type {
  BaseEnvConfigOptions,
  EnvConfigDefinition,
  EnvConfigDefinitionInput,
  EnvConfigOutput,
  FieldSchema,
  ListedRuntimeEnv,
  ServerRuntimeEnv,
} from "./lib/env/types";

export type { EnvConfigError, EnvConfigOutput } from "./lib/env/types";

const NEXT_PUBLIC_PREFIX = "NEXT_PUBLIC_";
type NextPublicPrefix = typeof NEXT_PUBLIC_PREFIX;

/**
 * Options for the Next.js `loadEnvConfig`.
 */
export type EnvConfigOptions<
  TServer extends Record<string, FieldSchema>,
  TClient extends Record<string, FieldSchema>,
> = BaseEnvConfigOptions<NextPublicPrefix, TServer, TClient> &
  (keyof TClient extends never
    ? {
        /**
         * Optional server values. On the server they take priority over `process.env`.
         */
        runtimeEnv?: ServerRuntimeEnv<TServer>;
      }
    : {
        /**
         * One entry per `client` key, written as `process.env.NEXT_PUBLIC_NAME` so Next.js can
         * inline the value into the browser bundle. Server keys are optional: on the server they
         * take priority over `process.env`, which provides any server value not listed here.
         */
        runtimeEnv: ListedRuntimeEnv<TServer, TClient>;
      });

/**
 * Synchronously load and validate Next.js environment variables.
 *
 * - `server` variables are read from `runtimeEnv` first, then `process.env`, and are only
 *   available on the server.
 * - `client` variables must start with `NEXT_PUBLIC_` and are read from `runtimeEnv`.
 * - Reading a server variable in the browser throws.
 *
 * @returns the validated, typed environment
 */
export const loadEnvConfig = <
  TServer extends Record<string, FieldSchema> = Record<never, never>,
  TClient extends Record<string, FieldSchema> = Record<never, never>,
>(
  options: EnvConfigOptions<TServer, TClient>,
): EnvConfigOutput<TServer, TClient> => {
  return loadEnvConfigWithPrefix(
    NEXT_PUBLIC_PREFIX,
    options as LoadEnvConfigInput,
  ) as EnvConfigOutput<TServer, TClient>;
};

/**
 * Describe the environment once, in its own file, to share it between `loadEnvConfig` and
 * `withZodConfigEnv`. It only checks the types and returns the definition: nothing is read or
 * validated here.
 */
export const defineEnvConfig = <
  TServer extends Record<string, FieldSchema> = Record<never, never>,
  TClient extends Record<string, FieldSchema> = Record<never, never>,
>(
  definition: EnvConfigDefinitionInput<NextPublicPrefix, TServer, TClient>,
): EnvConfigDefinition<TServer, TClient> => {
  return defineEnvConfigInput(definition as EnvSchemaInput) as EnvConfigDefinition<
    TServer,
    TClient
  >;
};

/**
 * The options of `loadEnvConfig` without `runtimeEnv`, as returned by `defineEnvConfig`, so that
 * both `loadEnvConfig` and `withZodConfigEnv` can use it.
 */
export type ZodConfigEnvOptions = EnvSchemaInput;

const WRAPPER_CALL = "withZodConfigEnv(nextConfig, envConfig)";

// Alternative considered: `jiti`, which reads tsconfig paths and works on any Node version, but
// is a 1.7 MB dependency.
// Loads `env.config.*` from `src/` or the project root. Node modules are reached through
// `process.getBuiltinModule` because this entry is also bundled for the browser. The `.ts` file
// is loaded by Next.js's config loader or by Node's type stripping.
const requireEnvConfig = (): ZodConfigEnvOptions => {
  const getBuiltinModule = (process as { getBuiltinModule?: (id: string) => unknown } | undefined)
    ?.getBuiltinModule;

  if (!getBuiltinModule) {
    throw new Error(
      `withZodConfigEnv: finding env.config.ts needs Node.js 20.16 or later. Import the definition and pass it instead, which works on any version: ${WRAPPER_CALL}`,
    );
  }

  const fs = getBuiltinModule("node:fs") as typeof import("node:fs");
  const path = getBuiltinModule("node:path") as typeof import("node:path");
  const { createRequire } = getBuiltinModule("node:module") as typeof import("node:module");

  const root = process.cwd();
  const file = envConfigCandidates(root, path.join).find((candidate) => fs.existsSync(candidate));

  if (!file) {
    throw new Error(
      `withZodConfigEnv: no env.config.ts in src/ or the project root. Create it there, or import the definition and pass it: ${WRAPPER_CALL}`,
    );
  }

  let module: unknown;
  try {
    module = createRequire(path.join(root, "noop.js"))(file);
  } catch (error) {
    throw envConfigLoadError("withZodConfigEnv", path.relative(root, file), root, error);
  }

  return pickEnvConfig(module, "withZodConfigEnv", path.relative(root, file));
};

/**
 * Wraps the Next.js config to validate the environment when `next dev`, `next build` or
 * `next start` reads `next.config.ts`, before any page runs.
 *
 * Without `envConfig` it loads the definition from `env.config.ts` in `src/` or the project
 * root. Pass the definition to use another file.
 *
 * Values are read from `process.env`, which Next.js has already filled from the `.env` files.
 * The config is returned unchanged.
 */
export const withZodConfigEnv = <TNextConfig>(
  nextConfig: TNextConfig,
  envConfig?: ZodConfigEnvOptions,
): TNextConfig => {
  loadEnvConfigWithPrefix(NEXT_PUBLIC_PREFIX, {
    ...(envConfig ?? requireEnvConfig()),
    runtimeEnv: process.env,
    isServer: true,
  });

  return nextConfig;
};
