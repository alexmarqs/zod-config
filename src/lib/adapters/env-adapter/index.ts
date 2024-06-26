import type { Adapter } from "../../../types";
import { filterByPrefixKey } from "../utils";

export type EnvAdapterProps = {
  customEnv?: Record<string, any>;
  prefixKey?: string;
  silent?: boolean;
};

const ADAPTER_NAME = "env adapter";

export const envAdapter = ({ customEnv, prefixKey, silent }: EnvAdapterProps = {}): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      const data = customEnv || process.env || {};

      if (prefixKey) {
        return filterByPrefixKey(data, prefixKey);
      }

      return data;
    },
    silent,
  };
};
