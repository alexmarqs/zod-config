import { readdir } from "node:fs/promises";

import type { AdapterFactory } from "./adapter-specifiers";

export type ConfigResolutionResult = {
  dir: string;
  name: string;
  ext: string;
};

type ResolveConfigFilesInDirectoryProps = {
  path: string;
  allowedFilenames: string[];
  extensionToAdapterFactoryMap: Map<string, AdapterFactory>;
};

async function resolveConfigFilesInDirectory({
  path,
  allowedFilenames,
  extensionToAdapterFactoryMap,
}: ResolveConfigFilesInDirectoryProps): Promise<ConfigResolutionResult[]> {
  const baseNames = await readdir(path);
  const results: ConfigResolutionResult[] = [];

  for (const baseName of baseNames) {
    const dotIndex = baseName.lastIndexOf(".");

    if (dotIndex === -1) {
      throw new Error(
        `File ${baseName} does not have an extension. Please add an extension to the file.`,
      );
    }

    const fileName = baseName.substring(0, dotIndex);
    const extension = baseName.substring(dotIndex);

    // Skip files that are not allowed or do not have an adapter factory
    if (!allowedFilenames.includes(fileName)) continue;
    if (!extensionToAdapterFactoryMap.has(extension)) continue;

    results.push({
      dir: path,
      name: fileName,
      ext: extension,
    });
  }

  return results;
}

export type ResolveConfigFilesProps = {
  paths: string | string[];
  allowedFilenames: string[];
  extensionToAdapterFactoryMap: Map<string, AdapterFactory>;
};

export async function resolveConfigFiles({
  paths,
  allowedFilenames,
  extensionToAdapterFactoryMap,
}: ResolveConfigFilesProps): Promise<ConfigResolutionResult[]> {
  if (!Array.isArray(paths)) {
    return await resolveConfigFilesInDirectory({
      path: paths,
      allowedFilenames,
      extensionToAdapterFactoryMap,
    });
  }

  const resultsPerDirectory = await Promise.all(
    paths.map((path) =>
      resolveConfigFilesInDirectory({
        path,
        allowedFilenames,
        extensionToAdapterFactoryMap,
      }),
    ),
  );
  return resultsPerDirectory.flat();
}
