import type { Adapter } from "../../../types";
import { filterByPrefixKey } from "../utils";

export type ScriptAdapterProps = {
  path: string;
  prefixKey?: string;
  silent?: boolean;
};

const ADAPTER_NAME = "script adapter";

export const scriptAdapter = ({ path, prefixKey, silent }: ScriptAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const { default: data } = await import(path);

        if (prefixKey) {
          return filterByPrefixKey(data, prefixKey);
        }

        return data;
      } catch (error) {
        throw new Error(
          `Failed to import() script at ${path}: ${error instanceof Error ? error.message : error}`,
        );
      }
    },
    silent,
  };
};
