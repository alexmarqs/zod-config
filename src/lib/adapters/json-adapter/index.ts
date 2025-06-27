import { readFileSync } from "node:fs";
import type { BaseAdapterProps, SyncAdapter } from "../../../types";
import { filteredData } from "../../utils";

export type JsonAdapterProps = BaseAdapterProps & {
  path: string;
};

const ADAPTER_NAME = "json adapter";

export const jsonAdapter = ({ path, regex, silent }: JsonAdapterProps): SyncAdapter => {
  return {
    name: ADAPTER_NAME,
    read: () => {
      try {
        const data = readFileSync(path, "utf-8");

        const parsedData = JSON.parse(data) || {};

        return filteredData(parsedData, { regex });
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
