import { type LoadEnvConfigInput, loadEnvConfigWithPrefix } from "./load-env-config";
import type { BaseEnvConfigOptions, EnvConfigOutput, FieldSchema, ListedRuntimeEnv } from "./types";

/**
 * Options for the framework-agnostic `loadEnvConfig`.
 */
export type EnvConfigOptions<
  TPrefix extends string,
  TServer extends Record<string, FieldSchema>,
  TClient extends Record<string, FieldSchema>,
> = BaseEnvConfigOptions<TPrefix, TServer, TClient> &
  (keyof TClient extends never
    ? {
        /**
         * Prefix your framework uses for browser-accessible variables, e.g. `VITE_` or `PUBLIC_`.
         * Only needed when `client` has keys.
         */
        clientPrefix?: TPrefix;
        /**
         * Optional without `client` keys. On the server, `server` keys found here take priority
         * over `process.env`.
         */
        runtimeEnv?: Record<string, unknown>;
        /**
         * Has no effect without `client` keys.
         */
        strict?: boolean;
      }
    : {
        /**
         * Prefix your framework uses for browser-accessible variables, e.g. `VITE_` or `PUBLIC_`.
         */
        clientPrefix: TPrefix;
      } & (
        | {
            /**
             * Object holding the values at runtime, e.g. `import.meta.env`. Only declared keys
             * are read from it, and `server` keys only on the server.
             */
            runtimeEnv: Record<string, unknown>;
            /**
             * Type-check that `runtimeEnv` lists every `client` key (and no undeclared key), for
             * bundlers that only inline public variables written out in full, such as
             * `process.env.EXPO_PUBLIC_NAME`. Type-level only. Defaults to `false`.
             */
            strict?: false;
          }
        | {
            /**
             * One entry per `client` key; `server` keys are optional.
             */
            runtimeEnv: ListedRuntimeEnv<TServer, TClient>;
            /**
             * Type-check that `runtimeEnv` lists every `client` key (and no undeclared key), for
             * bundlers that only inline public variables written out in full, such as
             * `process.env.EXPO_PUBLIC_NAME`. Type-level only. Defaults to `false`.
             */
            strict: true;
          }
      ));

/**
 * Synchronously load and validate environment variables for an app with a browser bundle
 * (Vite, Astro, ...), with separate server and client schemas.
 *
 * - `server` variables are read from `runtimeEnv` first, then `process.env`, on the server only.
 * - `client` variables must start with `clientPrefix` and are read from `runtimeEnv`.
 * - Reading a server variable in the browser throws.
 *
 * For Next.js use `loadEnvConfig` from `zod-config/nextjs`. For plain environment loading on a
 * server (no browser bundle), use `loadConfig` / `loadConfigSync` with the env adapter instead.
 *
 * @returns the validated, typed environment
 */
export const loadEnvConfig = <
  TPrefix extends string = never,
  TServer extends Record<string, FieldSchema> = Record<never, never>,
  TClient extends Record<string, FieldSchema> = Record<never, never>,
>(
  options: EnvConfigOptions<TPrefix, TServer, TClient>,
): EnvConfigOutput<TServer, TClient> => {
  return loadEnvConfigWithPrefix(
    options?.clientPrefix,
    options as LoadEnvConfigInput,
  ) as EnvConfigOutput<TServer, TClient>;
};
