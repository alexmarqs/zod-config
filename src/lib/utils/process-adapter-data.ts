import type { KeyMatching, SchemaConfig } from "../../types";
import { applyKeyMatching, getSchemaShape } from ".";

export const processAdapterData = (
  data: Record<string, unknown>,
  schema: SchemaConfig,
  keyMatching: KeyMatching,
): Record<string, unknown> => {
  if (keyMatching === "strict") {
    return data;
  }

  const shape = getSchemaShape(schema);

  if (!shape) {
    return data;
  }

  return applyKeyMatching(data, shape, keyMatching);
};
