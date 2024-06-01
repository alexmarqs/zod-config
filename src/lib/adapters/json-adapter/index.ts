import type { Adapter } from "../../../types";
import { filterByPrefixKey } from "../utils";
import { readFile } from "node:fs/promises";

export type JsonAdapterProps = {
  path: string;
  prefixKey?: string;
  silent?: boolean;
};

const ADAPTER_NAME = "json adapter";

export const jsonAdapter = ({ path, prefixKey, silent }: JsonAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const data = await readFile(path, "utf-8");

        const parsedData = JSON.parse(data) || {};

        if (prefixKey) {
          return filterByPrefixKey(parsedData, prefixKey);
        }

        return parsedData;
      } catch (error) {
        throw new Error(
          `Failed to parse / read JSON file at ${path}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    },
    silent,
  };
};
