import { type LoadEnvConfigInput, loadEnvConfigWithPrefix } from "./lib/env/load-env-config";
import type {
  BaseEnvConfigOptions,
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
