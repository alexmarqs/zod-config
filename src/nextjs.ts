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
  TShared extends Record<string, FieldSchema> = Record<never, never>,
> = BaseEnvConfigOptions<NextPublicPrefix, TServer, TClient, TShared> &
  ([keyof TClient | keyof TShared] extends [never]
    ? {
        /**
         * Optional server values. On the server they take priority over `process.env`.
         */
        runtimeEnv?: ServerRuntimeEnv<TServer>;
      }
    : {
        /**
         * One entry per `client` and `shared` key, written out in full (`process.env.NEXT_PUBLIC_NAME`,
         * `process.env.NODE_ENV`) so Next.js can inline the value into the browser bundle. Server
         * keys are optional: on the server they take priority over `process.env`, which provides
         * any server value not listed here.
         */
        runtimeEnv: ListedRuntimeEnv<TServer, TClient, TShared>;
      });

/**
 * Synchronously load and validate Next.js environment variables.
 *
 * - `server` variables are read from `runtimeEnv` first, then `process.env`, and are only
 *   available on the server.
 * - `client` variables must start with `NEXT_PUBLIC_` and are read from `runtimeEnv`.
 * - `shared` variables (e.g. `NODE_ENV`) are read on both sides, from `runtimeEnv` in the browser.
 * - Reading a server variable in the browser throws.
 *
 * @returns the validated, typed environment
 */
export const loadEnvConfig = <
  TServer extends Record<string, FieldSchema> = Record<never, never>,
  TClient extends Record<string, FieldSchema> = Record<never, never>,
  TShared extends Record<string, FieldSchema> = Record<never, never>,
>(
  options: EnvConfigOptions<TServer, TClient, TShared>,
): EnvConfigOutput<TServer, TClient, TShared> => {
  return loadEnvConfigWithPrefix(
    NEXT_PUBLIC_PREFIX,
    options as LoadEnvConfigInput,
  ) as EnvConfigOutput<TServer, TClient, TShared>;
};
