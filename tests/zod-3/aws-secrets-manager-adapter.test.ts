import { awsSecretsManagerAdapter } from "@/lib/adapters/aws-secrets-manager-adapter";
import { loadConfig } from "@/lib/config";
import type { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v3";

const createClient = (secretString: string) =>
  ({
    send: vi.fn(async () => ({ SecretString: secretString })),
  }) as unknown as SecretsManagerClient;

describe("aws secrets manager adapter", () => {
  it("should return parsed data when schema is valid", async () => {
    // given
    const schema = z.object({ HOST: z.string(), PORT: z.string() });
    const client = createClient(JSON.stringify({ HOST: "localhost", PORT: "3000" }));

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSecretsManagerAdapter({ client, secretId: "app" }),
    });

    // then
    expect(config).toEqual({ HOST: "localhost", PORT: "3000" });
  });

  it("should expose a plain-string secret under `key`", async () => {
    // given
    const schema = z.object({ DB_PASSWORD: z.string() });
    const client = createClient("s3cr3t");

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSecretsManagerAdapter({ client, secretId: "db", key: "DB_PASSWORD" }),
    });

    // then
    expect(config).toEqual({ DB_PASSWORD: "s3cr3t" });
  });

  it("should match keys leniently", async () => {
    // given
    const schema = z.object({ apiKey: z.string() });
    const client = createClient(JSON.stringify({ API_KEY: "k" }));

    // when
    const config = await loadConfig({
      schema,
      keyMatching: "lenient",
      adapters: awsSecretsManagerAdapter({ client, secretId: "app" }),
    });

    // then
    expect(config).toEqual({ apiKey: "k" });
  });

  it("should throw zod error when schema is invalid", async () => {
    // given
    const schema = z.object({ HOST: z.string(), PORT: z.string() });
    const client = createClient(JSON.stringify({ HOST: "localhost" }));

    // when
    // then
    await expect(
      loadConfig({ schema, adapters: awsSecretsManagerAdapter({ client, secretId: "app" }) }),
    ).rejects.toThrowError(z.ZodError);
  });
});
