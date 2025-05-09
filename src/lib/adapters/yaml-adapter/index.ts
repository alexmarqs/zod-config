import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";
import { readFile } from "node:fs/promises";
import YAML from "yaml";

export type YamlAdapterProps = BaseAdapterProps & {
  path: string;
};

const ADAPTER_NAME = "yaml adapter";

export const yamlAdapter = ({ path, regex, silent }: YamlAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const data = await readFile(path, "utf-8");

        const parsedData = YAML.parse(data) || {};

        return filteredData(parsedData, { regex });
      } catch (error) {
        throw new Error(
          `Failed to parse / read YAML file at ${path}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    },
    silent,
  };
};
