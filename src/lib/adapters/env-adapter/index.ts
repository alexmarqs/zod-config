import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";

export type EnvAdapterProps = BaseAdapterProps & {
  customEnv?: Record<string, any>;
};

const ADAPTER_NAME = "env adapter";

export const envAdapter = ({
  customEnv,

  regex,
  silent,
}: EnvAdapterProps = {}): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      const data = customEnv || process.env || {};

      return filteredData(data, { regex });
    },
    silent,
  };
};
