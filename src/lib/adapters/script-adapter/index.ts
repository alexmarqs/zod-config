import { readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";
import { createProjectJiti } from "../../utils/jiti";

export type ScriptAdapterProps = BaseAdapterProps & {
  path: string;
};

const ADAPTER_NAME = "script adapter";
const TS_EXTENSIONS = [".ts", ".mts", ".cts"];

// Relative paths resolve from the working directory. Node needs an import attribute for JSON,
// so JSON is read and parsed instead. When native import() can't load a TypeScript file (older
// Node, enums, extensionless imports, path aliases), it retries with the jiti nearest to the file.
const loadScript = async (path: string): Promise<Record<string, unknown>> => {
  const file = path.startsWith("file:") ? fileURLToPath(path) : resolve(path);
  const extension = extname(file).toLowerCase();
  if (extension === ".json") {
    return JSON.parse(await readFile(file, "utf8")) || {};
  }

  let data: any;
  try {
    ({ default: data } = await import(pathToFileURL(file).href));
  } catch (error) {
    const jiti = TS_EXTENSIONS.includes(extension)
      ? createProjectJiti(dirname(file), { interopDefault: false, tsconfigPaths: true })
      : undefined;
    if (!jiti) {
      throw error;
    }
    const loaded = (await jiti.import(file)) as any;
    // jiti marks ESM output with `__esModule`, and returns `module.exports` as is.
    data = loaded?.__esModule ? loaded.default : loaded;
  }
  // TypeScript runners (tsx, jiti) can compile the file to CommonJS, which nests the export.
  return data?.__esModule && "default" in data ? data.default : data;
};

export const scriptAdapter = ({
  path,
  regex,
  silent,
  keyMatching,
  transform,
}: ScriptAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const data = await loadScript(path);

        return filteredData(data, { regex });
      } catch (error) {
        throw new Error(
          `Failed to import() script at ${path}: ${error instanceof Error ? error.message : error}`,
        );
      }
    },
    silent,
    keyMatching,
    transform,
  };
};
