// ZOD3: remove in next major: the Zod 3 branches of FieldOutput and EnvConfigError.
import type * as z3 from "zod/v3";
import type * as z from "zod/v4/core";
import type { FieldSchema } from "./build-schema";

export type { FieldSchema };

type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Output type of a single variable schema (Zod 3, Zod 4 or Zod 4 Mini).
 */
type FieldOutput<F> = F extends z3.ZodType<infer O, any, any>
  ? O
  : F extends z.$ZodType
    ? z.output<F>
    : never;

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
export type BaseEnvConfigOptions<TPrefix extends string, TServer, TClient> = {
  /**
   * Server-only variables, read from `runtimeEnv` first, then `process.env`.
   */
  server?: TServer & ServerShape<TServer, TPrefix>;
  /**
   * Browser-accessible variables, read from `runtimeEnv`.
   */
  client?: TClient & ClientShape<TClient, TPrefix>;
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
export type EnvConfigOutput<TServer, TClient> = Simplify<
  Readonly<
    { [K in keyof TServer]: FieldOutput<TServer[K]> } & {
      [K in keyof TClient]: FieldOutput<TClient[K]>;
    }
  >
>;
