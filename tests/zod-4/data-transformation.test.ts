import { describe, it, expect } from "vitest";
import { applyDataTransformation } from "@/lib/utils/data-transformation";

describe("applyTransformations", () => {
  describe("with no transformations", () => {
    it("should return the original data when no transform or nesting separator is provided", () => {
      const data = { key1: "value1", key2: "value2" };
      const result = applyDataTransformation(data);
      expect(result).toEqual(data);
    });
  });

  describe("with transform function", () => {
    it("should apply transform function to each key-value pair", () => {
      const data = { key1: "value1", key2: "value2" };
      const transform = ({ key, value }: { key: string; value: unknown }) => ({
        key: key.toUpperCase(),
        value: `transformed_${value}`,
      });

      const result = applyDataTransformation(data, transform);
      expect(result).toEqual({
        KEY1: "transformed_value1",
        KEY2: "transformed_value2",
      });
    });

    it("should drop key-value pairs when transform returns false", () => {
      const data = { keep: "value1", drop: "value2", keep2: "value3" };
      const transform = ({ key }: { key: string; value: unknown }) => {
        if (key === "drop") return false;
        return { key, value: "transformed" };
      };

      const result = applyDataTransformation(data, transform);
      expect(result).toEqual({
        keep: "transformed",
        keep2: "transformed",
      });
    });

    it("should throw error when transform returns invalid result", () => {
      const data = { key1: "value1" };
      const transform = () => "invalid" as any;

      expect(() => applyDataTransformation(data, transform)).toThrow(
        'Invalid transform result for key "key1": expected { key: string, value: unknown } or false, received: "invalid"',
      );
    });

    it("should throw error when transform returns object without key property", () => {
      const data = { key1: "value1" };
      const transform = () => ({ value: "test" }) as any;

      expect(() => applyDataTransformation(data, transform)).toThrow(
        'Invalid transform result for key "key1": expected { key: string, value: unknown } or false, received: {"value":"test"}',
      );
    });

    it("should throw error when transform returns object without value property", () => {
      const data = { key1: "value1" };
      const transform = () => ({ key: "test" }) as any;

      expect(() => applyDataTransformation(data, transform)).toThrow(
        'Invalid transform result for key "key1": expected { key: string, value: unknown } or false, received: {"key":"test"}',
      );
    });
  });

  describe("with nesting separator", () => {
    it("should apply nesting separator to create nested objects", () => {
      const data = { "database.host": "localhost", "database.port": "5432" };
      const result = applyDataTransformation(data, undefined, ".");

      expect(result).toEqual({
        database: {
          host: "localhost",
          port: "5432",
        },
      });
    });

    it("should handle single level keys without separator", () => {
      const data = { host: "localhost", "database.port": "5432" };
      const result = applyDataTransformation(data, undefined, ".");

      expect(result).toEqual({
        host: "localhost",
        database: {
          port: "5432",
        },
      });
    });

    it("should handle different separators", () => {
      const data = { database_host: "localhost", database_port: "5432" };
      const result = applyDataTransformation(data, undefined, "_");

      expect(result).toEqual({
        database: {
          host: "localhost",
          port: "5432",
        },
      });
    });

    it("should throw error on nested key conflicts", () => {
      const data = { database: "simple_value", "database.host": "localhost" };

      expect(() => applyDataTransformation(data, undefined, ".")).toThrow(
        'Nested key conflict: Cannot create nested object at "database" because it already exists as a primitive value. Conflicting key: "database.host" and "database"',
      );
    });

    it("should throw error when trying to assign to existing object", () => {
      const data = { "database.host": "localhost", database: "simple_value" };

      expect(() => applyDataTransformation(data, undefined, ".")).toThrow(
        'Nested key conflict: "database" cannot be assigned because "database" already exists as an object (created by another key)',
      );
    });
  });

  describe("with both transform and nesting separator", () => {
    it("should apply transform first, then nesting separator", () => {
      const data = { "db.host": "localhost", "db.port": "5432" };
      const transform = ({ key, value }: { key: string; value: unknown }) => ({
        key: key.replace("db", "database"),
        value: `env_${value}`,
      });

      const result = applyDataTransformation(data, transform, ".");
      expect(result).toEqual({
        database: {
          host: "env_localhost",
          port: "env_5432",
        },
      });
    });

    it("should drop keys from transform before applying nesting separator", () => {
      const data = { "db.host": "localhost", "db.secret": "password", "db.port": "5432" };
      const transform = ({ key, value }: { key: string; value: unknown }) => {
        if (key.includes("secret")) return false;
        return {
          key: key.replace("db", "database"),
          value,
        };
      };

      const result = applyDataTransformation(data, transform, ".");
      expect(result).toEqual({
        database: {
          host: "localhost",
          port: "5432",
        },
      });
    });

    it("should handle complex transformations with nesting", () => {
      const data = {
        API_KEY: "secret123",
        DB_HOST: "localhost",
        DB_PORT: "5432",
        CACHE_TTL: "3600",
      };

      const transform = ({ key, value }: { key: string; value: unknown }) => {
        const lowerKey = key.toLowerCase().replace("_", ".");
        return { key: lowerKey, value };
      };

      const result = applyDataTransformation(data, transform, ".");
      expect(result).toEqual({
        api: { key: "secret123" },
        db: { host: "localhost", port: "5432" },
        cache: { ttl: "3600" },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty data object", () => {
      const result = applyDataTransformation({}, undefined, ".");
      expect(result).toEqual({});
    });

    it("should handle values of different types", () => {
      const data = {
        "config.string": "text",
        "config.number": 42,
        "config.boolean": true,
        "config.null": null,
        "config.array": [1, 2, 3],
        "config.object": { nested: "value" },
      };

      const result = applyDataTransformation(data, undefined, ".");
      expect(result).toEqual({
        config: {
          string: "text",
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: "value" },
        },
      });
    });

    it("should handle keys with multiple separators", () => {
      const data = { "a.b.c": "value1", "a.b.d": "value2" };
      const result = applyDataTransformation(data, undefined, ".");

      expect(result).toEqual({
        a: {
          b: {
            c: "value1",
            d: "value2",
          },
        },
      });
    });

    it("should handle empty string separator", () => {
      const data = { "database.host": "localhost" };
      const result = applyDataTransformation(data, undefined, "");

      expect(result).toEqual({
        "database.host": "localhost",
      });
    });

    it("should handle object values with keys containing separator", () => {
      const data = {
        key1: {
          "subkey.something": "nested_object_value",
          normal_key: "normal_value",
        },
        "key2.nested": "flat_value",
      };
      const result = applyDataTransformation(data, undefined, ".");

      // Object values are preserved as-is, only top-level keys get split
      expect(result).toEqual({
        key1: {
          "subkey.something": "nested_object_value",
          normal_key: "normal_value",
        },
        key2: {
          nested: "flat_value",
        },
      });
    });
  });
});
