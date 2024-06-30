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

  function splitBaseName(baseName: string): { fileName: string; extension: string } {
    for (const extension of extensionToAdapterFactoryMap.keys()) {
      if (!baseName.endsWith(extension)) continue;

      const fileName = baseName.substring(0, baseName.length - extension.length);
      return { fileName, extension };
    }
    return { fileName: baseName, extension: "" };
  }

  for (const baseName of baseNames) {
    const { fileName, extension } = splitBaseName(baseName);

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
