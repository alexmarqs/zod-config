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
// so JSON is read and parsed instead. TypeScript loads with the jiti nearest to the file when
// installed, otherwise with Node's type stripping.
const loadScript = async (path: string): Promise<Record<string, unknown>> => {
  const file = path.startsWith("file:") ? fileURLToPath(path) : resolve(path);
  const extension = extname(file).toLowerCase();
  if (extension === ".json") {
    return JSON.parse(await readFile(file, "utf8")) || {};
  }

  const jiti = TS_EXTENSIONS.includes(extension)
    ? createProjectJiti(dirname(file), { interopDefault: false, tsconfigPaths: true })
    : undefined;
  const loaded = (jiti ? await jiti.import(file) : await import(pathToFileURL(file).href)) as any;
  // jiti returns `module.exports` as is, without a `default`.
  const data = "default" in loaded ? loaded.default : loaded;
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
