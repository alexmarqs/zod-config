import { envAdapter } from "../adapters/env-adapter";
import { loadConfigSync } from "../config-sync";
import { getSafeProcessEnv } from "../utils/get-safe-process-env";
import { type FieldSchema, buildObjectSchema } from "./build-schema";
import type { EnvConfigError } from "./types";

export type LoadEnvConfigInput = {
  server?: Record<string, FieldSchema>;
  client?: Record<string, FieldSchema>;
  runtimeEnv?: Record<string, unknown>;
  onError?: (error: EnvConfigError) => void;
  skipValidation?: boolean;
  isServer?: boolean;
};

const isValidationError = (error: unknown): error is EnvConfigError =>
  typeof error === "object" && error !== null && Array.isArray((error as EnvConfigError).issues);

/**
 * One line per issue: `KEY: message`. Only `path` and `message` are used, so this works with
 * Zod 3, Zod 4 and Zod 4 Mini. Messages carry no input values: Zod 4 leaves them out by default,
 * and `buildObjectSchema` strips them from Zod 3 issues.
 */
const formatIssues = (error: EnvConfigError) =>
  error.issues
    .map((issue) => `  ${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

/**
 * Copy the given keys from a source object. Missing and empty-string values are left out, so an
 * empty variable (`FOO=`) is treated as not set.
 */
const pickValues = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  keys: string[],
) => {
  for (const key of keys) {
    const value = source[key];

    if (value !== undefined && value !== "") {
      target[key] = value;
    }
  }
};

/**
 * Validate server and client environment variables for an app with a browser bundle.
 *
 * - On the server, both shapes are validated. Server values are read from `runtimeEnv` first,
 *   then `process.env`.
 * - In the browser, only the client shape is validated and server values are never read.
 * - Client values are only ever read from `runtimeEnv`. Only declared keys are read from it.
 *
 * The public prefix is a parameter so framework presets can share this implementation.
 */
export const loadEnvConfigWithPrefix = (
  clientPrefix: string | undefined,
  options: LoadEnvConfigInput,
): Record<string, unknown> => {
  const server = options?.server ?? {};
  const client = options?.client ?? {};
  const serverKeys = Object.keys(server);
  const clientKeys = Object.keys(client);

  if (serverKeys.length === 0 && clientKeys.length === 0) {
    throw new Error('loadEnvConfig requires at least one key in "server" or "client"');
  }

  if (clientKeys.length > 0 && !clientPrefix) {
    throw new Error(
      'loadEnvConfig requires a non-empty "clientPrefix" when "client" keys are defined',
    );
  }

  for (const key of clientKeys) {
    if (!key.startsWith(clientPrefix as string)) {
      throw new Error(
        `Invalid client environment variable name "${key}": client keys must start with "${clientPrefix}"`,
      );
    }
  }

  if (clientPrefix) {
    for (const key of serverKeys) {
      if (key.startsWith(clientPrefix)) {
        throw new Error(
          `Invalid server environment variable name "${key}": server keys must not start with "${clientPrefix}"`,
        );
      }
    }
  }

  if (clientKeys.length > 0 && !options.runtimeEnv) {
    throw new Error('loadEnvConfig requires "runtimeEnv" when "client" keys are defined');
  }

  const isServer = options.isServer ?? typeof window === "undefined";

  // Server values are only read on the server, and only for declared keys.
  const values: Record<string, unknown> = {};

  if (isServer) {
    // Server values: an entry in `runtimeEnv` wins (what the caller passes explicitly), and
    // `process.env` fills in the rest. `runtimeEnv` also covers runtimes without
    // `process.env`, and Vite and Astro, which expose `.env` values on `import.meta.env`.
    pickValues(values, getSafeProcessEnv(), serverKeys);
    pickValues(values, options.runtimeEnv ?? {}, serverKeys);
  }

  pickValues(values, options.runtimeEnv ?? {}, clientKeys);

  let result = values;

  if (!options.skipValidation) {
    const schema = buildObjectSchema(isServer ? { ...server, ...client } : client);

    try {
      result = loadConfigSync({ schema, adapters: envAdapter({ customEnv: values }) });
    } catch (error) {
      if (!isValidationError(error)) {
        throw error;
      }

      // An env that failed validation must never be returned, so this always throws. `onError`
      // can report the Zod error, or throw its own error instead of this one. The Zod error is
      // not attached as `cause`: Node prints the cause chain, which would repeat the raw issues
      // JSON under the readable message in terminal and build output.
      options.onError?.(error);

      throw new Error(`Invalid environment variables:\n${formatIssues(error)}`);
    }
  }

  // On the server there is nothing to guard, so reads stay plain property reads.
  if (isServer) {
    return result;
  }

  const serverKeySet = new Set(serverKeys);

  // The guard catches mistakes early. It is not what keeps secrets out of the browser:
  // server values are never read there in the first place.
  return new Proxy(result, {
    get(target, key, receiver) {
      if (typeof key === "string" && serverKeySet.has(key)) {
        throw new Error(`Cannot access server environment variable "${key}" on the client`);
      }

      return Reflect.get(target, key, receiver);
    },
  });
};
