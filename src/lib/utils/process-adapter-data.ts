import type { KeyMatching, SchemaConfig, Transform } from "../../types";
import { applyKeyMatching, getSchemaShape } from ".";
import { applyTransformations } from "./transformations";

export const processAdapterData = (
  data: Record<string, unknown>,
  schema: SchemaConfig,
  keyMatching: KeyMatching,
  transform?: Transform,
  nestingSeparator?: string,
): Record<string, unknown> => {
  let processedData = data;

  // Apply transformations
  if (transform || nestingSeparator) {
    processedData = applyTransformations(processedData, transform, nestingSeparator);
  }

  // Apply key matching
  if (keyMatching === "strict") {
    return processedData;
  }

  const shape = getSchemaShape(schema);

  if (!shape) {
    return processedData;
  }

  return applyKeyMatching(processedData, shape, keyMatching);
};
