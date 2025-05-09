import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";
import { readFile } from "node:fs/promises";
import { parse as tomlParse } from "smol-toml";

export type TomlAdapterProps = BaseAdapterProps & {
  path: string;
};
const ADAPTER_NAME = "toml adapter";

export const tomlAdapter = ({ path, regex, silent }: TomlAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const data = await readFile(path, "utf-8");

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
  };
};
