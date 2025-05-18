import type {
  Adapter,
  Config,
  DataConfig,
  ErrorConfig,
  KeyMatching,
  Logger,
  SchemaConfig,
} from "../types";
import { applyKeyMatching, deepMerge, getSchemaShape } from "./utils";
import { safeParseAsync } from "zod/v4/core";

/**
 * Load config from adapters.
 *
 * - If no adapters are provided, we will read from process.env.
 * - If multiple adapters are provided, we will deep merge the data from all adapters, with the last adapter taking precedence.
 * - If any adapter fails, we will still return the data from other adapters.
 * @param config
 * @returns parsed config
 */
export const loadConfig = async <T extends SchemaConfig>(
  config: Config<T>,
): Promise<DataConfig<T>> => {
  const { schema, adapters, onError, onSuccess, keyMatching } = config;
  const logger = config.logger ?? console;

  // Read data from adapters
  const data = await getDataFromAdapters(
    Array.isArray(adapters) ? adapters : adapters ? [adapters] : [],
    logger,
    schema,
    keyMatching ?? "strict",
  );

  let result = undefined;

  // Validate data against schema
  if ("_zod" in schema) {
    // v4
    result = await safeParseAsync(schema, data);
  } else {
    // v3
    result = await schema.safeParseAsync(data);
  }

  if (!result.success) {
    if (onError) {
      onError(result.error as ErrorConfig<T>);

      return {} as DataConfig<T>;
    }

    throw result.error;
  }

  if (onSuccess) {
    onSuccess(result.data as DataConfig<T>);
  }

  return result.data as DataConfig<T>;
};

const getDataFromAdapters = async (
  adapters: Adapter[],
  logger: Logger,
  schema: SchemaConfig,
  keyMatching: KeyMatching,
) => {
  // If no adapters are provided, we will read from process.env
  if (!adapters || adapters.length === 0) {
    return process.env;
  }

  // Load data from all adapters, if any adapter fails, we will still return the data from other adapters
  const promiseResult = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        const data = await adapter.read();

        if (keyMatching === "strict") {
          return data;
        }

        const shape = getSchemaShape(schema);

        if (!shape) {
          return data;
        }

        return applyKeyMatching(data, shape, keyMatching);
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
