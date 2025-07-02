import { readFileSync } from "node:fs";
import type { BaseAdapterProps, SyncAdapter } from "../../../types";
import { filteredData } from "../../utils";
import YAML from "yaml";

export type YamlAdapterProps = BaseAdapterProps & {
  path: string;
};

const ADAPTER_NAME = "yaml adapter";

export const yamlAdapter = ({
  path,
  regex,
  silent,
  keyMatching,
}: YamlAdapterProps): SyncAdapter => {
  return {
    name: ADAPTER_NAME,
    read: () => {
      try {
        const data = readFileSync(path, "utf-8");

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
    keyMatching,
  };
};
