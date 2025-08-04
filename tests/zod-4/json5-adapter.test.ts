import { json5Adapter } from "@/lib/adapters/json5-adapter";
import { loadConfig } from "@/lib/config";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

describe("json5 adapter", () => {
  const testFilePath = path.join(__dirname, "test-json5-adapter.json5");

  beforeAll(async () => {
    const json5Content = `
{
  // Server settings
  host: 'localhost',       // Single quotes + unquoted key
  port: 3000,              // Trailing comma

  // Enable features
  features: {
    logging: true,
    debug: true,
    // analytics: false,   // Temporarily disabled
  },

  // List of allowed IPs
  allowedIPs: [
    '192.168.0.1',
    '10.0.0.1',  // Local access
    // '0.0.0.0', // Commented out for now
  ],

  // Long string (multi-line)
  welcomeMessage: 'Welcome to \
the JSON5-configured system!',
}`.trim();

    await writeFile(testFilePath, json5Content, "utf8");
  });

  afterAll(async () => {
    await unlink(testFilePath);
  });

  it("should return parsed data when schema is valid", async () => {
    const schema = z.object({
      host: z.string(),
      port: z.number(),
      features: z.object({
        logging: z.boolean(),
        debug: z.boolean(),
      }),
      allowedIPs: z.array(z.string()),
      welcomeMessage: z.string(),
    });

    const config = await loadConfig({
      schema,
      adapters: json5Adapter({
        path: testFilePath,
      }),
    });

    expect(config.host).toBe("localhost");
    expect(config.port).toBe(3000);
    expect(config.features.logging).toBe(true);
    expect(config.features.debug).toBe(true);
    expect(config.allowedIPs).toEqual(["192.168.0.1", "10.0.0.1"]);
    expect(config.welcomeMessage).toBe("Welcome to the JSON5-configured system!");
  });

  it("should throw zod error when schema is invalid", async () => {
    const schema = z.object({
      host: z.string(),
      port: z.string().regex(/^\d+$/), // expecting string, but it's a number
    });

    await expect(
      loadConfig({
        schema,
        adapters: json5Adapter({
          path: testFilePath,
        }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);
  });

  it("should log error from adapter errors + throw zod error when schema is invalid", async () => {
    const schema = z.object({
      host: z.string(),
      port: z.string().regex(/^\d+$/),
    });
    const consoleErrorSpy = vi.spyOn(console, "warn");

    await expect(
      loadConfig({
        schema,
        adapters: json5Adapter({
          path: "not-exist.json5",
        }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Cannot read data from json5 adapter: Failed to parse / read JSON5 file at not-exist.json5: ENOENT: no such file or directory, open 'not-exist.json5'",
    );
  });
});
