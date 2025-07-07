/**
 * Applies nesting separator to a single key-value pair within an accumulator object.
 */
export function applyNestingSeparatorKeyValue(
  acc: Record<string, any>,
  key: string,
  value: unknown,
  separator: string,
): void {
  if (!separator) {
    acc[key] = value;
    return;
  }

  const parts = key.split(separator);
  let current = acc;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (i === parts.length - 1) {
      // Last part - assign the value (e.g. database.host = localhost)
      if (part in current) {
        if (typeof current[part] === "object" && current[part] !== null) {
          throw new Error(
            `Nested key conflict: "${key}" cannot be assigned because "${parts
              .slice(0, i + 1)
              .join(separator)}" already exists as an object (created by another key)`,
          );
        }
      }
      current[part] = value;
    } else {
      // Intermediate part - ensure object exists
      if (part in current) {
        if (typeof current[part] !== "object" || current[part] === null) {
          // Find which env var created this primitive value
          const conflictingPath = parts.slice(0, i + 1).join(separator);
          throw new Error(
            `Nested key conflict: Cannot create nested object at "${conflictingPath}" because it already exists as a primitive value. Conflicting key: "${key}" and "${conflictingPath}"`,
          );
        }
      } else {
        current[part] = {};
      }
      current = current[part];
    }
  }
}
