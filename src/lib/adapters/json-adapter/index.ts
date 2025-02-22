import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../utils";
import { readFile } from "node:fs/promises";

export type JsonAdapterProps = BaseAdapterProps & {
  path: string;
};

const ADAPTER_NAME = "json adapter";

export const jsonAdapter = ({ path, prefixKey, regex, silent }: JsonAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const data = await readFile(path, "utf-8");

        const parsedData = JSON.parse(data) || {};

        return filteredData(parsedData, { prefixKey, regex });
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
