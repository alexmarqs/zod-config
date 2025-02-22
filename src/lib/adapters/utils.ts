/**
 * @deprecated To be deprecated soon in favor of filterByRegex
 */
export const filterByPrefixKey = (data: unknown, prefixKey: string) => {
  if (data == null) return {};
  if (!isMergeableObject(data))
    throw new TypeError(`Cannot filter ${data} by prefix key as it is not a record-like object`);

  return Object.keys(data)
    .filter((key) => key.startsWith(prefixKey))
    .reduce<Partial<Record<string, unknown>>>((acc, key) => {
      acc[key] = data[key];

      return acc;
    }, {});
};

export const filterByRegex = (data: unknown, regex: RegExp) => {
  if (data == null) return {};
  if (!isMergeableObject(data))
    throw new TypeError(`Cannot filter ${data} by regex as it is not a record-like object`);

  return Object.keys(data)
    .filter((key) => regex.test(key))
    .reduce<Partial<Record<string, unknown>>>((acc, key) => {
      acc[key] = data[key];

      return acc;
    }, {});
};

export function deepMerge(
  target: Partial<Record<string, unknown>>,
  ...sources: unknown[]
): Partial<Record<string, unknown>> {
  if (!sources.length) {
    return target;
  }

  const source = sources.shift();

  if (source === undefined) {
    return target;
  }

  if (isMergeableObject(target) && isMergeableObject(source)) {
    Object.keys(source).forEach((key) => {
      if (source[key] === undefined) return;

      if (!isMergeableObject(source[key])) {
        target[key] = source[key];
        return;
      }

      const subTarget = target[key];
      if (!isMergeableObject(subTarget)) {
        target[key] = deepMerge({}, source[key]);
        return;
      }

      deepMerge(subTarget, source[key]);
    });
  }

  return deepMerge(target, ...sources);
}

export function isMergeableObject(item: unknown): item is Partial<Record<string, unknown>> {
  if (!item) return false;
  if (typeof item !== "object") return false;
  // ES6 class instances, Maps, Sets, Arrays, etc. are not considered records
  if (Object.getPrototypeOf(item) === Object.prototype) return true;
  // Some library/Node.js functions return records with null prototype
  if (Object.getPrototypeOf(item) === null) return true;
  return false;
}

/**
 * Filter the data based on the regex or prefix key (to be deprecated soon)
 */
export function filteredData(
  data: Record<string, unknown>,
  options: { regex?: RegExp; prefixKey?: string },
) {
  const { regex, prefixKey } = options;

  if (regex) {
    return filterByRegex(data, regex);
  }

  if (prefixKey) {
    return filterByPrefixKey(data, prefixKey);
  }

  return data;
}
