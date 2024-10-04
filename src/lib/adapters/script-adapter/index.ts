import type { Adapter } from "../../../types";
import { filterByPrefixKey } from "../utils";
import type { Jiti } from "jiti";
import type * as _tsx from "tsx/esm/api";

type Tsx = typeof _tsx

export type ScriptAdapterProps = {
  path: string;
  prefixKey?: string;
  silent?: boolean;
};

const ADAPTER_NAME = "script adapter";
const TS_EXT_REGEX = /\.m?ts$/  // `import()` doesn't support commonJS

let tsx: Tsx | undefined
let triedToImportTsx = false
let jiti: Jiti | undefined
let triedToImportJiti = false

const importWithTypescriptFallback = async (path: string): Promise<unknown> => {
  // attempt standard import()
  try {
    return await import(path)
  }
  catch (err) {
    // throw if the file extension does not obviously hint that the file is TypeScript
    if (!TS_EXT_REGEX.test(path)) throw err
  }
  
  // attempt tsx fallback
  if (!triedToImportTsx) {
    try {
      tsx = await import("tsx/esm/api")
    }
    catch (error) {}
    finally {
      triedToImportTsx = true
    }
  }

  if (tsx) {
    return await tsx.tsImport(path, import.meta.url)
  }

  // attempt jiti fallback
  if (!triedToImportJiti) {
    try {
      const { createJiti } = await import('jiti')
      jiti = createJiti(import.meta.url)
    }
    catch (error) {}
    finally {
      triedToImportJiti = true
    }
  }
  
  if (jiti) {
    return await jiti.import(path)
  }
  
  throw new Error("'tsx' or 'jiti' is required to load TypeScript files using the zod-config script adapter from a JavaScript context. Make sure at least one is installed")
}

const isObject = (maybeObject: unknown): maybeObject is Record<string, unknown> => {
  if (typeof maybeObject !== 'object') return false
  if (maybeObject === null) return false
  if (Array.isArray(maybeObject)) return false
  return true
}

const hasObjectDefaultExport = (maybeModule: unknown): maybeModule is { default: Record<string, unknown> } => {
  if (!isObject(maybeModule)) return false
  if (!Object.hasOwn(maybeModule, "default")) return false
  return isObject(maybeModule.default)
}

export const scriptAdapter = ({ path, prefixKey, silent }: ScriptAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const module = await import(path);
        if (!hasObjectDefaultExport(module)) throw new Error(`Value imported from ${path} is not a module!`)
        
        const data = module.default

        if (prefixKey) {
          return filterByPrefixKey(data, prefixKey);
        }

        return data;
      } catch (error) {
        throw new Error(
          `Failed to import() script at ${path}: ${error instanceof Error ? error.message : error}`,
        );
      }
    },
    silent,
  };
};
