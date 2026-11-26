---
name: zod-config
description: Load and validate app configuration and environment variables with zod-config (loadConfig, loadConfigSync, loadEnvConfig, adapters for env, .env, JSON, JSON5, YAML, TOML, scripts, directories and AWS). Use when a project imports zod-config, or when adding type-safe config or env validation to a Node.js, Next.js, Vite, Astro or TanStack Start app.
---

# zod-config

zod-config reads configuration from one or more sources (adapters), deep-merges it in order and validates it with a Zod schema. Zod 4 and Zod 3 (deprecated) are supported.

Full docs: https://zod-config.alexandremarques.io. For any detail not covered here, read https://zod-config.alexandremarques.io/llms.txt and open the page it links to (each page is also available as Markdown).

## Pick the API

| Need | Use | Import |
| --- | --- | --- |
| Config on a server, any source | `loadConfig` (async) | `zod-config` |
| Same, every adapter synchronous | `loadConfigSync` | `zod-config` |
| Env vars in an app with a browser bundle | `loadEnvConfig` | `zod-config/nextjs` (Next.js) or `zod-config` (with `clientPrefix`) |

For a server with no browser bundle, skip `loadEnvConfig`: use `loadConfig` or `loadConfigSync`.

## loadConfig

```ts
import { z } from "zod";
import { loadConfig } from "zod-config";
import { envAdapter } from "zod-config/env-adapter";
import { jsonAdapter } from "zod-config/json-adapter";

const config = await loadConfig({
  schema: z.object({
    port: z.coerce.number().default(3000),
    databaseUrl: z.url(),
  }),
  // later adapters override earlier ones
  adapters: [jsonAdapter({ path: "./config.json" }), envAdapter()],
});
```

- No `adapters` means `process.env`.
- Options: `schema`, `adapters`, `onSuccess`, `onError` (handles the failure instead of throwing), `logger`, `silent`, `keyMatching` (`"strict"` or `"lenient"`), `transform`. Adapter options override the global ones.
- Every adapter accepts `regex`, `silent`, `keyMatching` and `transform`.
- To load once and reuse, export the awaited config from one module (see the "Load once" guide).

## Adapters

Each adapter is its own entry point: `zod-config/<name>-adapter`. Install the peer dependency yourself.

| Adapter | Peer dependency | Sync |
| --- | --- | --- |
| `env-adapter` | none | yes |
| `json-adapter` | none | yes |
| `json5-adapter` | `json5` | yes |
| `yaml-adapter` | `yaml` | yes |
| `toml-adapter` | `smol-toml` | yes |
| `dotenv-adapter` | `dotenv` | yes |
| `script-adapter` (`.ts`, `.js`, `.json`) | `jiti`, optional, for `.ts` that Node cannot strip | no |
| `directory-adapter` | none | no |
| `aws-secrets-manager-adapter` | `@aws-sdk/client-secrets-manager` | no |
| `aws-ssm-adapter` | `@aws-sdk/client-ssm` | no |

`loadConfigSync` only accepts synchronous adapters. Custom adapters are objects with `name` and `read()`; import the `Adapter` / `SyncAdapter` types from `zod-config`.

## loadEnvConfig (Next.js, Vite, Astro, TanStack Start)

Write one `src/env.ts`:

```ts
// Next.js
import { loadEnvConfig } from "zod-config/nextjs";
import { z } from "zod";

export const env = loadEnvConfig({
  server: { DATABASE_URL: z.url() },
  client: { NEXT_PUBLIC_APP_URL: z.url() },
  shared: { NODE_ENV: z.enum(["development", "test", "production"]) },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
});
```

```ts
// Vite, TanStack Start ("VITE_"), Astro ("PUBLIC_")
import { loadEnvConfig } from "zod-config";
import { z } from "zod";

export const env = loadEnvConfig({
  clientPrefix: "VITE_",
  server: { DATABASE_URL: z.url() },
  client: { VITE_API_URL: z.url() },
  runtimeEnv: import.meta.env,
});
```

Rules that are easy to get wrong:

- Client keys must start with the prefix; server keys must not. A key can be in only one group.
- On Next.js, list every `client` and `shared` key in `runtimeEnv`, written out as `process.env.NAME`, or Next.js will not inline it.
- Reading a server variable in the browser throws. Read server values in server code only (in TanStack Start, inside `createServerFn` handlers).
- `skipValidation` returns raw values: no defaults, coercion or transforms.

Validate when the dev server or build starts (optional, pick one):

- Next.js: `import "./src/env";` at the top of `next.config.ts` (no path aliases in `env.ts`), or `export default withZodConfigEnv(nextConfig)` from `zod-config/nextjs/config` (needs `jiti` as a regular dependency, because `next start` reads the config too).
- Vite, Astro (`vite.plugins`), TanStack Start: `plugins: [zodConfigEnv()]` from `zod-config/vite` (needs `jiti` as a dev dependency).
- Both find `env.ts` in `src/` or the project root; pass `{ file: "path/to/env.ts" }` otherwise. The env file runs in Node.js there, so keep it to the schema (no `server-only` import).

## When you change code that uses zod-config

- Keep one schema as the source of truth and infer types from it (`z.infer<typeof schema>`), instead of writing the config type by hand.
- Values from env and `.env` files are strings: use `z.coerce.number()` for numbers and `z.stringbool()` (Zod 4) for booleans. Do not use `z.coerce.boolean()`, which turns `"false"` into `true`.
