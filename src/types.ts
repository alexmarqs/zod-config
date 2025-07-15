import type * as z3 from "zod/v3";
import type * as z from "zod/v4/core";

/*
  This is a type that represents the schema of the config.
  It can be a zod v3 schema or a zod v4 schema.
*/
export type SchemaConfig = z3.AnyZodObject | z.$ZodType<Record<string, unknown>>;

/*
  This is a type that represents the shape of the config.
  It can be a zod v3 shape or a zod v4 shape.
*/
export type ShapeConfig = z3.ZodRawShape | z.$ZodShape;

/*
  Helper type for Zod v4 output inference that avoids infinite recursion.
*/
type ZodV4Output<T> = T extends z.$ZodType<any> ? z.infer<T> : never;

/*
  This is a type that represents the data of the config.
  It can be a zod v3 data or a zod v4 data.
*/
export type InferredDataConfig<S extends SchemaConfig> = S extends z3.ZodType<infer T>
  ? T
  : ZodV4Output<S>;

/*
  This is a type that represents the error of the config.
  It can be a zod v3 error or a zod v4 error.
*/
export type InferredErrorConfig<S extends SchemaConfig> = S extends z3.ZodType<infer T>
  ? z3.ZodError<T>
  : S extends z.$ZodType<infer U>
    ? z.$ZodError<U>
    : never;

/*
  Base adapter type
*/
type BaseAdapter = {
  /**
   * Name of the adapter
   */
  name: string;

  /**
   * Separator to use for creating nested objects from flat keys (e.g., "." or "_")
   * When provided, keys like "database.host" or "database_host" will be converted to { database: { host: value } }
   * Only top-level keys get split, nested keys are not affected.
   */
  nestingSeparator?: string;
} & SharedConfigOptions;

/**
 * Adapter type
 */
export type Adapter<D extends SchemaConfig = SchemaConfig> = BaseAdapter & {
  /**
   * Read the config
   */
  read: () => Promise<InferredDataConfig<D>>;
};

/**
 * Synchronous adapter type
 */
export type SyncAdapter<D extends SchemaConfig = SchemaConfig> = BaseAdapter & {
  /**
   * Read the config
   */
  read: () => InferredDataConfig<D>;
};

export type BaseConfig<S extends SchemaConfig = SchemaConfig> = {
  /**
   * Schema to validate the config against
   */
  schema: S;
  /**
   * Function to call on success
   */
  onSuccess?: (data: InferredDataConfig<S>) => void;
  /**
   * Function to call on error
   */
  onError?: (error: InferredErrorConfig<S>) => void;
  /**
   * Logger to use
   */
  logger?: Logger;
} & SharedConfigOptions;

/**
 * Config type
 */
export type Config<S extends SchemaConfig = SchemaConfig> = BaseConfig<S> & {
  /**
   * Adapters to use
   */
  adapters?: Array<Adapter | SyncAdapter> | Adapter | SyncAdapter;
};

/**
 * Synchronous config type
 */
export type SyncConfig<S extends SchemaConfig = SchemaConfig> = BaseConfig<S> & {
  /**
   * Adapters to use
   */
  adapters?: Array<SyncAdapter> | SyncAdapter;
};

/**
 * Logger type
 */
export type Logger = {
  /**
   * Log a warning
   */
  warn: (message: string) => void;
};

/**
 * Base adapter props
 */
export type BaseAdapterProps = {
  /**
   * Regular expression to match keys to be processed.
   */
  regex?: RegExp;
} & SharedConfigOptions;

/**
 * Shared config options between global config and adapter config
 */
export type SharedConfigOptions = {
  /**
   * Whether to suppress errors
   */
  silent?: boolean;
  /**
   * How to handle casing differences.
   */
  keyMatching?: KeyMatching;

  /**
   * Function to transform key-value pairs before processing.
   * If the function returns false, the key-value pair will be dropped.
   */
  transform?: Transform;
};

/**
 * Transform type
 */
export type Transform = (obj: { key: string; value: unknown }) =>
  | { key: string; value: unknown }
  | false;

/**
 * Key matching type
 */
export type KeyMatching = "lenient" | "strict";
