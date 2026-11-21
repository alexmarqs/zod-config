// ZOD3: remove in next major: this import, z3 in FieldSchema, Zod3ErrorConstructor,
// withoutReceivedValue, the mixing check and the aggregator at the end of buildObjectSchema.
import type * as z3 from "zod/v3";
import { $ZodObject } from "zod/v4/core";
import type * as z from "zod/v4/core";
import type { SchemaConfig } from "../../types";

/**
 * A single Zod schema for one variable: Zod 3, Zod 4 or Zod 4 Mini.
 */
export type FieldSchema = z3.ZodTypeAny | z.$ZodType;

type Zod3ErrorConstructor = typeof z3.ZodError;

const isZod4Field = (field: FieldSchema): field is z.$ZodType => "_zod" in field;

/**
 * Zod 3 puts the received input into `invalid_enum_value` and `invalid_literal` issues (and into
 * the default enum message). For environment variables that input may be a secret, and the error
 * is usually printed, so it is removed. Zod 4 does not include the input.
 */
const withoutReceivedValue = (issue: z3.ZodIssue, ZodErrorCtor: Zod3ErrorConstructor) => {
  const sanitized = { ...issue } as z3.ZodIssue & {
    received?: unknown;
    options?: unknown[];
    unionErrors?: z3.ZodError[];
  };

  if (issue.code === "invalid_enum_value" || issue.code === "invalid_literal") {
    if (typeof sanitized.message === "string" && "received" in sanitized) {
      const received = String(sanitized.received);

      if (received !== "" && sanitized.message.includes(received)) {
        // Keep the allowed values: they come from the schema, not the input.
        sanitized.message =
          issue.code === "invalid_enum_value"
            ? `Invalid enum value. Expected ${(sanitized.options ?? [])
                .map((option) => (typeof option === "string" ? `'${option}'` : String(option)))
                .join(" | ")}`
            : "Invalid literal value";
      }
    }

    delete sanitized.received;
  }

  if (Array.isArray(sanitized.unionErrors)) {
    sanitized.unionErrors = sanitized.unionErrors.map(
      (unionError) =>
        new ZodErrorCtor(
          unionError.issues.map((nested) => withoutReceivedValue(nested, ZodErrorCtor)),
        ),
    );
  }

  return sanitized as z3.ZodIssue;
};

/**
 * Build one object schema, accepted by `loadConfigSync`, from a flat shape of Zod schemas.
 *
 * - Zod 4 / Zod 4 Mini: a core object schema.
 * - Zod 3: a small aggregator that runs each field's own `safeParse` and merges the issues into
 *   one `ZodError`. Zod 3 is not imported at runtime so that it never reaches a client bundle.
 */
export const buildObjectSchema = (shape: Record<string, FieldSchema>): SchemaConfig => {
  for (const [key, field] of Object.entries(shape)) {
    // a Zod 4 schema has `_zod`, a Zod 3 schema has `safeParse`
    if (
      typeof field !== "object" ||
      field === null ||
      !("_zod" in field || typeof (field as z3.ZodTypeAny).safeParse === "function")
    ) {
      throw new Error(`Invalid schema for "${key}": expected a Zod schema`);
    }
  }

  const fields = Object.values(shape);
  const zod4Count = fields.filter(isZod4Field).length;

  if (zod4Count > 0 && zod4Count < fields.length) {
    throw new Error("zod-config: cannot mix Zod 3 and Zod 4 schemas");
  }

  if (zod4Count === fields.length) {
    return new $ZodObject({
      type: "object",
      shape: shape as Record<string, z.$ZodType>,
    }) as unknown as SchemaConfig;
  }

  // ZOD3: remove in next major: everything from here to the end of the function.
  const v3Shape = shape as Record<string, z3.ZodTypeAny>;

  return {
    shape: v3Shape,
    safeParse(data: Record<string, unknown> | undefined) {
      const output: Record<string, unknown> = {};
      const issues: z3.ZodIssue[] = [];
      let ZodErrorCtor: Zod3ErrorConstructor | undefined;

      for (const key of Object.keys(v3Shape)) {
        const result = v3Shape[key].safeParse(data?.[key]);

        if (result.success) {
          // Like z.object: keep a key that was set even when it parses to `undefined`, and
          // leave out an optional key that was not set.
          if (result.data !== undefined || (data !== undefined && Object.hasOwn(data, key))) {
            output[key] = result.data;
          }
          continue;
        }

        const ErrorCtor = result.error.constructor as Zod3ErrorConstructor;
        ZodErrorCtor ??= ErrorCtor;

        for (const issue of result.error.issues) {
          issues.push({ ...withoutReceivedValue(issue, ErrorCtor), path: [key, ...issue.path] });
        }
      }

      if (ZodErrorCtor) {
        return { success: false, error: new ZodErrorCtor(issues) };
      }

      return { success: true, data: output };
    },
  } as unknown as SchemaConfig;
};
