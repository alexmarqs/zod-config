export const filterByPrefixKey = (
  data: { [key: string]: any } | undefined | null,
  prefixKey: string,
) => {
  if (!data) {
    return {};
  }

  return Object.keys(data)
    .filter((key) => key.startsWith(prefixKey))
    .reduce<{ [key: string]: any }>((acc, key) => {
      acc[key] = data[key];

      return acc;
    }, {});
};

export function deepMerge(target: any, ...sources: any[]) {
  if (!sources.length) {
    return target;
  }

  const source = sources.shift();

  if (source === undefined) {
    return target;
  }

  if (isMergebleObject(target) && isMergebleObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isMergebleObject(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }

        deepMerge(target[key], source[key]);
      } else {
        if (source[key] !== undefined && source[key] !== null) {
          target[key] = source[key];
        }
      }
    });
  }

  return deepMerge(target, ...sources);
}

export function isMergebleObject(item: any) {
  return item && typeof item === "object" && !Array.isArray(item);
}
