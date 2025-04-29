import { type AnyZodObject, ZodObject, type ZodRawShape } from "zod";
import { isMergeableObject } from "@/lib/utils/is-mergeable-object";
import { KeyMatching } from "@/types";

type KeyMatcher = (valueKey: string, shapeKey: string) => boolean;

export const KEY_MATCHERS: Record<KeyMatching, KeyMatcher> = {
  strict: compareBy(it => it),
  lenient: compareBy(alphaNumericalLower),
};

/**
 * Returns the data, with all the nested keys transformed to match the shape of the schema.
 */
export function applyKeyMatching(
  data: Record<string, unknown>,
  shape: ZodRawShape,
  keyMatcher: keyof typeof KEY_MATCHERS,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const matchedKey =
        Object.keys(shape).find((it) => KEY_MATCHERS[keyMatcher](it, key)) ??
        key;

      const zodType = shape[matchedKey];
      if (isMergeableObject(value) && isZodObject(zodType)) {
        return [matchedKey, applyKeyMatching(value, zodType.shape, keyMatcher)];
      } else {
        return [matchedKey, value];
      }
    }),
  );
}

function isZodObject(input: unknown): input is AnyZodObject {
  return input instanceof ZodObject;
}

function compareBy<T, R>(selector: (it: T) => R): (a: T, b: T) => boolean {
    return (a: T, b: T) => selector(a) === selector(b);
}

function alphaNumericalLower(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
