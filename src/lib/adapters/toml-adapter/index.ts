import type { Adapter } from "../../../types";
import { filterByPrefixKey } from "../utils";
import { readFile } from "node:fs/promises";
import { parse as tomlParse } from "smol-toml";

export type TomlAdapterProps = {
  path: string;
  prefixKey?: string;
  silent?: boolean;
};
const ADAPTER_NAME = "toml adapter";

export const tomlAdapter = ({ path, prefixKey, silent }: TomlAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const data = await readFile(path, "utf-8");

        const parsedData = tomlParse(data) || {};

        if (prefixKey) {
          return filterByPrefixKey(parsedData, prefixKey);
        }

        return parsedData;
      } catch (error) {
        throw new Error(
          `Failed to parse / read TOML file at ${path}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    },
    silent,
  };
};
