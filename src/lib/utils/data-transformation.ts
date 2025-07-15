import type { Transform } from "@/types";
import { applyNestingSeparatorKeyValue } from "./nesting-separator";

/**
 * Applies transformations to the data.
 * First it applies the transform function if provided, then it applies the nesting separator if provided.
 */
export const applyDataTransformation = (
  data: Record<string, unknown>,
  transform?: Transform,
  nestingSeparator?: string,
) => {
  if (!transform && !nestingSeparator) return data;

  return Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]) => {
    let finalKey = key;
    let finalValue = value;

    // Apply transform first if provided
    if (transform) {
      const transformed = transform({ key, value });

      // Drop the key-value if transform returns false
      if (transformed === false) {
        return acc;
      }

      // Validate and use transformed key-value pair
      if (
        transformed &&
        typeof transformed === "object" &&
        "key" in transformed &&
        "value" in transformed
      ) {
        finalKey = transformed.key;
        finalValue = transformed.value;
      } else {
        throw new Error(
          `Invalid transform result for key "${key}": expected { key: string, value: unknown } or false, received: ${JSON.stringify(
            transformed,
          )}`,
        );
      }
    }

    // Apply nesting separator if provided
    if (nestingSeparator) {
      applyNestingSeparatorKeyValue(acc, finalKey, finalValue, nestingSeparator);
    } else {
      acc[finalKey] = finalValue;
    }

    return acc;
  }, {});
};
