import { readFileSync } from "node:fs";
import type { BaseAdapterProps, SyncAdapter } from "../../../types";
import { filteredData } from "../../utils";
import JSON5 from "json5";

export type Json5AdapterProps = BaseAdapterProps & {
  path: string;
};

const ADAPTER_NAME = "json5 adapter";

export const json5Adapter = ({
  path,
  regex,
  silent,
  keyMatching,
  transform,
}: Json5AdapterProps): SyncAdapter => {
  return {
    name: ADAPTER_NAME,
    read: () => {
      try {
        const data = readFileSync(path, "utf-8");

        const parsedData = JSON5.parse(data) || {};

        return filteredData(parsedData, { regex });
      } catch (error) {
        throw new Error(
          `Failed to parse / read JSON5 file at ${path}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    },
    silent,
    keyMatching,
    transform,
  };
};
