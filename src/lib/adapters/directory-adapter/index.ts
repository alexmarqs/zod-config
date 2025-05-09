import assert from "node:assert";
import path from "node:path";

import { deepMerge, filteredData } from "../../utils";
import type { Adapter, BaseAdapterProps } from "../../../types";
import { getExtensionToAdapterFactoryMap, type AdapterSpecifier } from "./adapter-specifiers";
import { getAllowedFilenames } from "./allowed-filenames";
import {
  type ConfigResolutionResult,
  resolveConfigFiles,
  sortConfigResolutionResults,
} from "./resolution-and-load-order";

export type DirectoryAdapterProps = BaseAdapterProps & {
  paths: string | string[];
  adapters: AdapterSpecifier[] | AdapterSpecifier;
};

type ConfigResolutionResultWithAdapter = ConfigResolutionResult & { adapter: Adapter };

const ADAPTER_NAME = "directory adapter";

export const directoryAdapter = ({
  paths,
  adapters: adaptersSpecifiers,
  silent,
  regex,
}: DirectoryAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const extensionToAdapterFactoryMap = getExtensionToAdapterFactoryMap(
          Array.isArray(adaptersSpecifiers) ? adaptersSpecifiers : [adaptersSpecifiers],
        );

        const allowedFilenames = getAllowedFilenames();
        const allowedExtensions = Array.from(extensionToAdapterFactoryMap.keys());

        const configResolutionResults = await resolveConfigFiles({
          paths,
          allowedFilenames,
          allowedExtensions,
        });

        sortConfigResolutionResults(configResolutionResults, allowedFilenames, paths);

        const adapters: ConfigResolutionResultWithAdapter[] = configResolutionResults.map(
          (result) => {
            const factory = extensionToAdapterFactoryMap.get(result.ext);
            assert(factory !== undefined);
            return {
              ...result,
              adapter: factory(path.format(result)),
            };
          },
        );

        const adapterDataPromises = adapters.map(async (result) => {
          try {
            return await result.adapter.read();
          } catch (error) {
            throw new Error(
              `Cannot read data from ${result.adapter.name} for ${path.format(result)}: ${
                error instanceof Error ? error.message : error
              }`,
            );
          }
        });

        const adapterData = await Promise.all(adapterDataPromises);
        const mergedData = deepMerge({}, ...adapterData);

        return filteredData(mergedData, { regex });
      } catch (error) {
        throw new Error(
          `Failed to read config from some of the following directories:\n - ${
            Array.isArray(paths) ? paths.join("\n - ") : paths
          }\nReason: ${error instanceof Error ? error.message : error}`,
        );
      }
    },
    silent,
  };
};
