import { parse } from "dotenv";
import type { SyncAdapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";
import { readFileSync } from "node:fs";

export type DotEnvAdapterProps = BaseAdapterProps & {
  path: string;
  nestingSeparator?: string;
};

const ADAPTER_NAME = "dotenv adapter";

export const dotEnvAdapter = ({
  path,
  regex,
  silent,
  keyMatching,
  transform,
  nestingSeparator,
}: DotEnvAdapterProps): SyncAdapter => {
  return {
    name: ADAPTER_NAME,
    read: () => {
      try {
        const data = readFileSync(path, "utf-8");

        const parsedData = parse(data) || {};

        return filteredData(parsedData, { regex });
      } catch (error) {
        throw new Error(
          `Failed to parse / read .env file at ${path}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    },
    silent,
    keyMatching,
    transform,
    nestingSeparator,
  };
};
