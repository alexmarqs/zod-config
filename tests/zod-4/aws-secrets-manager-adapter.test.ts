import { awsSecretsManagerAdapter } from "@/lib/adapters/aws-secrets-manager-adapter";
import { loadConfig } from "@/lib/config";
import type { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const createClient = (response: () => Promise<unknown>) => {
  const send = vi.fn(response);
  return { client: { send } as unknown as SecretsManagerClient, send };
};

describe("aws secrets manager adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return parsed data from a JSON secret", async () => {
    // given
    const schema = z.object({ HOST: z.string(), PORT: z.string() });
    const { client, send } = createClient(async () => ({
      SecretString: JSON.stringify({ HOST: "localhost", PORT: "3000" }),
    }));

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSecretsManagerAdapter({ client, secretId: "app/prod" }),
    });

    // then
    expect(config).toEqual({ HOST: "localhost", PORT: "3000" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ input: { SecretId: "app/prod" } }));
  });

  it("should expose a plain-string secret under `key`", async () => {
    // given
    const schema = z.object({ DB_PASSWORD: z.string() });
    const { client } = createClient(async () => ({ SecretString: "s3cr3t" }));

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSecretsManagerAdapter({ client, secretId: "db", key: "DB_PASSWORD" }),
    });

    // then
    expect(config.DB_PASSWORD).toBe("s3cr3t");
  });

  it("should filter keys with regex", async () => {
    // given
    const schema = z.object({ APP_HOST: z.string(), OTHER: z.string().optional() });
    const { client } = createClient(async () => ({
      SecretString: JSON.stringify({ APP_HOST: "h", OTHER: "o" }),
    }));

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSecretsManagerAdapter({ client, secretId: "app", regex: /^APP_/ }),
    });

    // then
    expect(config).toEqual({ APP_HOST: "h" });
  });

  it("should return an empty object when the secret has no value", async () => {
    // given
    const { client } = createClient(async () => ({}));

    // when
    const data = await awsSecretsManagerAdapter({ client, secretId: "empty" }).read();

    // then
    expect(data).toEqual({});
  });

  it("should throw a parse error when a plain-string secret is read without `key`", async () => {
    // given
    const { client } = createClient(async () => ({ SecretString: "sk_live_abc123" }));

    // when
    // then
    const read = awsSecretsManagerAdapter({ client, secretId: "plain" }).read();
    await expect(read).rejects.toThrow(/^Failed to read AWS secret "plain": .*JSON/);
    await expect(read).rejects.not.toThrow("sk_live_abc123");
  });

  it.each([
    ["a string", '"sk_live_abc123"'],
    ["a number", "8080"],
    ["an array", '["sk_live_abc123"]'],
  ])("should throw when the secret JSON is %s instead of an object", async (_, value) => {
    // given
    const { client } = createClient(async () => ({ SecretString: value }));

    // when
    // then
    const read = awsSecretsManagerAdapter({ client, secretId: "scalar", regex: /.*/ }).read();
    await expect(read).rejects.toThrow(/^Failed to read AWS secret "scalar": .*not a JSON object/);
    await expect(read).rejects.not.toThrow("sk_live_abc123");
  });

  it("should throw for a binary secret", async () => {
    // given
    const { client } = createClient(async () => ({ SecretBinary: new Uint8Array([1, 2, 3]) }));

    // when
    // then
    await expect(awsSecretsManagerAdapter({ client, secretId: "bin" }).read()).rejects.toThrow(
      /^Failed to read AWS secret "bin": binary secrets are not supported/,
    );
  });

  it("should return an empty object for an empty or null secret", async () => {
    // given
    const empty = createClient(async () => ({ SecretString: "" })).client;
    const nullJson = createClient(async () => ({ SecretString: "null" })).client;

    // when
    const emptyData = await awsSecretsManagerAdapter({ client: empty, secretId: "blank" }).read();
    const nullData = await awsSecretsManagerAdapter({ client: nullJson, secretId: "null" }).read();

    // then
    expect(emptyData).toEqual({});
    expect(nullData).toEqual({});
  });

  it("should resolve endpoint and region from env when using the default client", async () => {
    // given
    const requests: { target?: string; body: string }[] = [];
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        requests.push({ target: req.headers["x-amz-target"] as string, body });
        res.setHeader("content-type", "application/x-amz-json-1.1");
        res.end(JSON.stringify({ SecretString: JSON.stringify({ HOST: "from-env-endpoint" }) }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    vi.stubEnv("AWS_ENDPOINT_URL", `http://127.0.0.1:${port}`);
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "test");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "test");

    // fresh module so the shared default client is created with the stubbed env
    vi.resetModules();
    const { awsSecretsManagerAdapter: freshAdapter } = await import(
      "@/lib/adapters/aws-secrets-manager-adapter"
    );

    try {
      // when
      const config = await loadConfig({
        schema: z.object({ HOST: z.string() }),
        adapters: freshAdapter({ secretId: "app/env" }),
      });

      // then
      expect(config.HOST).toBe("from-env-endpoint");
      expect(requests).toHaveLength(1);
      expect(requests[0].target).toBe("secretsmanager.GetSecretValue");
      expect(JSON.parse(requests[0].body)).toEqual({ SecretId: "app/env" });
    } finally {
      server.close();
    }
  });

  it("should log adapter errors and throw zod error when schema is invalid", async () => {
    // given
    const schema = z.object({ HOST: z.string() });
    const { client } = createClient(async () => {
      throw new Error("AccessDeniedException");
    });
    const consoleWarnSpy = vi.spyOn(console, "warn");

    // when
    // then
    await expect(
      loadConfig({ schema, adapters: awsSecretsManagerAdapter({ client, secretId: "app" }) }),
    ).rejects.toThrowError(z.core.$ZodError);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Cannot read data from aws secrets manager adapter: Failed to read AWS secret "app": AccessDeniedException',
    );
  });

  it("should not log adapter errors when silent is true", async () => {
    // given
    const schema = z.object({ HOST: z.string() });
    const { client } = createClient(async () => {
      throw new Error("AccessDeniedException");
    });
    const consoleWarnSpy = vi.spyOn(console, "warn");

    // when
    // then
    await expect(
      loadConfig({
        schema,
        adapters: awsSecretsManagerAdapter({ client, secretId: "app", silent: true }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
