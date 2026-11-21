<p align="center">
  <img src="https://github.com/alexmarqs/zod-config/blob/main/.github/assets/logo.png?raw=true" alt="Zod Config logo" width="180" />
</p>

# Zod Config

Load configuration variables from multiple sources type safely using Zod.



![](https://github.com/alexmarqs/zod-config/actions/workflows/ci-cd.yaml/badge.svg)![](https://img.shields.io/badge/License-MIT-yellow.svg) ![](https://img.shields.io/npm/dt/zod-config.svg)

[NPM](https://www.npmjs.com/package/zod-config)

> The new **major version** supports both [Zod 4](https://zod.dev/v4) and [Zod 3](https://v3.zod.dev/) out of the box. Check the [compatibility](#compatibility) section for more details.

## Features

- 👮‍♂️ **Type safety**. Zod Config uses [Zod](https://zod.dev/);
- 🤌 **Tiny**. Zod Config is a tiny library with no dependencies, tree-shaking friendly;
- ✨ **Flexible**. [Combine multiple adapters](#combine-multiple-adapters) to load the configuration from different sources. We deeply merge the configuration from different sources, following the order of the adapters provided; Create your own adapters easily; Use the callback functions to handle errors and success due to the async nature of the adapters;
- 🪴 **Easy to use**. Zod Config is designed to be easy to use, with a simple API;
- 🔄 **Async / Sync support**. Zod Config provides both asynchronous and synchronous APIs to fit different application needs;
- ▲ **Next.js, Vite, Astro, TanStack Start**. Type-safe [environment variables](#type-safe-environment-variables) with server and client schemas, checked when the build starts;

## Install

```bash
npm install zod-config zod # npm
pnpm add zod-config zod # pnpm
yarn add zod-config zod # yarn
```

## Table of contents:

- [Quick Start](#quick-start)
- [Compatibility](#compatibility)
- [Basic Usage](#basic-usage)
  - [Default Adapter](#default-adapter)
  - [Synchronous loading](#synchronous-loading)
- [Built In Adapters](#built-in-adapters)
  - [Env Adapter](#env-adapter)
  - [JSON Adapter](#json-adapter)
  - [JSON5 Adapter](#json5-adapter)
  - [YAML Adapter](#yaml-adapter)
  - [TOML Adapter](#toml-adapter)
  - [Dotenv Adapter](#dotenv-adapter)
  - [Script Adapter](#script-adapter)
  - [Directory Adapter](#directory-adapter)
  - [AWS Secrets Manager Adapter](#aws-secrets-manager-adapter)
  - [AWS SSM Adapter](#aws-ssm-adapter)
- [Type-safe Environment Variables](#type-safe-environment-variables)
  - [Next.js](#nextjs)
  - [Vite, Astro, TanStack Start](#vite-astro-tanstack-start)
  - [Options](#options)
- [Advanced Features](#advanced-features)
  - [Load once](#load-once)
  - [Combine multiple adapters](#combine-multiple-adapters)
  - [Transform function](#transform-function)
  - [Lenient key matching](#lenient-key-matching)
  - [Silent mode](#silent-mode)
  - [Callbacks](#callbacks)
  - [Custom Logger](#custom-logger)
- [Contributing notes](#contributing-notes)
- [On the web](#on-the-web)

## Quick Start

Zod Config provides both asynchronous and synchronous APIs for loading configuration:

- `loadConfig`: Asynchronous function that takes a Zod Object schema and returns a promise resolving to the validated configuration object;
- `loadConfigSync`: Synchronous version that takes the same configuration but returns the result directly without a promise;

> **Note**: `loadConfigSync` only supports synchronous adapters and schemas. For details on compatibility, see [Synchronous loading](#synchronous-loading).

Here are the available configuration options:

Here are the available configuration options for `loadConfig` and `loadConfigSync`:

| Property | Type | Description | Required | Global | Adapter |
| --- | --- | --- | --- | --- | --- |
| `schema` | `AnyZodObject` | A Zod Object schema to validate the configuration. | ✅ | N/A | N/A |
| `adapters` | `Array<Adapter \| SyncAdapter> \| Adapter \| SyncAdapter` | Adapter(s) to load the configuration from. If not provided, process.env will be used. | ❌ | N/A | N/A |
| `onError` | `(error: InferredErrorConfig<T>) => void)` | A callback to be called when an error occurs. | ❌ | ✅ | ❌ |
| `onSuccess` | `(data: InferredDataConfig<S>) => void` | A callback to be called when the configuration is loaded successfully. | ❌ | ✅ | ❌ |
| `logger` | `Logger` | A custom logger to be used to log messages. By default, it uses `console`. | ❌ | ✅ | ❌ |
| `keyMatching` | `'strict' \| 'lenient'` | How to match keys between the schema and the data of the adapters. By default, it uses `strict`. | ❌ | ✅ | ✅ |
| `silent` | `boolean` | Whether to suppress errors. By default, it is `false`. | ❌ | ✅ | ✅ |
| `transform` | `(obj: { key: string; value: unknown }) => { key: string; value: unknown } \| false` | Function to transform key-value pairs before processing. If the function returns `false`, the key-value pair will be dropped. | ❌ | ✅ | ✅ |

> **Note**: Options marked as both "Global" and "Adapter" can be set at the global level (affecting all adapters) or at individual adapter level (affecting only that adapter). When both are provided, the adapter-level option takes precedence. For specific adapter options, check the section of the adapter you are using. 

From the package we also expose the necessary types in case you want to use them in your own adapters. Some of the options are shared between the global config and the adapter config, so you can use them in your own adapters as well. 

This library provides some built in adapters to load the configuration from different sources via modules. You can easily import them from `zod-config/<built-in-adapter-module-name>`. 

### Compatibility

Zod Config supports both [Zod 4](https://zod.dev/v4) and [Zod 3](https://v3.zod.dev/) out of the box. To start using it, just make sure you have the correct versions of `zod-config` (zod-config@^1.0.0) and `zod` (zod@^3.25.1 or zod@^4.0.0)! 

> [!WARNING]
> Zod 3 support is deprecated and will be removed in the next major version. Use Zod 4 or Zod 4 Mini for new code.

```ts
// Using Zod 4
import { z } from "zod/v4"; // for ^4.0.0 zod versions, you can import from "zod" instead
// Using Zod 4 Mini
import { z } from "zod/v4-mini"; // for ^4.0.0 zod versions, you can import from "zod/mini" instead
// Using Zod 3
import { z } from "zod/v3";

import { loadConfig } from "zod-config";
import { envAdapter } from "zod-config/env-adapter";

const schema = z.object({
  name: z.string(),
});

const config = await loadConfig({
  schema,
  adapters: [
    envAdapter(),
  ],
});
```

## Basic Usage

### Default Adapter

By default, Zod Config will load the configuration from `process.env`, no need to provide any adapter.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const config = await loadConfig({
  schema: schemaConfig
});

// config is now type safe!
console.log(config.port)
console.log(config.host)
```

### Built In Adapters

#### Env Adapter

Loads the configuration from `process.env` or a custom object, allowing you to filter the keys using a `regex` (this can be useful when you have multiple adapters and you want to filter the keys to avoid conflicts or just to keep only the keys you need to process). To support nested objects, you can use the `nestingSeparator` property that will be used to create nested objects from flat keys based on the separator.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

// using default env (process.env)
const config = await loadConfig({
  schema: schemaConfig,
  adapters: envAdapter(),
});

// using custom env + filter regex to match only the keys we need
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: envAdapter({ 
    regex: /^MY_APP_/,
    customEnv: {
      MY_APP_PORT: '3000',
      MY_APP_HOST: 'localhost',
      IGNORED_KEY: 'ignored',
    }})
});

// using nesting separator to create nested objects
const nestedConfig = await loadConfig({
  schema: z.object({
    database: z.object({
      host: z.string(),
      port: z.string(),
    }),
  }),
  adapters: envAdapter({
    customEnv: {
      'database.host': 'localhost',
      'database.port': '5432',
    },
    nestingSeparator: '.',
  }),
});
```

#### JSON Adapter

Loads the configuration from a `json` file.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { jsonAdapter } from 'zod-config/json-adapter';
import path from 'path';

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

const filePath = path.join(__dirname, 'config.json');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: jsonAdapter({ path: filePath }),
});

// using filter regex to match only the keys we need
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: jsonAdapter({ 
    path: filePath,
    regex: /^MY_APP_/,
  }),
});
```

#### JSON5 Adapter

Loads the configuration from a `json5` file. In order to use this adapter, you need to install `json5` (peer dependency), if you don't have it already.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { json5Adapter } from 'zod-config/json5-adapter';
import path from 'path';

/** content of config.json5
{
  // Server settings
  host: 'localhost',       // Single quotes + unquoted key
  port: 3000,              // Trailing comma
  allowedIPs: [
    '192.168.0.1',
    '10.0.0.1',  // Local access
  ]
}
*/

const filePath = path.join(__dirname, 'config.json5');

const schemaConfig = z.object({
  host: z.string(),
  port: z.number(),
  allowedIPs: z.array(z.string()),
});

const config = await loadConfig({
  schema: schemaConfig,
  adapters: json5Adapter({ path: filePath }),
});
```

#### YAML Adapter

Loads the configuration from a `yaml` file. In order to use this adapter, you need to install `yaml` (peer dependency), if you don't have it already.

```bash
npm install yaml
```

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { yamlAdapter } from 'zod-config/yaml-adapter';
import path from 'path';

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

const filePath = path.join(__dirname, 'config.yaml');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: yamlAdapter({ path: filePath }),
});

// using filter regex to match only the keys we need
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: yamlAdapter({ 
    path: filePath,
    regex: /^MY_APP_/,
  }),
});
```

#### TOML Adapter

Loads the configuration from a `toml` file. In order to use this adapter, you need to install `smol-toml` (peer dependency), if you don't have it already.

```bash
npm install smol-toml
```

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { tomlAdapter } from 'zod-config/toml-adapter';
import path from 'path';

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

const filePath = path.join(__dirname, 'config.toml');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: tomlAdapter({ path: filePath }),
});

// using filter regex to match only the keys we need
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: tomlAdapter({ 
    path: filePath,
    regex: /^MY_APP_/,
  }),
});
```

#### Dotenv Adapter

Loads the configuration from a `.env` file. In order to use this adapter, you need to install `dotenv` (peer dependency), if you don't have it already. To support nested objects, you can use the `nestingSeparator` property that will be used to create nested objects from flat keys based on the separator.

```bash
npm install dotenv
```

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { dotEnvAdapter } from 'zod-config/dotenv-adapter';
import path from 'path';

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

const filePath = path.join(__dirname, '.env');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: dotEnvAdapter({ path: filePath }),
});

// using filter regex to match only the keys we need
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: dotEnvAdapter({ 
    path: filePath,
    regex: /^MY_APP_/,
  }),
});

// using nesting separator to create nested objects
// .env file content: DATABASE_HOST=localhost\nDATABASE_PORT=5432
const nestedConfig = await loadConfig({
  schema: z.object({
    DATABASE: z.object({
      HOST: z.string(),
      PORT: z.string(),
    }),
  }),
  adapters: dotEnvAdapter({
    path: filePath,
    nestingSeparator: '_',
  }),
});
```

#### Script Adapter

Loads configuration from TypeScript (`.ts`), JavaScript (`.js`), or JSON (`.json`) files. The `.ts` and `.js` files must export a default object with the configuration data.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { scriptAdapter } from 'zod-config/script-adapter';
import path from 'path';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

// config.ts might contain: export default { port: '3000', host: 'localhost' }
const filePath = path.join(__dirname, 'config.ts');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: scriptAdapter({
    path: filePath,
  }),
});
```

#### Directory Adapter

Loads configuration from a directory containing multiple configuration files (usually used in combination with the `scriptAdapter` and/or other file related adapter). Inspired by [node-config](https://github.com/node-config/node-config/wiki/Configuration-Files#file-load-order), the files in the config directory are loaded in the following order:

```
default.EXT
default-{instance}.EXT
{deployment}.EXT
{deployment}-{instance}.EXT
{short_hostname}.EXT
{short_hostname}-{instance}.EXT
{short_hostname}-{deployment}.EXT
{short_hostname}-{deployment}-{instance}.EXT
{hostname}.EXT
{hostname}-{instance}.EXT
{hostname}-{deployment}.EXT
{hostname}-{deployment}-{instance}.EXT
local.EXT
local-{instance}.EXT
local-{deployment}.EXT
local-{deployment}-{instance}.EXT
```

Where `EXT` is the file extension (e.g., `ts`, `js`, `json`), `instance` is the `NODE_APP_INSTANCE` environment variable, `deployment` is the `NODE_CONFIG_ENV` or `NODE_ENV` environment variables, `hostname` is the `HOST`, `HOSTNAME` environment variables or `os.hostname()` and `short_hostname` is the first part of the hostname.

This adapter can be useful when using version control to manage different configurations for different environments.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { directoryAdapter } from 'zod-config/directory-adapter';
import { scriptAdapter } from 'zod-config/script-adapter';
import path from 'path';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const directories = [path.join(__dirname, 'config-dir')];

const config = await loadConfig({
  schema,
  adapters: directoryAdapter({
    paths: directories,
    adapters: [
      {
        // Restrict adapter to handle only ts files
        extensions: [".ts"], 
         // Use the scriptAdapter for handling .ts files
        adapterFactory: (filePath: string) => 
          scriptAdapter({
            path: filePath,
          }),
      },
      // {
      //  Add here other adapters for other file types if needed
      // }
    ],
  }),
});
```

#### AWS Secrets Manager Adapter

Loads the configuration from an [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) secret. In order to use this adapter, you need to install `@aws-sdk/client-secrets-manager` (peer dependency), if you don't have it already.

```bash
npm install @aws-sdk/client-secrets-manager
```

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { awsSecretsManagerAdapter } from 'zod-config/aws-secrets-manager-adapter';

// JSON secret {"DB_HOST": "...", "DB_PASSWORD": "..."} is loaded as key-value pairs
const config = await loadConfig({
  schema: z.object({ DB_HOST: z.string(), DB_PASSWORD: z.string() }),
  adapters: awsSecretsManagerAdapter({ secretId: 'my-app/database' }),
});

// `key` exposes the whole secret as a string (like an env var)
const stripe = await loadConfig({
  schema: z.object({ STRIPE_KEY: z.string() }),
  adapters: awsSecretsManagerAdapter({ secretId: 'my-app/stripe-key', key: 'STRIPE_KEY' }),
});
```

Region, credentials and endpoint come from the AWS SDK defaults (`AWS_REGION`, `AWS_ENDPOINT_URL`, IAM role, ...). To configure it yourself, pass `client: new SecretsManagerClient({ ... })`.

IAM permissions: `secretsmanager:GetSecretValue` on the secret, plus `kms:Decrypt` on the key if the secret is encrypted with a customer-managed KMS key.

#### AWS SSM Adapter

Loads the configuration from [AWS SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html), either a single parameter (`name`) or every parameter under a `path`. In order to use this adapter, you need to install `@aws-sdk/client-ssm` (peer dependency), if you don't have it already. `SecureString` values are decrypted.

```bash
npm install @aws-sdk/client-ssm
```

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { awsSsmAdapter } from 'zod-config/aws-ssm-adapter';

// single parameter: works like the Secrets Manager adapter (JSON or `key`)
const config = await loadConfig({
  schema: z.object({ API_KEY: z.string() }),
  adapters: awsSsmAdapter({ name: '/my-app/api-key', key: 'API_KEY' }),
});

// path: /my-app/prod/LOG_LEVEL, /my-app/prod/db/HOST, /my-app/prod/db/PORT
const appConfig = await loadConfig({
  schema: z.object({
    LOG_LEVEL: z.string(),
    db: z.object({ HOST: z.string(), PORT: z.coerce.number() }),
  }),
  adapters: awsSsmAdapter({ path: '/my-app/prod' }),
});
// { LOG_LEVEL: 'info', db: { HOST: 'db.internal', PORT: 5432 } }
```

With `path`, the prefix is stripped, sub-paths become nested objects and results are paginated. A parameter whose name is also a prefix of another parameter's name (e.g. `/my-app/prod/db` and `/my-app/prod/db/HOST`) cannot be loaded from the same path, since `db` would have to be both a value and an object; this raises a nested key conflict error. Exclude the conflicting name with `regex`, and load that parameter with a second adapter under a different key.

IAM permissions: `ssm:GetParameter` for `name`, `ssm:GetParametersByPath` for `path` (granted on the path itself, e.g. `arn:aws:ssm:<region>:<account>:parameter/my-app/prod`). `SecureString` parameters encrypted with a customer-managed KMS key also need `kms:Decrypt` on that key.

## Type-safe Environment Variables

`loadEnvConfig` validates the environment of apps with a browser bundle with Zod. It keeps `server` and `client` variables apart, checks the public prefix, and throws if browser code reads a server variable.

It works with any framework: you write one env file, and it is validated the first time it is imported. Next.js and Vite also get an optional helper that validates it when the dev server or build starts.

### Next.js

1. Describe and load the environment in one file. Client keys must start with `NEXT_PUBLIC_`, and each one is listed in `runtimeEnv` so Next.js can inline it:

```ts
// src/env.ts
import { loadEnvConfig } from "zod-config/nextjs";
import { z } from "zod";

export const env = loadEnvConfig({
  server: { DATABASE_URL: z.url() }, // Zod 3: z.string().url()
  client: { NEXT_PUBLIC_APP_URL: z.url() },
  runtimeEnv: { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
});
```

2. Validate it when `next dev` or `next build` starts. Choose **one** of these options:

**A. Import the file**, with `next.config.ts` and no path aliases such as `@/` in `env.ts`. Nothing to install.

```ts
// next.config.ts
import "./src/env";
```

**B. Wrap the config**, with `next.config.js` / `.mjs` or path aliases in `env.ts`. The wrapper finds `env.ts` in `src/` or the project root and runs it with [jiti](https://github.com/unjs/jiti).

```ts
// next.config.mjs
import { withZodConfigEnv } from "zod-config/nextjs/config";

export default withZodConfigEnv({
  // your Next.js config
});
```

**C. Run the file with jiti yourself**, for the same cases as B, without the wrapper.

```ts
// next.config.mjs
import { createJiti } from "jiti";

await createJiti(import.meta.url, { tsconfigPaths: true }).import("./src/env.ts");
```

`next start` reads the config too, so with any of the three, `env.ts` must be among the deployed files. B and C also need jiti as a regular dependency (`npm i jiti`).

### Vite, Astro, TanStack Start

1. Describe and load the environment in one file, with your framework's public prefix:

```ts
// src/env.ts
import { loadEnvConfig } from "zod-config";
import { z } from "zod";

export const env = loadEnvConfig({
  clientPrefix: "VITE_", // Astro: "PUBLIC_"
  server: { DATABASE_URL: z.url() },
  client: { VITE_API_URL: z.url() },
  runtimeEnv: import.meta.env,
});
```

2. Validate it when `vite dev` or `vite build` starts. Without this step, a missing variable only shows up when the app loads. The plugin finds `env.ts` in `src/` or the project root and runs it with [jiti](https://github.com/unjs/jiti) (`npm i -D jiti`):

```ts
// vite.config.ts (in Astro: `vite.plugins` in astro.config.ts)
import { defineConfig } from "vite";
import { zodConfigEnv } from "zod-config/vite";

export default defineConfig({
  plugins: [zodConfigEnv()],
});
```

Is the file somewhere else? Pass its path to either one: `zodConfigEnv({ file: "config/env.ts" })`, `withZodConfigEnv(nextConfig, { file: "config/env.ts" })`.

Why `runtimeEnv`? In the browser there is no `process.env` to read from. Next.js only inlines `process.env.NEXT_PUBLIC_*` where your code writes it out in full, and Vite puts the values in `import.meta.env`, so your env file has to hand them over. Server keys are read from `process.env` and don't need to be listed.

### Options

| Option | Description |
|---|---|
| `server`, `client` | Objects of Zod schemas. At least one is required. |
| `clientPrefix` | `zod-config` only. Required when `client` has keys. |
| `runtimeEnv` | Where values come from. Required when `client` has keys. With `zod-config/nextjs`, list each client key as `process.env.NEXT_PUBLIC_NAME`. On the server, entries take priority over `process.env`. |
| `onError` | `(error) => void`, called with the Zod error (use `error.issues`) before an `Error` listing each invalid variable is thrown. Throw from it to replace that error. Unlike `loadConfig`'s `onError`, it does not swallow the failure. |
| `skipValidation` | Return raw values without running Zod, e.g. `skipValidation: process.env.SKIP_ENV_VALIDATION === "true"` when secrets are not available while building. Defaults and coercion are not applied. Pages that read these secrets must render at request time, or the build bakes in missing values. |
| `isServer` | Override server detection (default `typeof window === "undefined"`), e.g. in jsdom tests. |
| `strict` | `zod-config` only. Type-checks that `runtimeEnv` lists every `server` and `client` key, for bundlers that only inline variables written out in full (e.g. `process.env.EXPO_PUBLIC_API_URL` in Expo). |

For a server without a browser bundle, use [`loadConfig`](#basic-usage) or [`loadConfigSync`](#synchronous-loading) with the [env adapter](#env-adapter), or any other adapter.

## Advanced Features

### Load once

`loadConfig` is stateless: it reads every configured source on each call. Caching is left to you. With remote sources such as AWS Secrets Manager or SSM, load the config once and reuse the result instead of calling `loadConfig` per request.

If all your adapters are synchronous, call [`loadConfigSync`](#synchronous-loading) once at module scope and export the result.

With ES modules, the simplest option is to export the result of a top-level `await loadConfig(...)` from a module such as `config.ts`. It loads once on first import (in AWS Lambda, during the init phase). Startup fails when the schema rejects the result. An adapter read error is only a warning: `loadConfig` continues with empty data from that adapter, so a schema of optional fields or defaults still starts.

To defer loading until the config is first needed, cache the load promise (manually add TTL if needed):

```ts
//...

let configPromise: Promise<z.infer<typeof schema>> | undefined;

export const getConfig = () => {
  configPromise ??= loadConfig({
    schema,
    adapters: awsSecretsManagerAdapter({ secretId: 'my-app/config' }),
  }).catch((error) => {
    configPromise = undefined; // cleared only when loadConfig throws
    throw error;
  });

  return configPromise;
};

export const handler = async () => {
  const config = await getConfig();
  // ...
};
```

The `.catch` runs only when `loadConfig` throws. Required fields with no defaults do that after an empty read, so the next call tries AWS again. If every field is optional or has a default, validation succeeds and those defaults stay cached until the process restarts. Leave out `onError` here: it swallows the validation error, so the cache is kept.

### Combine multiple adapters

You can combine multiple adapters to load the configuration from different sources. We **deeply merge the configuration from different sources**, following the order of the adapters provided. 

> ⚠️ **Warning**: When combining multiple adapters, `null` values from subsequent adapters will override existing values. This behavior can be used intentionally to reset configuration values.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';
import { jsonAdapter } from 'zod-config/json-adapter';
import path from 'path';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const filePath = path.join(__dirname, 'config.json');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: [
    jsonAdapter({ path: filePath }),
    envAdapter(),
  ],
});
```

### Synchronous loading

The `loadConfig` function is asynchronous to allow for adapters that are asynchronous. If you are only using synchronous adapters, you can use the `loadConfigSync` function which is synchronous and does not return a promise.

The following default adapters are synchronous and can be used with `loadConfigSync`:

- `envAdapter`
- `jsonAdapter`
- `json5Adapter`
- `yamlAdapter`
- `tomlAdapter`
- `dotEnvAdapter`

When implementing a custom adapter that you want to use with `loadConfigSync`, make sure to implement the `SyncAdapter` interface instead of the `Adapter` interface.

```ts
import { z } from 'zod';
import { loadConfigSync } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';
import { jsonAdapter } from 'zod-config/json-adapter';
import path from 'path';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const filePath = path.join(__dirname, 'config.json');

const config = loadConfigSync({
  schema: schemaConfig,
  adapters: [
    jsonAdapter({ path: filePath }),
    envAdapter(),
  ],
});
```

### Callbacks

You can use the callbacks to handle errors and success due to the async nature of the adapters.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';

loadConfig({
  schema: schemaConfig,
  onError: (error) => {
    console.error('An error occurred while loading the configuration:', error);
  },
  onSuccess: (config) => {
    console.log('Configuration loaded successfully:', config);
  },
});
```

### Custom Logger

You can provide a custom logger to be used to log messages. By default, it uses `console`.

```ts
import { z } from 'zod';
import { loadConfig, Logger } from 'zod-config';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const customLogger: Logger = {
  warn: (message) => {
    // your custom implementation, e.g., log to a file or call an external service
  },
};

const config = await loadConfig({
  schema: schemaConfig,
  logger: customLogger,
});
```

### Silent mode

If any adapter fails, we will still return the data from other adapters. However, by default, we log a warning internally if an adapter fails. You can use the `silent` flag to avoid logging the warning. This is useful when you have multiple adapters and you don't want to log a warning for each adapter that fails. Example for the built-in `envAdapter`:

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const config = await loadConfig({
  schema: schemaConfig,
  // silent: true --> also available in the global config in case you want to use it for all adapters
  adapters: envAdapter({ silent: true }),
});
```

### Lenient key matching

If the source of your adapters uses a different casing or formatting compared to the schema you are using, you can enable the key matching `lenient` option. This is useful when working with environment variables that typically use UPPER_SNAKE_CASE or when integrating with different systems that use varying naming conventions. By default, the key matching is `strict`, meaning that the keys must match exactly.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';

const schemaConfig = z.object({
  myHost: z.string(),
});

const config = await loadConfig({
  schema: schemaConfig,
  keyMatching: 'lenient',
  adapters: envAdapter({
    // keyMatching: 'lenient' --> it can also be applied to the adapter level if you want to use a different key matching for a specific adapter
  }),
});
```

In this example, the key `MYHOST`, `MY_HOST`, or `my-host` from the adapter would be correctly matched to `myHost` in your schema. 

The lenient matching works by comparing keys after:

1. Removing all non-alphanumeric characters (like underscores, hyphens, dots)
2. Converting to lowercase

### Transform function

The `transform` property allows you to modify key-value pairs before they are processed by the schema. This is useful for normalizing data, filtering out unwanted keys, or transforming values. The transform function receives an object with `key` and `value` properties and can return either a transformed object or `false` to drop the key-value pair. The transform function can be applied at both the global level (affecting all adapters) and the adapter level (affecting only that specific adapter). When both are provided, the adapter-level transform takes precedence.

> **Note**: The transform function is the first step in the data processing pipeline, before all the other capabilities of the library (e.g., key matching, nesting separator, etc.).

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';

const schema = z.object({
  database: z.object({
    host: z.string(),
    port: z.string(),
  }),
  apiKey: z.string(),
});

// Global transform - applied to all adapters
const config = await loadConfig({
  schema,
  transform: ({ key, value }) => {
    // Drop sensitive keys
    if (key.includes('SECRET')) {
      return false;
    }
    
    // Transform keys to lowercase
    return {
      key: key.toLowerCase(),
      value,
    };
  },
  adapters: envAdapter({
    customEnv: {
      'DATABASE_HOST': 'localhost',
      'DATABASE_PORT': '5432',
      'API_KEY': 'my-key',
      'SECRET_TOKEN': 'should-be-dropped',
    },
    nestingSeparator: '_',
  }),
});

// Adapter-level transform - applied only to this adapter
const configWithAdapterTransform = await loadConfig({
  schema,
  adapters: envAdapter({
    customEnv: {
      'MY_APP_DATABASE_HOST': 'localhost',
      'MY_APP_DATABASE_PORT': '5432',
      'MY_APP_API_KEY': 'my-key',
      'OTHER_VAR': 'ignored',
    },
    transform: ({ key, value }) => {
      // Only process keys that start with 'MY_APP_'
      if (!key.startsWith('MY_APP_')) {
        return false;
      }
      
      // Remove the prefix and convert to lowercase
      const cleanKey = key.replace(/^MY_APP_/, '').toLowerCase();
      
      return {
        key: cleanKey,
        value,
      };
    },
    nestingSeparator: '_',
  }),
});

// Complex transformation with multiple operations
const complexConfig = await loadConfig({
  schema: z.object({
    api: z.object({
      key: z.string(),
      timeout: z.string(),
    }),
    database: z.object({
      host: z.string(),
      port: z.string(),
    }),
  }),
  adapters: envAdapter({
    customEnv: {
      'API_KEY': 'secret123',
      'API_TIMEOUT': '30000',
      'DB_HOST': 'localhost',
      'DB_PORT': '5432',
      'CACHE_TTL': '3600',
    },
    transform: ({ key, value }) => {
      // Transform different prefixes to nested structure
      if (key.startsWith('API_')) {
        return {
          key: key.replace('API_', 'api.').toLowerCase(),
          value,
        };
      }
      
      if (key.startsWith('DB_')) {
        return {
          key: key.replace('DB_', 'database.').toLowerCase(),
          value,
        };
      }
      
      // Drop other keys
      return false;
    },
    nestingSeparator: '.',
  }),
});
```

## Contributing notes

The goal is to have a helper to load configuration data from several srouces. If you have any source in mind, feel free to open a PR to add it or just open an issue to discuss it. More adapters are coming soon.

## On the web

- This library is referenced in the official Zod documentation as part of the [ecosystem](https://zod.dev/?id=ecosystem) section "Powered by Zod", check it out [here](https://zod.dev/?id=powered-by-zod);
- This library is referenced in the [Next.js Weekly](https://nextjsweekly.com/issues/77) newsletter (Packages / Tools / Repos section);
- Check related dev.to article [here](https://dev.to/alexmarqs/simplify-type-safe-configuration-from-multiple-sources-with-zod-config-28ad);
