// ZOD3: remove in next major: this import and the *V3 helpers below.
import type { AnyZodObject, ZodDefault, ZodOptional, ZodRawShape, ZodTypeAny } from "zod/v3";
import * as z from "zod/v4/core";
import { isMergeableObject } from "@/lib/utils/is-mergeable-object";
import type { KeyMatching, ShapeConfig } from "@/types";

type KeyMatcher = (valueKey: string, shapeKey: string) => boolean;

export const KEY_MATCHERS: Record<KeyMatching, KeyMatcher> = {
  strict: compareBy((it) => it),
  lenient: compareBy(alphaNumericalLower),
};

/**
 * Maximum depth of nested objects to transform.
 * This is to prevent infinite loops in case of circular references.
 */
const MAX_DEPTH = 150;

/**
 * Returns the data, with all the nested keys transformed to match the shape of the schema.
 */
export function applyKeyMatching(
  data: Record<string, unknown>,
  shape: ShapeConfig,
  keyMatcher: keyof typeof KEY_MATCHERS,
  depth = 0,
  maxDepth = MAX_DEPTH,
): Record<string, unknown> {
  // prevent infinite loops, check for empty data or shape
  if (
    depth >= maxDepth ||
    !data ||
    !shape ||
    Object.keys(data).length === 0 ||
    Object.keys(shape).length === 0
  ) {
    return data;
  }

  const matcher = KEY_MATCHERS[keyMatcher];

  // custom key matching
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const matchedKey = Object.keys(shape).find((it) => matcher(it, key)) ?? key;

      if (!isMergeableObject(value)) {
        return [matchedKey, value];
      }

      const zodType = shape[matchedKey];

      const childShape = getSchemaShape(zodType);

      if (childShape) {
        return [matchedKey, applyKeyMatching(value, childShape, keyMatcher, depth + 1)];
      }

      return [matchedKey, value];
    }),
  );
}

function alphaNumericalLower(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isZodObject(input: unknown): input is z.$ZodObject {
  return input instanceof z.$ZodObject;
}

function isZodDefault(input: unknown): input is z.$ZodDefault {
  return input instanceof z.$ZodDefault;
}

function isZodOptional(input: unknown): input is z.$ZodOptional {
  return input instanceof z.$ZodOptional;
}

function isZodPrefault(input: unknown): input is z.$ZodPrefault {
  return input instanceof z.$ZodPrefault;
}

// ZOD3: remove in next major: hasTypeNameV3, isZodObjectV3, isZodDefultV3, isZodOptionalV3,
// getShapeV3.
/**
 * Zod 3 schemas are recognised by their type name instead of `instanceof`, so that Zod 3 is
 * never imported at runtime (it would otherwise be bundled for Zod 4 users, including in browsers).
 */
function hasTypeNameV3(input: unknown, typeName: string) {
  return (input as { _def?: { typeName?: string } } | undefined)?._def?.typeName === typeName;
}

function isZodObjectV3(input: unknown): input is AnyZodObject {
  return hasTypeNameV3(input, "ZodObject");
}

function isZodDefultV3(input: unknown): input is ZodDefault<any> {
  return hasTypeNameV3(input, "ZodDefault");
}

function isZodOptionalV3(input: unknown): input is ZodOptional<any> {
  return hasTypeNameV3(input, "ZodOptional");
}

function isZodPipeTransformObject(
  input: unknown,
): input is z.$ZodPipe<z.$ZodObject, z.$ZodTransform> {
  return input instanceof z.$ZodPipe && isZodObject(input._zod.def.in);
}

function isZodPipePreprocessObject(
  input: unknown,
): input is z.$ZodPipe<z.$ZodTransform, z.$ZodObject> {
  return input instanceof z.$ZodPipe && isZodObject(input._zod.def.out);
}

function compareBy<T, R>(selector: (it: T) => R): (a: T, b: T) => boolean {
  return (a: T, b: T) => selector(a) === selector(b);
}

export function getShape(schema: z.$ZodType<unknown>): z.$ZodShape | undefined {
  if (isZodDefault(schema) || isZodOptional(schema) || isZodPrefault(schema))
    return getShape(schema._zod.def.innerType);
  if (isZodObject(schema)) return schema._zod.def.shape;
  if (isZodPipeTransformObject(schema)) return schema._zod.def.in._zod.def.shape;
  if (isZodPipePreprocessObject(schema)) return schema._zod.def.out._zod.def.shape;
  return undefined;
}

export function getShapeV3(schema: ZodTypeAny): ZodRawShape | undefined {
  if (isZodDefultV3(schema) || isZodOptionalV3(schema)) return getShapeV3(schema._def.innerType);
  if (isZodObjectV3(schema)) return schema.shape;
  return undefined;
}

export const getSchemaShape = (schema: z.$ZodType<unknown> | ZodTypeAny | undefined) => {
  if (!schema) {
    return undefined;
  }

  if ("_zod" in schema) {
    return getShape(schema);
  }

  // ZOD3: remove in next major (v3 fallback)
  return getShapeV3(schema);
};
