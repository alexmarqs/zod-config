import type { Adapter } from "../../../types";

export type AdapterFactory = (path: string) => Adapter
export type AdapterSpecifier = {
  extensions: string[];
  adapterFactory: AdapterFactory;
}

export function getExtensionToAdapterFactoryMap(adapters: AdapterSpecifier[]): Map<string, AdapterFactory> {
  const extensionToAdapterFactoryMap: Map<string, AdapterFactory> = new Map();
  for (const { extensions, adapterFactory } of adapters) {
    for (const extension of extensions) {
      if (extensionToAdapterFactoryMap.has(extension)) {
        throw new Error(
          `Ambiguous adapter mapping for file extension ${extension} - please ensure file extensions are specified at most once across all adapter specifiers.`
        );
      }
      extensionToAdapterFactoryMap.set(extension, adapterFactory);
    }
  }
  return extensionToAdapterFactoryMap;
}
