import assert from "node:assert";
import path from "node:path";

import { deepMerge, filterByPrefixKey } from "../utils";
import type { Adapter } from "../../../types";
import { getExtensionToAdapterFactoryMap, type AdapterSpecifier } from "./adapter-specifiers";
import { getAllowedFilenames } from "./allowed-filenames";
import { resolveConfigResolutionVariables } from "./variables";
import { type ConfigResolutionResult, resolveConfigFiles } from "./resolution-and-load-order";

export type DirectoryAdapterProps = {
  paths: string | string[];
  adapters: AdapterSpecifier[] | AdapterSpecifier;
  prefixKey?: string;
  silent?: boolean;
};

type ConfigResolutionResultWithAdapter = ConfigResolutionResult & { adapter: Adapter };

const ADAPTER_NAME = "directory adapter";

export const directoryAdapter = ({
  paths,
  adapters,
  prefixKey,
  silent,
}: DirectoryAdapterProps): Adapter => {
  const extensionToAdapterFactoryMap = getExtensionToAdapterFactoryMap(
    Array.isArray(adapters) ? adapters : [adapters],
  );

  async function readUnsafely(): Promise<any> {
    const configResolutionVariables = resolveConfigResolutionVariables();
    const allowedFilenames = getAllowedFilenames(configResolutionVariables);

    const configResolutionResults = await resolveConfigFiles({
      paths,
      allowedFilenames,
      extensionToAdapterFactoryMap,
    });

    configResolutionResults.sort((a, b) => {
      const aNameIndex = allowedFilenames.indexOf(a.name);
      const bNameIndex = allowedFilenames.indexOf(b.name);

      if (aNameIndex !== bNameIndex) return aNameIndex - bNameIndex;
      if (a.dir === b.dir) return 0;
      assert(Array.isArray(paths));

      const aDirIndex = paths.indexOf(a.dir);
      const bDirIndex = paths.indexOf(b.dir);
      return aDirIndex - bDirIndex;
    });

    const adapters: ConfigResolutionResultWithAdapter[] = configResolutionResults.map((result) => {
      const factory = extensionToAdapterFactoryMap.get(result.ext);
      assert(factory !== undefined);
      return {
        ...result,
        adapter: factory(path.format(result)),
      };
    });

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

    if (prefixKey) {
      return filterByPrefixKey(mergedData, prefixKey);
    }

    return mergedData;
  }

  async function read(): Promise<any> {
    try {
      return await readUnsafely();
    } catch (error) {
      throw new Error(
        `Failed to read config from some of the following directories:\n - ${
          Array.isArray(paths) ? paths.join("\n - ") : paths
        }\nReason: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return {
    name: ADAPTER_NAME,
    read,
    silent,
  };
};
