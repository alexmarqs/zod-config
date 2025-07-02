import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";

export type ScriptAdapterProps = BaseAdapterProps & {
  path: string;
};

const ADAPTER_NAME = "script adapter";

export const scriptAdapter = ({
  path,
  regex,
  silent,
  keyMatching,
}: ScriptAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const { default: data } = await import(path);

        return filteredData(data, { regex });
      } catch (error) {
        throw new Error(
          `Failed to import() script at ${path}: ${error instanceof Error ? error.message : error}`,
        );
      }
    },
    silent,
    keyMatching,
  };
};
