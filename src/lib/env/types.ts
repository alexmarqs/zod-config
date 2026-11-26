// ZOD3: remove in next major: the Zod 3 branches of FieldOutput and EnvConfigError.
import type * as z3 from "zod/v3";
import type * as z from "zod/v4/core";
import type { FieldSchema } from "./build-schema";

export type { FieldSchema };

type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Output type of a single variable schema (Zod 3, Zod 4 or Zod 4 Mini).
 */
type FieldOutput<F> =
  F extends z3.ZodType<infer O, any, any> ? O : F extends z.$ZodType ? z.output<F> : never;

/**
 * Shape of server-only variables: keys must not start with the public prefix.
 */
export type ServerShape<T, TPrefix extends string> = string extends TPrefix
  ? T
  : {
      [K in keyof T]: K extends `${TPrefix}${string}`
        ? `Server keys must not start with ${TPrefix}`
        : T[K];
    };

/**
 * Shape of browser-accessible variables: keys must start with the public prefix.
 */
export type ClientShape<T, TPrefix extends string> = string extends TPrefix
  ? T
  : {
      [K in keyof T]: K extends `${TPrefix}${string}`
        ? T[K]
        : `Client keys must start with ${TPrefix}`;
    };

/**
 * Validation error thrown by `loadEnvConfig` (Zod 3 or Zod 4).
 */
export type EnvConfigError = z3.ZodError | z.$ZodError;

/**
 * Options shared by every `loadEnvConfig` flavour.
 */
export type BaseEnvConfigOptions<TPrefix extends string, TServer, TClient, TShared> = {
  /**
   * Server-only variables, read from `runtimeEnv` first, then `process.env`.
   */
  server?: TServer & ServerShape<TServer, TPrefix>;
  /**
   * Browser-accessible variables, read from `runtimeEnv`.
   */
  client?: TClient & ClientShape<TClient, TPrefix>;
  /**
   * Variables read on the server and in the browser, without the public prefix, e.g. `NODE_ENV`.
   * In the browser they are read from `runtimeEnv`, so the bundler must provide them there.
   */
  shared?: TShared;
  /**
   * Called with the Zod error on a validation failure. An `Error` listing each invalid variable
   * is always thrown afterwards; throw from `onError` to replace it.
   * Unlike `onError` in `loadConfig`, this does not swallow the failure.
   */
  onError?: (error: EnvConfigError) => void;
  /**
   * Skip validation and return the raw values. Defaults, coercion and transforms are not applied.
   */
  skipValidation?: boolean;
  /**
   * Override server detection. Defaults to `typeof window === "undefined"`.
   */
  isServer?: boolean;
};

/**
 * Typed result of `loadEnvConfig`.
 */
export type EnvConfigOutput<TServer, TClient, TShared = Record<never, never>> = Simplify<
  Readonly<
    { [K in keyof TServer]: FieldOutput<TServer[K]> } & {
      [K in keyof TClient]: FieldOutput<TClient[K]>;
    } & { [K in keyof TShared]: FieldOutput<TShared[K]> }
  >
>;

/**
 * Optional server entries in `runtimeEnv`: explicit values, or values on runtimes without
 * `process.env`.
 */
export type ServerRuntimeEnv<TServer> = {
  [K in Extract<keyof TServer, string>]?: string | undefined;
};

/**
 * A `runtimeEnv` that names every `client` and `shared` key, for bundlers that only inline
 * variables written out in full (e.g. `process.env.NEXT_PUBLIC_NAME`). Server keys are optional,
 * and undeclared keys are rejected (when written inline). Used by `zod-config/nextjs`.
 */
export type ListedRuntimeEnv<TServer, TClient, TShared = Record<never, never>> = {
  [K in Extract<keyof TClient | keyof TShared, string>]: string | undefined;
} & ServerRuntimeEnv<TServer>;

/**
 * A `runtimeEnv` that names every declared key, and rejects undeclared ones (when written
 * inline). Used by `zod-config` with `strict: true`.
 */
export type StrictRuntimeEnv<TServer, TClient, TShared = Record<never, never>> = {
  [K in Extract<keyof TServer | keyof TClient | keyof TShared, string>]: string | undefined;
};
