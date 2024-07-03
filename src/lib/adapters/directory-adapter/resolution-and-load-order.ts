import assert from "node:assert";
import { readdir } from "node:fs/promises";
import { basename, extname } from "node:path";

export type ConfigResolutionResult = {
  dir: string;
  name: string;
  ext: string;
};

type ResolveConfigFilesInDirectoryProps = {
  path: string;
  allowedFilenames: string[];
  allowedExtensions: string[];
};

async function resolveConfigFilesInDirectory({
  path,
  allowedFilenames,
  allowedExtensions,
}: ResolveConfigFilesInDirectoryProps): Promise<ConfigResolutionResult[]> {
  const dirFiles = await readdir(path);
  const results: ConfigResolutionResult[] = [];

  for (const file of dirFiles) {
    const fileExt = extname(file);
    const fileName = basename(file, fileExt);

    if (!allowedFilenames.includes(fileName) || !allowedExtensions.includes(fileExt)) {
      continue;
    }

    results.push({
      dir: path,
      name: fileName,
      ext: fileExt,
    });
  }

  return results;
}

export type ResolveConfigFilesProps = {
  paths: string | string[];
  allowedFilenames: string[];
  allowedExtensions: string[];
};

export async function resolveConfigFiles({
  paths,
  allowedFilenames,
  allowedExtensions,
}: ResolveConfigFilesProps): Promise<ConfigResolutionResult[]> {
  if (!Array.isArray(paths)) {
    return await resolveConfigFilesInDirectory({
      path: paths,
      allowedFilenames,
      allowedExtensions,
    });
  }

  const resultsPerDirectory = await Promise.all(
    paths.map((path) =>
      resolveConfigFilesInDirectory({
        path,
        allowedFilenames,
        allowedExtensions,
      }),
    ),
  );

  return resultsPerDirectory.flat();
}

export function sortConfigResolutionResults(
  configResolutionResults: ConfigResolutionResult[],
  allowedFilenames: string[],
  paths: string | string[],
) {
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
}
