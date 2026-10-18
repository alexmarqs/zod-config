import { awsSsmAdapter } from "@/lib/adapters/aws-ssm-adapter";
import { loadConfig } from "@/lib/config";
import type { SSMClient } from "@aws-sdk/client-ssm";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4-mini";

const createClient = (response: unknown) =>
  ({ send: vi.fn(async () => response) }) as unknown as SSMClient;

const parameter = (value: string) => createClient({ Parameter: { Value: value } });

const path = (parameters: Record<string, string>) =>
  createClient({
    Parameters: Object.entries(parameters).map(([Name, Value]) => ({ Name, Value })),
  });

describe("aws ssm adapter", () => {
  it("should return parsed data from a JSON parameter", async () => {
    // given
    const schema = z.object({ HOST: z.string(), PORT: z.string() });
    const client = parameter(JSON.stringify({ HOST: "localhost", PORT: "3000" }));

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSsmAdapter({ client, name: "/app/config" }),
    });

    // then
    expect(config).toEqual({ HOST: "localhost", PORT: "3000" });
  });

  it("should expose a plain-string parameter under `key`", async () => {
    // given
    const schema = z.object({ API_KEY: z.string() });
    const client = parameter("s3cr3t");

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSsmAdapter({ client, name: "/app/api-key", key: "API_KEY" }),
    });

    // then
    expect(config).toEqual({ API_KEY: "s3cr3t" });
  });

  it("should load a path into nested objects", async () => {
    // given
    const schema = z.object({
      LOG_LEVEL: z.string(),
      db: z.object({ HOST: z.string(), PORT: z.string() }),
    });
    const client = path({
      "/app/prod/LOG_LEVEL": "info",
      "/app/prod/db/HOST": "db.local",
      "/app/prod/db/PORT": "5432",
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSsmAdapter({ client, path: "/app/prod" }),
    });

    // then
    expect(config).toEqual({ LOG_LEVEL: "info", db: { HOST: "db.local", PORT: "5432" } });
  });

  it("should match nested path keys leniently", async () => {
    // given
    const schema = z.object({
      database: z.object({ hostName: z.string() }),
    });
    const client = path({ "/app/prod/DATABASE/host-name": "db.local" });

    // when
    const config = await loadConfig({
      schema,
      keyMatching: "lenient",
      adapters: awsSsmAdapter({ client, path: "/app/prod" }),
    });

    // then
    expect(config).toEqual({ database: { hostName: "db.local" } });
  });

  it("should throw zod error when schema is invalid", async () => {
    // given
    const schema = z.object({ db: z.object({ HOST: z.string(), PORT: z.string() }) });
    const client = path({ "/app/prod/db/HOST": "db.local" });

    // when
    // then
    await expect(
      loadConfig({ schema, adapters: awsSsmAdapter({ client, path: "/app/prod" }) }),
    ).rejects.toThrowError(z.core.$ZodError);
  });
});
