import { parse } from "dotenv";
import { readFile } from "node:fs/promises";
import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";

export type DotEnvAdapterProps = BaseAdapterProps & {
  path: string;
};

const ADAPTER_NAME = "dotenv adapter";

export const dotEnvAdapter = ({ path, prefixKey, regex, silent }: DotEnvAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const data = await readFile(path, "utf-8");

        const parsedData = parse(data) || {};

        return filteredData(parsedData, { prefixKey, regex });
      } catch (error) {
        throw new Error(
          `Failed to parse / read .env file at ${path}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    },
    silent,
  };
};
