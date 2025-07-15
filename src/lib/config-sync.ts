import type {
  InferredDataConfig,
  InferredErrorConfig,
  KeyMatching,
  Logger,
  SchemaConfig,
  SyncAdapter,
  SyncConfig,
  Transform,
} from "../types";
import { safeParse } from "zod/v4/core";
import { deepMerge, getSafeProcessEnv, processAdapterData } from "./utils";
import { getResolvedConfig } from "./utils/resolved-config";

/**
 * Synchronously load config from adapters.
 *
 * - If no adapters are provided, we will read from process.env.
 * - If multiple adapters are provided, we will deep merge the data from all adapters, with the last adapter taking precedence.
 * - If any adapter fails, we will still return the data from other adapters.
 * @param config
 * @returns parsed config
 */
export const loadConfigSync = <T extends SchemaConfig>(
  config: SyncConfig<T>,
): InferredDataConfig<T> => {
  const { schema, adapters, onError, onSuccess, keyMatching, silent, transform } = config;
  const logger = config.logger ?? console;

  // Read data from adapters
  const data = getDataFromAdaptersSync(
    Array.isArray(adapters) ? adapters : adapters ? [adapters] : [],
    logger,
    schema,
    keyMatching,
    silent,
    transform,
  );

  let result = undefined;

  if ("_zod" in schema) {
    // Validate data against schema
    // v4
    result = safeParse(schema, data);
  } else {
    // v3
    result = schema.safeParse(data);
  }

  if (!result.success) {
    if (onError) {
      onError(result.error as InferredErrorConfig<T>);

      return {} as InferredDataConfig<T>;
    }

    throw result.error;
  }

  if (onSuccess) {
    onSuccess(result.data as InferredDataConfig<T>);
  }

  return result.data as InferredDataConfig<T>;
};

/**
 * Load data from adapters synchronously.
 */
const getDataFromAdaptersSync = (
  adapters: Array<SyncAdapter>,
  logger: Logger,
  schema: SchemaConfig,
  keyMatching?: KeyMatching,
  silent?: boolean,
  transform?: Transform,
) => {
  // If no adapters are provided, we will read from process.env
  if (!adapters || adapters.length === 0) {
    return getSafeProcessEnv();
  }

  // Load data from all adapters, if any adapter fails, we will still return the data from other adapters
  const result = adapters.map((adapter) => {
    const resolvedConfig = getResolvedConfig(adapter, keyMatching, silent, transform);

    let data: Record<string, unknown>;

    try {
      data = adapter.read();

      if (!data) {
        return {};
      }
    } catch (error) {
      if (!resolvedConfig.silent) {
        logger.warn(
          `Cannot read data from ${adapter.name}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
      return {};
    }

    if (data instanceof Promise) {
      throw new Error(
        `Data returned from ${adapter.name} is a Promise. Use loadConfig instead of loadConfigSync to use asynchronous adapters.`,
      );
    }

    return processAdapterData(
      data,
      schema,
      resolvedConfig.keyMatching,
      resolvedConfig.transform,
      resolvedConfig.nestingSeparator,
    );
  });

  // Perform deep merge of data from all adapters
  return deepMerge({}, ...result);
};
