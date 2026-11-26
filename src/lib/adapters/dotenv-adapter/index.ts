import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import type { BaseAdapterProps, SyncAdapter } from "../../../types";
import { filteredData } from "../../utils";

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
