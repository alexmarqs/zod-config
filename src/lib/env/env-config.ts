import { type LoadEnvConfigInput, loadEnvConfigWithPrefix } from "./load-env-config";
import type { BaseEnvConfigOptions, EnvConfigOutput, FieldSchema, StrictRuntimeEnv } from "./types";

/**
 * Options for the framework-agnostic `loadEnvConfig`.
 */
export type EnvConfigOptions<
  TPrefix extends string,
  TServer extends Record<string, FieldSchema>,
  TClient extends Record<string, FieldSchema>,
  TShared extends Record<string, FieldSchema> = Record<never, never>,
> = BaseEnvConfigOptions<TPrefix, TServer, TClient, TShared> &
  (keyof TClient extends never
    ? {
        /**
         * Prefix your framework uses for browser-accessible variables, e.g. `VITE_` or `PUBLIC_`.
         * Only needed when `client` has keys.
         */
        clientPrefix?: TPrefix;
      }
    : {
        /**
         * Prefix your framework uses for browser-accessible variables, e.g. `VITE_` or `PUBLIC_`.
         */
        clientPrefix: TPrefix;
      }) &
  ([keyof TClient | keyof TShared] extends [never]
    ? {
        /**
         * Optional without `client` or `shared` keys. On the server, `server` keys found here
         * take priority over `process.env`.
         */
        runtimeEnv?: Record<string, unknown>;
        /**
         * Has no effect without `client` or `shared` keys.
         */
        strict?: boolean;
      }
    :
        | {
            /**
             * Object holding the values at runtime, e.g. `import.meta.env`. Only declared keys
             * are read from it, and `server` keys only on the server.
             */
            runtimeEnv: Record<string, unknown>;
            /**
             * Type-check that `runtimeEnv` lists every declared key (and, when written inline,
             * no undeclared key). For bundlers that only inline variables written out in full,
             * such as `process.env.EXPO_PUBLIC_NAME`. Type-level only. Defaults to `false`.
             */
            strict?: false;
          }
        | {
            /**
             * One entry per declared key, `server`, `client` and `shared`.
             */
            runtimeEnv: StrictRuntimeEnv<TServer, TClient, TShared>;
            /**
             * Type-check that `runtimeEnv` lists every declared key (and, when written inline,
             * no undeclared key). For bundlers that only inline variables written out in full,
             * such as `process.env.EXPO_PUBLIC_NAME`. Type-level only. Defaults to `false`.
             */
            strict: true;
          });

/**
 * Synchronously load and validate environment variables for an app with a browser bundle
 * (Vite, Astro, ...), with separate server and client schemas.
 *
 * - `server` variables are read from `runtimeEnv` first, then `process.env`, on the server only.
 * - `client` variables must start with `clientPrefix` and are read from `runtimeEnv`.
 * - `shared` variables (e.g. `NODE_ENV`) are read on both sides, from `runtimeEnv` in the browser.
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
  TShared extends Record<string, FieldSchema> = Record<never, never>,
>(
  options: EnvConfigOptions<TPrefix, TServer, TClient, TShared>,
): EnvConfigOutput<TServer, TClient, TShared> => {
  return loadEnvConfigWithPrefix(
    options?.clientPrefix,
    options as LoadEnvConfigInput,
  ) as EnvConfigOutput<TServer, TClient, TShared>;
};
