import { rm, writeFile, mkdir } from "node:fs/promises";
import { afterEach, vi, describe, it, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { z } from "zod/v4";

import { directoryAdapter } from "@/lib/adapters/directory-adapter";
import { scriptAdapter } from "@/lib/adapters/script-adapter";
import * as variables from "@/lib/adapters/directory-adapter/variables";
import { loadConfig } from "@/index";

vi.mock("@/lib/adapters/directory-adapter/variables", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/adapters/directory-adapter/variables")>();
  return {
    ...original,
    resolveConfigResolutionVariables: vi.fn(() => ({
      deploymentName: "development",
      instanceName: null,
      hostname: "localhost",
      shortHostname: "localhost",
    })),
  };
});

describe("Directory adapter tests", () => {
  const schema = z.object({
    foo: z.string(),
    bar: z.number(),
    baz: z.object({
      qux: z.string(),
      corge: z.string(),
    }),
  });

  const directories = ["test-config"];
  const files = [
    {
      fileName: "test-config/default.ts",
      content: `export default { foo: "hello", bar: 10, baz: { qux: "world", corge: "!" } };`,
    },
    {
      fileName: "test-config/development.ts",
      content: `export default { foo: "hiya" };`,
    },
    {
      fileName: "test-config/local-development.ts",
      content: `export default { baz: { qux: "hehee" } };`,
    },
  ];

  beforeAll(async () => {
    // Clean up any existing directories first
    await Promise.all(
      directories.map(async (directory) => {
        try {
          await rm(directory, { recursive: true, force: true });
        } catch (error) {
          // Ignore error if directory doesn't exist
          if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
            console.warn(`Failed to cleanup directory ${directory}:`, error);
            throw error;
          }
        }
      }),
    );

    // Create directories
    await Promise.all(
      directories.map(async (directory) => {
        await mkdir(directory, { recursive: true });
      }),
    );

    // Then create files (can be done in parallel since directories exist)
    await Promise.all(
      files.map(async ({ fileName, content }) => await writeFile(fileName, content)),
    );
  });

  afterAll(async () => {
    await Promise.all(
      directories.map(async (directory) => {
        try {
          await rm(directory, { recursive: true });
        } catch (error) {
          // Ignore error if directory doesn't exist
          if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
            throw error;
          }
        }
      }),
    );
  });

  describe("when deployment is development", () => {
    beforeEach(() => {
      vi.spyOn(variables, "resolveConfigResolutionVariables").mockReturnValue({
        deploymentName: "development",
        instanceName: null,
        hostname: "localhost",
        shortHostname: "localhost",
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return parsed data when it matches schema", async () => {
      // when
      const config = await loadConfig({
        schema,
        adapters: directoryAdapter({
          paths: directories,
          adapters: [
            {
              extensions: [".ts"],
              adapterFactory: (filePath: string) =>
                scriptAdapter({
                  path: filePath,
                }),
            },
          ],
        }),
      });

      // then
      expect(config).toEqual({ foo: "hiya", bar: 10, baz: { qux: "hehee", corge: "!" } });
    });
  });

  describe("when deployment is production", () => {
    beforeEach(() => {
      vi.spyOn(variables, "resolveConfigResolutionVariables").mockReturnValue({
        deploymentName: "production",
        instanceName: null,
        hostname: "localhost",
        shortHostname: "localhost",
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return parsed data when it matches schema", async () => {
      // when
      const config = await loadConfig({
        schema,
        adapters: directoryAdapter({
          paths: directories,
          adapters: [
            {
              extensions: [".ts"],
              adapterFactory: (filePath: string) =>
                scriptAdapter({
                  path: filePath,
                }),
            },
          ],
        }),
      });

      // then
      expect(config).toEqual({ foo: "hello", bar: 10, baz: { qux: "world", corge: "!" } });
    });
  });
});
