import { readFileSync } from "node:fs";
import type { BaseAdapterProps, SyncAdapter } from "../../../types";
import { filteredData } from "../../utils";
import { parse as tomlParse } from "smol-toml";

export type TomlAdapterProps = BaseAdapterProps & {
  path: string;
};
const ADAPTER_NAME = "toml adapter";

export const tomlAdapter = ({
  path,
  regex,
  silent,
  keyMatching,
}: TomlAdapterProps): SyncAdapter => {
  return {
    name: ADAPTER_NAME,
    read: () => {
      try {
        const data = readFileSync(path, "utf-8");

        const parsedData = tomlParse(data) || {};

        return filteredData(parsedData, { regex });
      } catch (error) {
        throw new Error(
          `Failed to parse / read TOML file at ${path}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    },
    silent,
    keyMatching,
  };
};
