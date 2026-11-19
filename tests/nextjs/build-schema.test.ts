import { buildObjectSchema } from "@/lib/env/build-schema";
import { describe, expect, it } from "vitest";
import { z as z3 } from "zod/v3";
import { z as z4 } from "zod/v4";
import { z as zm } from "zod/v4-mini";
import { safeParse } from "zod/v4/core";

describe("buildObjectSchema", () => {
  it("should build a zod 4 object schema from a shape", () => {
    const schema = buildObjectSchema({ A: z4.string().url(), B: z4.coerce.number().default(3) });

    expect("_zod" in schema).toBe(true);
    expect(safeParse(schema as any, { A: "https://x.dev" })).toEqual({
      success: true,
      data: { A: "https://x.dev", B: 3 },
    });
  });

  it("should build a zod 4 mini object schema from a shape", () => {
    const schema = buildObjectSchema({ A: zm.string(), C: zm.optional(zm.string()) });

    expect(safeParse(schema as any, { A: "a" })).toEqual({ success: true, data: { A: "a" } });
  });

  it("should build a zod 3 compatible schema that applies defaults and drops unknown keys", () => {
    const schema = buildObjectSchema({
      A: z3.string().url(),
      B: z3.coerce.number().default(3),
    }) as any;

    expect("_zod" in schema).toBe(false);
    expect(schema.safeParse({ A: "https://x.dev", EXTRA: "x" })).toEqual({
      success: true,
      data: { A: "https://x.dev", B: 3 },
    });
  });

  it("should report every failing zod 3 key in one ZodError with prefixed paths", () => {
    const schema = buildObjectSchema({
      A: z3.string().url(),
      N: z3.object({ x: z3.number() }),
    }) as any;

    const result = schema.safeParse({ A: "nope", N: { x: "1" } });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(z3.ZodError);
    expect(result.error.issues.map((issue: z3.ZodIssue) => issue.path)).toEqual([
      ["A"],
      ["N", "x"],
    ]);
  });

  it("should throw a clear error when zod 3 and zod 4 schemas are mixed", () => {
    expect(() => buildObjectSchema({ A: z3.string(), B: z4.string() })).toThrow(
      "zod-config: cannot mix Zod 3 and Zod 4 schemas",
    );
  });

  it("should throw a clear error when a field is not a Zod schema", () => {
    expect(() => buildObjectSchema({ A: "x" as any })).toThrow(
      'Invalid schema for "A": expected a Zod schema',
    );
    expect(() => buildObjectSchema({ B: undefined as any })).toThrow(
      'Invalid schema for "B": expected a Zod schema',
    );
  });

  it("should accept an empty shape", () => {
    expect(safeParse(buildObjectSchema({}) as any, {})).toEqual({ success: true, data: {} });
  });
});
