
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

## Features

- 👮‍♂️ **Type safety**. Zod Config uses [Zod](https://zod.dev/);
- 🤌 **Tiny**. Zod Config is a tiny library with no dependencies, tree-shaking friendly;
- ✨ **Flexible**. Combine multiple adapters to load the configuration from different sources. We deeply merge the configuration from different sources, following the order of the adapters provided; Create your own adapters easily; Use the callback functions to handle errors and success due to the async nature of the adapters;
- 🪴 **Easy to use**. Zod Config is designed to be easy to use, with a simple API;


## Install

```bash
npm install zod-config zod # npm
pnpm add zod-config zod # pnpm
yarn add zod-config zod # yarn
```
(You need to install Zod as well, if you don't have it already)


## Table of contents:

- [Quick Start](#quick-start)
- [Default Adapter](#default-adapter)
- [Built In Adapters](#built-in-adapters)
  - [Env Adapter](#env-adapter)
  - [JSON Adapter](#json-adapter)
  - [YAML Adapter](#yaml-adapter)
  - [Dotenv Adapter](#dotenv-adapter)
  - [Script Adapter](#script-adapter)
  - [Directory Adapter](#directory-adapter)
- [Combine multiple adapters](#combine-multiple-adapters)
- [Callbacks](#callbacks)
- [Custom Logger](#custom-logger)
- [Silent mode](#silent-mode)
- [Contributing notes](#contributing-notes)
- [On the web](#on-the-web)


## Quick Start

Zod Config provides a `loadConfig` function that takes a Zod Object schema and returns a promise that resolves to the configuration object.

| Property | Type | Description | Required |
| --- | --- | --- | --- |
| `schema` | `AnyZodObject` | A Zod Object schema to validate the configuration. | `true` |
| `adapters` | `Adapter[] or Adapter` | Adapter(s) to load the configuration from. If not provided, process.env will be used. | `false` |
| `onError` | `(error: Error) => void` | A callback to be called when an error occurs. | `false` |
| `onSuccess` | `(config: z.infer ) => void` | A callback to be called when the configuration is loaded successfully. | `false` |
| `logger` | `Logger` | A custom logger to be used to log messages. By default, it uses `console`. | `false` |

From the package we also expose the types `Adapter`, `Config` and `Logger` in case you want to use them in your own adapters.

This library provides some built in adapters to load the configuration from different sources via modules. You can easily import them from `zod-config/<built-in-adapter-module-name>` (see the examples below).

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
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const filePath = path.join(__dirname, 'config.yaml');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: yamlAdapter({ path: filePath }),
});

// using filter prefix key
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: yamlAdapter({ 
    path: filePath,
    prefixKey: 'MY_APP_',
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
  port: z.string().regex(/^\d+$/),
  host: z.string(),
});

const filePath = path.join(__dirname, '.env');

const config = await loadConfig({
  schema: schemaConfig,
  adapters: dotEnvAdapter({ path: filePath }),
});

// using filter prefix key
const customConfig = await loadConfig({
  schema: schemaConfig,
  adapters: dotEnvAdapter({ 
    path: filePath,
    prefixKey: 'MY_APP_',
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



## Contributing notes

The goal is to have a helper to load configuration data from several srouces. If you have any source in mind, feel free to open a PR to add it or just open an issue to discuss it. More adapters are coming soon.


## On the web 

- This library is referenced in the official Zod documentation as part of the [ecosystem](https://zod.dev/?id=ecosystem) section "Powered by Zod", check it out [here](https://zod.dev/?id=powered-by-zod);

- Check related dev.to article [here](https://dev.to/alexmarqs/simplify-type-safe-configuration-from-multiple-sources-with-zod-config-28ad);
