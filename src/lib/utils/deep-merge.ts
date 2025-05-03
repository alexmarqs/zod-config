import { isMergeableObject } from "@/lib/utils/is-mergeable-object";

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
