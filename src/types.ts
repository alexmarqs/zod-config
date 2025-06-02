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
  Helper types for zod v3 and v4 output inference.
*/
type ZodV3Output<T> = T extends z3.ZodType<infer U> ? U : never;
type ZodV4Output<T> = T extends z.$ZodType<any> ? z.infer<T> : never;

/*
  This is a type that represents the data of the config.
  It can be a zod v3 data or a zod v4 data.
*/
export type InferredDataConfig<S extends SchemaConfig> = ZodV3Output<S> | ZodV4Output<S>;
/*
  This is a type that represents the error of the config.
  It can be a zod v3 error or a zod v4 error.
*/
export type InferredErrorConfig<S extends SchemaConfig> = S extends z3.ZodType<infer T>
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
  read: () => Promise<InferredDataConfig<D>>;
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
  onSuccess?: (data: InferredDataConfig<S>) => void;
  /**
   * Function to call on error
   */
  onError?: (error: InferredErrorConfig<S>) => void;
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
