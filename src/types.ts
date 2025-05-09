import type * as z from "@zod/core";

/**
 * Adapter type
 */
export type Adapter<
  D extends z.$ZodType<Record<string, unknown>> = z.$ZodType<Record<string, unknown>>,
> = {
  /**
   * Name of the adapter
   */
  name: string;
  /**
   * Read the config
   */
  read: () => Promise<z.infer<D>>;
  /**
   * Whether to suppress errors
   */
  silent?: boolean;
};

/**
 * Config type
 */
export type Config<
  S extends z.$ZodType<Record<string, unknown>> = z.$ZodType<Record<string, unknown>>,
> = {
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
  onSuccess?: (data: z.infer<S>) => void;
  /**
   * Function to call on error
   */
  onError?: (error: z.$ZodError<z.infer<S>>) => void;
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
   * Prefix key to filter keys by
   * @deprecated Use regex instead
   */
  prefixKey?: string;
  /**
   * Regular expression to filter keys by: if used, prefixKey will be ignored
   */
  regex?: RegExp;
  /**
   * Whether to suppress errors
   */
  silent?: boolean;
};

export type KeyMatching = "lenient" | "strict";
