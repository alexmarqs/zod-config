import { isMergeableObject } from "@/lib/utils/is-mergeable-object";

/**
 * Filter the data based on the regex or prefix key (to be deprecated soon)
 */
export function filteredData(data: Record<string, unknown>, options: { regex?: RegExp }) {
  const { regex } = options;

  if (regex) {
    return filterByRegex(data, regex);
  }

  return data;
}

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
