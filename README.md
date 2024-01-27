
<p align="center">
  <img src="./.github/assets/logo.png" width="200px" align="center" alt="Zod logo" />
  <h1 align="center">Zod Config</h1>
  <p align="center">
   Load configuration variables from multiple sources type safely using Zod.
  </p>
</p>
<p align="center">
  <a href="https://github.com/alexmarqs/gramoco-cli/actions/workflows/ci.yaml" target="_blank"><img height=20 src="https://github.com/alexmarqs/gramoco-cli/actions/workflows/ci.yaml/badge.svg" /></a>
    <a href="https://github.com/alexmarqs/gramoco-cli/actions/workflows/release.yaml" target="_blank"><img height=20 src="https://github.com/alexmarqs/gramoco-cli/actions/workflows/release.yaml/badge.svg" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img height=20 src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>

</a>
</p>

## Features

- 👮‍♂️ **Type safety**. Zod Config uses [Zod](https://zod.dev/);
- 🤌 **Tiny**. Zod Config is a tiny library with no dependencies, tree-shaking friendly;
- ✨ **Flexible**. Combine multiple adapters to load the configuration from different sources. We deeply merge the configuration from different sources, following the order of the adapters provided; Create your own adapters easily;
- 🪴 **Easy to use**. Zod Config is designed to be easy to use, with a simple API;


## Install

```bash
npm install zod-config zod # npm
pnpm add zod-config zod # pnpm
yarn add zod-config zod # yarn
```
(You need to install Zod as well, if you don't have it already)

## Quick Start

Zod Config provides a `loadConfig` function that takes a Zod Object schema and returns a promise that resolves to the configuration object.

| Property | Type | Description | Required |
| --- | --- | --- | --- |
| `schema` | `AnyZodObject` | A Zod Object schema to validate the configuration. | `true` |
| `adapters` | `Adapter[] or Adapter` | Adapter(s) to load the configuration from. If not provided, process.env will be used. | `false` |
| `onError` | `(error: Error) => void` | A callback to be called when an error occurs. | `false` |
| `onSuccess` | `(config: z.infer ) => void` | A callback to be called when the configuration is loaded successfully. | `false` |

From the package we also expose the types `Adapter` and `Config` in case you want to use them in your own adapters.

This library provides some built in adapters to load the configuration from different sources via modules. You can easily import them from `zod-config/<built-in-adapter-module-name>` (see the examples below).

### Table of contents:

- [Default Adapter](#default-adapter)
- [Env Adapter](#env-adapter)
- [JSON Adapter](#json-adapter)
- [Combine multiple adapters](#combine-multiple-adapters)


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

### Env Adapter

Loads the configuration from `process.env` or a custom object, allowing filtering the prefix keys to load.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

// using default env (process.env)
const config = await loadConfig({
  schema: schemaConfig,
  adapters: envAdapter(),
});

// using custom env + filter prefix key
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: envAdapter({ 
    prefixKey: 'MY_APP_',
    customEnv: {
      MY_APP_PORT: '3000',
      MY_APP_HOST: 'localhost',
      IGNORED_KEY: 'ignored',
    }
});
```

### JSON Adapter

Loads the configuration from a JSON file.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { jsonAdapter } from 'zod-config/json-adapter';

const schemaConfig = z.object({
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const filePath = path.join(__dirname, 'config.json');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: jsonAdapter({ path: filePath }),
});

// using filter prefix key
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: jsonAdapter({ 
    path: filePath,
    prefixKey: 'MY_APP_',
  }),
});
```

### Combine multiple adapters

You can combine multiple adapters to load the configuration from different sources. We deeply merge the configuration from different sources, following the order of the adapters provided.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';
import { jsonAdapter } from 'zod-config/json-adapter';

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

## Contributing notes

The goal is to have a helper to load configuration data from several srouces. If you have any source in mind, feel free to open a PR to add it or just open an issue to discuss it. **More adapters are coming soon.**