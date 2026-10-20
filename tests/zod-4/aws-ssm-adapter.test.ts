import { awsSsmAdapter } from "@/lib/adapters/aws-ssm-adapter";
import { envAdapter } from "@/lib/adapters/env-adapter";
import { loadConfig } from "@/lib/config";
import type { SSMClient } from "@aws-sdk/client-ssm";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const createClient = (response: () => Promise<unknown>) => {
  const send = vi.fn(response);
  return { client: { send } as unknown as SSMClient, send };
};

const parameter = (value?: string) => async () => ({ Parameter: { Value: value } });

describe("aws ssm adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return parsed data from a JSON parameter", async () => {
    // given
    const schema = z.object({ HOST: z.string(), PORT: z.string() });
    const { client, send } = createClient(
      parameter(JSON.stringify({ HOST: "localhost", PORT: "3000" })),
    );

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSsmAdapter({ client, name: "/app/prod/config" }),
    });

    // then
    expect(config).toEqual({ HOST: "localhost", PORT: "3000" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ input: { Name: "/app/prod/config", WithDecryption: true } }),
    );
  });

  it("should expose a plain-string parameter under `key`", async () => {
    // given
    const schema = z.object({ API_KEY: z.string() });
    const { client } = createClient(parameter("s3cr3t"));

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSsmAdapter({ client, name: "/app/api-key", key: "API_KEY" }),
    });

    // then
    expect(config.API_KEY).toBe("s3cr3t");
  });

  it("should keep a JSON parameter as a string under `key` for the schema to parse", async () => {
    // given
    const schema = z.object({
      LAMBDA_NAMES: z
        .string()
        .transform((value) => JSON.parse(value))
        .pipe(z.record(z.string(), z.string())),
    });
    const { client } = createClient(parameter(JSON.stringify({ getExecution: "fn-get" })));

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSsmAdapter({ client, name: "/app/lambda-names", key: "LAMBDA_NAMES" }),
    });

    // then
    expect(config.LAMBDA_NAMES).toEqual({ getExecution: "fn-get" });
  });

  it("should accept the same JSON string from env or ssm under `key`", async () => {
    // given
    const schema = z.object({
      LAMBDA_NAMES: z
        .string()
        .transform((value) => JSON.parse(value))
        .pipe(z.record(z.string(), z.string())),
    });
    const { client } = createClient(parameter(JSON.stringify({ getExecution: "fn-ssm" })));

    // when
    const config = await loadConfig({
      schema,
      adapters: [
        awsSsmAdapter({ client, name: "/app/lambda-names", key: "LAMBDA_NAMES" }),
        envAdapter({ customEnv: { LAMBDA_NAMES: JSON.stringify({ getExecution: "fn-env" }) } }),
      ],
    });

    // then
    expect(config.LAMBDA_NAMES).toEqual({ getExecution: "fn-env" });
  });

  it("should filter keys with regex", async () => {
    // given
    const schema = z.object({ APP_HOST: z.string(), OTHER: z.string().optional() });
    const { client } = createClient(parameter(JSON.stringify({ APP_HOST: "h", OTHER: "o" })));

    // when
    const config = await loadConfig({
      schema,
      adapters: awsSsmAdapter({ client, name: "/app", regex: /^APP_/ }),
    });

    // then
    expect(config).toEqual({ APP_HOST: "h" });
  });

  it("should let a later env adapter override the parameter", async () => {
    // given
    const schema = z.object({ HOST: z.string(), PORT: z.string() });
    const { client } = createClient(parameter(JSON.stringify({ HOST: "from-ssm", PORT: "3000" })));

    // when
    const config = await loadConfig({
      schema,
      adapters: [
        awsSsmAdapter({ client, name: "/app" }),
        envAdapter({ customEnv: { HOST: "from-env" } }),
      ],
    });

    // then
    expect(config).toEqual({ HOST: "from-env", PORT: "3000" });
  });

  describe("path", () => {
    const page = (parameters: Record<string, string>, NextToken?: string) => ({
      Parameters: Object.entries(parameters).map(([Name, Value]) => ({ Name, Value })),
      NextToken,
    });

    it("should load every parameter under the path with the prefix stripped", async () => {
      // given
      const schema = z.object({ DB_HOST: z.string(), DB_PORT: z.coerce.number() });
      const { client, send } = createClient(async () =>
        page({ "/app/prod/DB_HOST": "db.local", "/app/prod/DB_PORT": "5432" }),
      );

      // when
      const config = await loadConfig({
        schema,
        adapters: awsSsmAdapter({ client, path: "/app/prod" }),
      });

      // then
      expect(config).toEqual({ DB_HOST: "db.local", DB_PORT: 5432 });
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { Path: "/app/prod", Recursive: true, WithDecryption: true, NextToken: undefined },
        }),
      );
    });

    it("should follow NextToken across pages", async () => {
      // given
      const schema = z.object({ A: z.string(), B: z.string(), C: z.string() });
      const pages = [page({ "/app/A": "1", "/app/B": "2" }, "token-1"), page({ "/app/C": "3" })];
      const { client, send } = createClient(async () => pages.shift());

      // when
      const config = await loadConfig({
        schema,
        adapters: awsSsmAdapter({ client, path: "/app/" }),
      });

      // then
      expect(config).toEqual({ A: "1", B: "2", C: "3" });
      expect(send).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenLastCalledWith(
        expect.objectContaining({ input: expect.objectContaining({ NextToken: "token-1" }) }),
      );
    });

    it("should nest sub-paths", async () => {
      // given
      const schema = z.object({
        LOG_LEVEL: z.string(),
        db: z.object({ HOST: z.string(), PORT: z.string() }),
      });
      const { client } = createClient(async () =>
        page({
          "/app/prod/LOG_LEVEL": "info",
          "/app/prod/db/HOST": "db.local",
          "/app/prod/db/PORT": "5432",
        }),
      );

      // when
      const config = await loadConfig({
        schema,
        adapters: awsSsmAdapter({ client, path: "/app/prod/" }),
      });

      // then
      expect(config).toEqual({ LOG_LEVEL: "info", db: { HOST: "db.local", PORT: "5432" } });
    });

    it("should filter stripped keys with regex", async () => {
      // given
      const schema = z.object({ APP_HOST: z.string(), OTHER: z.string().optional() });
      const { client } = createClient(async () =>
        page({ "/app/APP_HOST": "h", "/app/OTHER": "o" }),
      );

      // when
      const config = await loadConfig({
        schema,
        adapters: awsSsmAdapter({ client, path: "/app", regex: /^APP_/ }),
      });

      // then
      expect(config).toEqual({ APP_HOST: "h" });
    });

    it("should send the path without a trailing slash", async () => {
      // given
      const { client, send } = createClient(async () => page({ "/app/prod/HOST": "h" }));

      // when
      const data = await awsSsmAdapter({ client, path: "/app/prod/" }).read();

      // then
      expect(data).toEqual({ HOST: "h" });
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ input: expect.objectContaining({ Path: "/app/prod" }) }),
      );
    });

    it("should send an empty path to AWS as is instead of loading the root", async () => {
      // given
      const { client, send } = createClient(async () => {
        throw new Error(
          "1 validation error detected: Value '' at 'path' failed to satisfy constraint",
        );
      });

      // when
      // then
      await expect(awsSsmAdapter({ client, path: "" }).read()).rejects.toThrow(
        /^Failed to read AWS SSM path "": 1 validation error detected/,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ input: expect.objectContaining({ Path: "" }) }),
      );
    });

    it("should keep the root path", async () => {
      // given
      const { client, send } = createClient(async () => page({ "/HOST": "h" }));

      // when
      const data = await awsSsmAdapter({ client, path: "/" }).read();

      // then
      expect(data).toEqual({ HOST: "h" });
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ input: expect.objectContaining({ Path: "/" }) }),
      );
    });

    it("should return an empty object when no parameters exist under the path", async () => {
      // given
      const { client } = createClient(async () => page({}));

      // when
      const data = await awsSsmAdapter({ client, path: "/missing" }).read();

      // then
      expect(data).toEqual({});
    });
  });

  it("should throw a parse error when a plain-string parameter is read without `key`", async () => {
    // given
    const { client } = createClient(parameter("plain-value"));

    // when
    // then
    const read = awsSsmAdapter({ client, name: "/plain" }).read();
    await expect(read).rejects.toThrow(/^Failed to read AWS SSM parameter "\/plain": .*JSON/);
    await expect(read).rejects.not.toThrow("plain-value");
  });

  it.each([
    ["a string", '"plain-value"'],
    ["a number", "8080"],
    ["an array", '["plain-value"]'],
  ])("should throw when the parameter JSON is %s instead of an object", async (_, value) => {
    // given
    const { client } = createClient(parameter(value));

    // when
    // then
    const read = awsSsmAdapter({ client, name: "/scalar" }).read();
    await expect(read).rejects.toThrow(
      /^Failed to read AWS SSM parameter "\/scalar": .*not an object \(set `key`/,
    );
    await expect(read).rejects.not.toThrow("plain-value");
  });

  it("should return an empty object for a null parameter", async () => {
    // given
    const { client } = createClient(parameter("null"));

    // when
    const data = await awsSsmAdapter({ client, name: "/null" }).read();

    // then
    expect(data).toEqual({});
  });

  it("should return an empty object when the parameter has no value", async () => {
    // given
    const { client } = createClient(parameter(undefined));

    // when
    const data = await awsSsmAdapter({ client, name: "/empty" }).read();

    // then
    expect(data).toEqual({});
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
        res.end(
          JSON.stringify({
            Parameter: { Value: JSON.stringify({ HOST: "from-env-endpoint" }) },
          }),
        );
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
    const { awsSsmAdapter: freshAdapter } = await import("@/lib/adapters/aws-ssm-adapter");

    try {
      // when
      const config = await loadConfig({
        schema: z.object({ HOST: z.string() }),
        adapters: freshAdapter({ name: "/app/env" }),
      });

      // then
      expect(config.HOST).toBe("from-env-endpoint");
      expect(requests).toHaveLength(1);
      expect(requests[0].target).toBe("AmazonSSM.GetParameter");
      expect(JSON.parse(requests[0].body)).toEqual({ Name: "/app/env", WithDecryption: true });
    } finally {
      server.close();
    }
  });

  it("should fall back to other adapters when the parameter has no value", async () => {
    // given
    const schema = z.object({ HOST: z.string() });
    const { client } = createClient(parameter(""));
    const consoleWarnSpy = vi.spyOn(console, "warn");

    // when
    const config = await loadConfig({
      schema,
      adapters: [
        awsSsmAdapter({ client, name: "/app/config" }),
        envAdapter({ customEnv: { HOST: "from-env" } }),
      ],
    });

    // then
    expect(config).toEqual({ HOST: "from-env" });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("should fall back to other adapters when no parameters exist under the path", async () => {
    // given
    const schema = z.object({ HOST: z.string() });
    const { client } = createClient(async () => ({ Parameters: [] }));
    const consoleWarnSpy = vi.spyOn(console, "warn");

    // when
    const config = await loadConfig({
      schema,
      adapters: [
        awsSsmAdapter({ client, path: "/app/prod" }),
        envAdapter({ customEnv: { HOST: "from-env" } }),
      ],
    });

    // then
    expect(config).toEqual({ HOST: "from-env" });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("should log adapter errors and throw zod error when schema is invalid", async () => {
    // given
    const schema = z.object({ HOST: z.string() });
    const { client } = createClient(async () => {
      throw new Error("ParameterNotFound");
    });
    const consoleWarnSpy = vi.spyOn(console, "warn");

    // when
    // then
    await expect(
      loadConfig({ schema, adapters: awsSsmAdapter({ client, name: "/app" }) }),
    ).rejects.toThrowError(z.core.$ZodError);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Cannot read data from aws ssm adapter: Failed to read AWS SSM parameter "/app": ParameterNotFound',
    );
  });

  it("should not log adapter errors when silent is true", async () => {
    // given
    const schema = z.object({ HOST: z.string() });
    const { client } = createClient(async () => {
      throw new Error("ParameterNotFound");
    });
    const consoleWarnSpy = vi.spyOn(console, "warn");

    // when
    // then
    await expect(
      loadConfig({
        schema,
        adapters: awsSsmAdapter({ client, name: "/app", silent: true }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
