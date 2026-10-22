import { isMergeableObject } from "@/lib/utils/is-mergeable-object";

type Options = {
  hint?: string;
};

const withHint = (message: string, hint?: string) => (hint ? `${message} (${hint})` : message);

/**
 * Parses a JSON object. `null` yields an empty object; any other non-object value throws.
 * Errors never include the value, so it is safe for secrets.
 */
export function parseJsonObject(raw: string, { hint }: Options = {}): Record<string, unknown> {
  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(withHint("value is not valid JSON", hint));
  }

  if (data === null) return {};

  if (!isMergeableObject(data)) {
    throw new Error(withHint("value is not an object", hint));
  }

  return data;
}
