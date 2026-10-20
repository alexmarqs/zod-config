import { isMergeableObject } from "@/lib/utils/is-mergeable-object";

/**
 * Parses a JSON object for adapters reading secrets. Errors never include the raw value.
 * `null` yields an empty object.
 */
export function parseJsonObject(raw: string): Record<string, unknown> {
  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("value is not valid JSON (set `key` to load it as a plain string)");
  }

  if (data === null) return {};

  if (!isMergeableObject(data)) {
    throw new Error("value is not a JSON object (set `key` to load it as a plain string)");
  }

  return data;
}
