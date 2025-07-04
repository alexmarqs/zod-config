<p align="center">
  <img src="https://github.com/alexmarqs/zod-config/blob/main/.github/assets/logo.png?raw=true" width="200px" align="center" alt="Zod logo" />
  <h1 align="center">Zod Config</h1>
  <p align="center">
   Load configuration variables from multiple sources type safely using Zod.
  </p>
</p>
<p align="center">
  <a href="https://github.com/alexmarqs/zod-config/actions/workflows/ci-cd.yaml" target="_blank"><img height=20 src="https://github.com/alexmarqs/zod-config/actions/workflows/ci-cd.yaml/badge.svg" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img height=20 src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
   <a href="https://www.npmjs.com/package/zod-config" target="_blank"><img height=20 src="https://img.shields.io/npm/dt/zod-config.svg" /></a>
</a>
<p align="center">
  <a href="https://www.npmjs.com/package/zod-config" target="_blank">NPM</a>
</a>
</p>


> The new **major version** supports both [Zod 4](https://zod.dev/v4) and [Zod 3](https://v3.zod.dev/) out of the box. Check the [compatibility](#compatibility) section for more details.


## Features

- 👮‍♂️ **Type safety**. Zod Config uses [Zod](https://zod.dev/);
- 🤌 **Tiny**. Zod Config is a tiny library with no dependencies, tree-shaking friendly;
- ✨ **Flexible**. [Combine multiple adapters](#combine-multiple-adapters) to load the configuration from different sources. We deeply merge the configuration from different sources, following the order of the adapters provided; Create your own adapters easily; Use the callback functions to handle errors and success due to the async nature of the adapters;
- 🪴 **Easy to use**. Zod Config is designed to be easy to use, with a simple API;
- 🔄 **Async / Sync support**. Zod Config provides both asynchronous and synchronous APIs to fit different application needs.


## Install

```bash
npm install zod-config zod # npm
pnpm add zod-config zod # pnpm
yarn add zod-config zod # yarn
```

## Table of contents:

- [Quick Start](#quick-start)
- [Compatibility](#compatibility)
- [Default Adapter](#default-adapter)
- [Built In Adapters](#built-in-adapters)
  - [Env Adapter](#env-adapter)
  - [JSON Adapter](#json-adapter)
  - [YAML Adapter](#yaml-adapter)
  - [TOML Adapter](#toml-adapter)
  - [Dotenv Adapter](#dotenv-adapter)
  - [Script Adapter](#script-adapter)
  - [Directory Adapter](#directory-adapter)
- [Combine multiple adapters](#combine-multiple-adapters)
- [Synchronous loading](#synchronous-loading)
- [Callbacks](#callbacks)
- [Custom Logger](#custom-logger)
- [Silent mode](#silent-mode)
- [Lenient key matching](#lenient-key-matching)
- [Contributing notes](#contributing-notes)
- [On the web](#on-the-web)


## Quick Start

Zod Config provides a `loadConfig` function that takes a Zod Object schema and returns a promise that resolves to the configuration object - it supports both asynchronous and synchronous adapters / Zod schemas. The library also provides a `loadConfigSync` function version which takes the same configuration, but does not return a Promise anymore (note that you cannot provide asynchronous adapters / Zod schemas to `loadConfigSync`, see [Synchronous loading](#synchronous-loading) for more information).

Here are the available configuration options:

| Property | Type | Description | Required |
| --- | --- | --- | --- |
| `schema` | `AnyZodObject` | A Zod Object schema to validate the configuration. | `true` |
| `adapters` | `Array<Adapter \| SyncAdapter> \| Adapter \| SyncAdapter` | Adapter(s) to load the configuration from. If not provided, process.env will be used. | `false` |
| `onError` | `(error: Error) => void` | A callback to be called when an error occurs. | `false` |
| `onSuccess` | `(config: z.infer ) => void` | A callback to be called when the configuration is loaded successfully. | `false` |
| `logger` | `Logger` | A custom logger to be used to log messages. By default, it uses `console`. | `false` |
| `keyMatching` | `'strict'` / `'lenient'` | How to match keys between the schema and the data of the adapters. By default, it uses `strict`. | `false` |

From the package we also expose the necessary types in case you want to use them in your own adapters.

This library provides some built in adapters to load the configuration from different sources via modules. You can easily import them from `zod-config/<built-in-adapter-module-name>` (see the examples below).

### Compatibility

Zod Config supports both [Zod 4](https://zod.dev/v4) and [Zod 3](https://v3.zod.dev/) out of the box. To start using it, just make sure you have the correct versions of `zod-config` (zod-config@^1.0.0) and `zod` (zod@^3.25.0)! 

```ts
// Using Zod 4
import { z } from "zod/v4";
// Using Zod 4 Mini
import { z } from "zod/v4-mini";
// Using Zod 3
import { z } from "zod"; // or "zod/v3"

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

Loads the configuration from `process.env` or a custom object, allowing you to filter the keys using a regex (this can be useful when you have multiple adapters and you want to filter the keys to avoid conflicts or just to keep only the keys you need to process - it is also available in some other built-in adapter).

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

// using custom env + filter regex
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
```

#### JSON Adapter

Loads the configuration from a `json` file.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { jsonAdapter } from 'zod-config/json-adapter';

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

const filePath = path.join(__dirname, 'config.json');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: jsonAdapter({ path: filePath }),
});

// using filter regex
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: jsonAdapter({ 
    path: filePath,
    regex: /^MY_APP_/,
  }),
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

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

const filePath = path.join(__dirname, 'config.yaml');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: yamlAdapter({ path: filePath }),
});

// using filter regex
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

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

const filePath = path.join(__dirname, 'config.toml');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: tomlAdapter({ path: filePath }),
});

// using filter regex
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: tomlAdapter({ 
    path: filePath,
    regex: /^MY_APP_/,
  }),
});
```

#### Dotenv Adapter

Loads the configuration from a `.env` file. In order to use this adapter, you need to install `dotenv` (peer dependency), if you don't have it already.

```bash
npm install dotenv
```

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { dotEnvAdapter } from 'zod-config/dotenv-adapter';

const schemaConfig = z.object({
  MY_APP_PORT: z.string().regex(/^\d+$/),
  MY_APP_HOST: z.string(),
});

const filePath = path.join(__dirname, '.env');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: dotEnvAdapter({ path: filePath }),
});

// using filter regex
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: dotEnvAdapter({ 
    path: filePath,
    regex: /^MY_APP_/,
  }),
});
```

#### Script Adapter

Loads configuration from TypeScript (`.ts`), JavaScript (`.js`), or JSON (`.json`) files. The `.ts` and `.js` files must export a default object with the configuration data.

```ts
import { z } from 'zod';
import { loadConfig } from 'zod-config';
import { scriptAdapter } from 'zod-config/script-adapter';

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

### Combine multiple adapters

You can combine multiple adapters to load the configuration from different sources. We **deeply merge the configuration from different sources**, following the order of the adapters provided. 

> ⚠️ **Warning**: When combining multiple adapters, `null` values from subsequent adapters will override existing values. This behavior can be used intentionally to reset configuration values.

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

### Synchronous loading

The `loadConfig` function is asynchronous to allow for adapters that are asynchronous. If you are only using synchronous adapters, you can use the `loadConfigSync` function which is synchronous and does not return a promise.

The following default adapters are synchronous and can be used with `loadConfigSync`:
- `envAdapter`
- `jsonAdapter`
- `yamlAdapter`
- `tomlAdapter`
- `dotEnvAdapter`

When implementing a custom adapter that you want to use with `loadConfigSync`, make sure to implement the `SyncAdapter` interface instead of the `Adapter` interface.

```ts
import { z } from 'zod';
import { loadConfigSync } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';
import { jsonAdapter } from 'zod-config/json-adapter';

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
  adapters: envAdapter(),
});
```

In this example, the key `MYHOST`, `MY_HOST`, or `my-host` from the adapter would be correctly matched to `myHost` in your schema. 

The lenient matching works by comparing keys after:
1. Removing all non-alphanumeric characters (like underscores, hyphens, dots)
2. Converting to lowercase

## Contributing notes

The goal is to have a helper to load configuration data from several srouces. If you have any source in mind, feel free to open a PR to add it or just open an issue to discuss it. More adapters are coming soon.


## On the web 

- This library is referenced in the official Zod documentation as part of the [ecosystem](https://zod.dev/?id=ecosystem) section "Powered by Zod", check it out [here](https://zod.dev/?id=powered-by-zod);

- This library is referenced in the [Next.js Weekly](https://nextjsweekly.com/issues/77) newsletter (Packages / Tools / Repos section);

- Check related dev.to article [here](https://dev.to/alexmarqs/simplify-type-safe-configuration-from-multiple-sources-with-zod-config-28ad);
