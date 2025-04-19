import type * as z from "@zod/core";
import type { Adapter, Config, Logger } from "../types";
import { deepMerge } from "./adapters/utils";
import { safeParseAsync } from "@zod/core";

/**
 * Load config from adapters.
 *
 * - If no adapters are provided, we will read from process.env.
 * - If multiple adapters are provided, we will deep merge the data from all adapters, with the last adapter taking precedence.
 * - If any adapter fails, we will still return the data from other adapters.
 * @param config
 * @returns parsed config
 */
export const loadConfig = async <T extends z.$ZodType<object, object>>(
  config: Config<T>,
): Promise<z.infer<T>> => {
  const { schema, adapters, onError, onSuccess } = config;
  const logger = config.logger ?? console;
  // Read data from adapters
  const data = await getDataFromAdapters(
    Array.isArray(adapters) ? adapters : adapters ? [adapters] : [],
    logger,
  );
  // Validate data against schema
  const result = await safeParseAsync(schema, data);
  if (!result.success) {
    // If onError callback is provided, we will call it with the error
    if (onError) {
      onError(result.error);

      return {};
    }

    throw result.error;
  }

  // If onSuccess callback is provided, we will call it with the parsed data
  if (onSuccess) {
    onSuccess(result.data);
  }

  return result.data;
};

const getDataFromAdapters = async (adapters: Adapter[], logger: Logger) => {
  // If no adapters are provided, we will read from process.env
  if (!adapters || adapters.length === 0) {
    return process.env;
  }

  // Load data from all adapters, if any adapter fails, we will still return the data from other adapters
  const promiseResult = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        return await adapter.read();
      } catch (error) {
        if (!adapter.silent) {
          logger.warn(
            `Cannot read data from ${adapter.name}: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
        return {};
      }
    }),
  );

  // Perform deep merge of data from all adapters
  return deepMerge({}, ...promiseResult);
};
