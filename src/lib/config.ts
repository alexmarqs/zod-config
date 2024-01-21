import { AnyZodObject, z } from "zod";
import { Adapter, Config } from "../types";
import { deepMerge } from "./adapters/utils";

/**
 * Load config from adapters.
 *
 * - If no adapters are provided, we will read from process.env.
 * - If multiple adapters are provided, we will deep merge the data from all adapters, with the last adapter taking precedence.
 * - If any adapter fails, we will still return the data from other adapters.
 * @param config
 * @returns parsed config
 */
export const loadConfig = async <T extends AnyZodObject>(
  config: Config<T>,
): Promise<z.infer<T>> => {
  const { schema, adapters, onError, onSuccess } = config;

  // Read data from adapters
  const data = await getDataFromAdapters(
    Array.isArray(adapters) ? adapters : adapters ? [adapters] : [],
  );

  // Validate data against schema
  const result = schema.safeParse(data);

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

const getDataFromAdapters = async (adapters?: Adapter[]) => {
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
        console.error(
          `Error reading data from adapter ${adapter.name}: ${
            error instanceof Error ? error.message : error
          }`,
        );
        return {};
      }
    }),
  );

  // Perform deep merge of data from all adapters
  return deepMerge({}, ...promiseResult);
};
