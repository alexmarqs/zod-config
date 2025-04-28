import { isMergeableObject } from '@/lib/utils/is-mergeable-object';

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
