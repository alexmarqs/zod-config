import type * as z3 from "zod/v3";
import type * as z from "zod/v4/core";

export type SchemaConfig = z3.AnyZodObject | z.$ZodType<Record<string, unknown>>;

export type ShapeConfig = z3.ZodRawShape | z.$ZodShape;

export type DataConfig<S extends SchemaConfig> = S extends z3.ZodType<infer T>
  ? T
  : S extends z.$ZodType<infer U>
    ? U
    : never;

export type ErrorConfig<S extends SchemaConfig> = S extends z3.ZodType<infer T>
  ? z3.ZodError<T>
  : S extends z.$ZodType<infer U>
    ? z.$ZodError<U>
    : never;

/**
 * Adapter type
 */
export type Adapter<D extends SchemaConfig = SchemaConfig> = {
  /**
   * Name of the adapter
   */
  name: string;
  /**
   * Read the config
   */
  read: () => Promise<DataConfig<D>>;
  /**
   * Whether to suppress errors
   */
  silent?: boolean;
};

/**
 * Config type
 */
export type Config<S extends SchemaConfig = SchemaConfig> = {
  /**
   * Schema to validate the config against
   */
  schema: S;
  /**
   * Adapters to use
   */
  adapters?: Adapter[] | Adapter;
  /**
   * Function to call on success
   */
  onSuccess?: (data: DataConfig<S>) => void;
  /**
   * Function to call on error
   */
  onError?: (error: ErrorConfig<S>) => void;
  /**
   * Logger to use
   */
  logger?: Logger;
  /**
   * How to handle casing differences.
   */
  keyMatching?: KeyMatching;
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
   * Regular expression to filter keys
   */
  regex?: RegExp;
  /**
   * Whether to suppress errors
   */
  silent?: boolean;
};

export type KeyMatching = "lenient" | "strict";
