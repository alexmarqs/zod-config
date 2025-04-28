import { type AnyZodObject, ZodObject, type ZodRawShape } from "zod";
import { isMergeableObject } from '@/lib/utils/is-mergeable-object';

/**
 * Returns the data, with all the nested keys transformed to match the shape of the schema.
 */
export function applyLenientMatching(
  data: Record<string, unknown>,
  shape: ZodRawShape,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const matchedKey =
        Object.keys(shape).find(
          (it) =>
            it.replace(/[^a-z0-9]/gi, "").toLowerCase() ===
            key.replace(/[^a-z0-9]/gi, "").toLowerCase(),
        ) ?? key;

        const zodType = shape[matchedKey];
        if (isMergeableObject(value) && isZodObject(zodType)) {
        return [
          matchedKey,
          applyLenientMatching(value, zodType.shape),
        ];
      } else {
        return [matchedKey, value];
      }
    }),
  );
}

function isZodObject(input: unknown): input is AnyZodObject {
  return input instanceof ZodObject;
}
