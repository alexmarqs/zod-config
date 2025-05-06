import * as z from "@zod/core";
import { isMergeableObject } from "@/lib/utils/is-mergeable-object";
import type { KeyMatching } from "@/types";

type KeyMatcher = (valueKey: string, shapeKey: string) => boolean;

export const KEY_MATCHERS: Record<KeyMatching, KeyMatcher> = {
  strict: compareBy((it) => it),
  lenient: compareBy(alphaNumericalLower),
};

/**
 * Returns the data, with all the nested keys transformed to match the shape of the schema.
 */
export function applyKeyMatching(
  data: object,
  schema: z.$ZodObject | z.$ZodPipe<z.$ZodObject>,
  keyMatcher: keyof typeof KEY_MATCHERS,
): object {
  // short circuit if strict or empty data
  if (keyMatcher === "strict" || !data || Object.keys(data).length === 0) {
    return data;
  }

  // get the shape of the schema
  const shape = getShape(schema);

  // custom key matching
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const matchedKey = Object.keys(shape).find((it) => KEY_MATCHERS[keyMatcher](it, key)) ?? key;

      const zodType = shape[matchedKey];

      if (isMergeableObject(value) && (isZodObject(zodType) || isZodPipeObject(zodType))) {
        return [matchedKey, applyKeyMatching(value, zodType, keyMatcher)];
      }

      return [matchedKey, value];
    }),
  );
}

function isZodObject(input: unknown): input is z.$ZodObject {
  return input instanceof z.$ZodObject;
}

function isZodPipeObject(input: unknown): input is z.$ZodPipe<z.$ZodObject> {
  return input instanceof z.$ZodPipe && isZodObject(input._zod.def.in);
}

function compareBy<T, R>(selector: (it: T) => R): (a: T, b: T) => boolean {
  return (a: T, b: T) => selector(a) === selector(b);
}

function alphaNumericalLower(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function getShape(schema: z.$ZodObject | z.$ZodPipe<z.$ZodObject>): z.$ZodShape {
  if (isZodObject(schema)) {
    return schema._zod.def.shape;
  }

  if (isZodPipeObject(schema)) {
    return schema._zod.def.in._zod.def.shape;
  }

  throw new Error("Invalid schema to get shape from");
}
