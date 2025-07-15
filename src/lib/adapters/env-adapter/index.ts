import { getSafeProcessEnv } from "@/lib/utils/get-safe-process-env";
import type { BaseAdapterProps, SyncAdapter } from "../../../types";
import { filteredData } from "../../utils";

export type EnvAdapterProps = BaseAdapterProps & {
  customEnv?: Record<string, any>;
  nestingSeparator?: string;
};

const ADAPTER_NAME = "env adapter";

export const envAdapter = ({
  customEnv,
  regex,
  silent,
  keyMatching,
  transform,
  nestingSeparator,
}: EnvAdapterProps = {}): SyncAdapter => {
  return {
    name: ADAPTER_NAME,
    read: () => {
      const data = customEnv || getSafeProcessEnv();

      return filteredData(data, { regex });
    },
    silent,
    keyMatching,
    transform,
    nestingSeparator,
  };
};
