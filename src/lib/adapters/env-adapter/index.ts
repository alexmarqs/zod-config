import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";

export type EnvAdapterProps = BaseAdapterProps & {
  customEnv?: Record<string, any>;
};

const ADAPTER_NAME = "env adapter";

export const envAdapter = ({ customEnv, regex, silent }: EnvAdapterProps = {}): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      // spread process.env by default to ensure we have a plain object to avoid prototype issues
      const data = customEnv || (typeof process !== "undefined" ? { ...process.env } : {});

      return filteredData(data, { regex });
    },
    silent,
  };
};
