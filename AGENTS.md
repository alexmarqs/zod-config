# zod-config

A TypeScript library that loads configuration from multiple sources (adapters) and validates it with Zod. The library is the root package (`src/`, `tests/`); the docs site is the `www/` workspace member (`zod-config-docs`, a private Fumadocs app, not part of the npm package).

## Commands

Node 22, pnpm 10. Run `pnpm install` once at the repo root: it installs both the library and the docs.

Library (repo root):

- `pnpm lint` (`src/` and `tests/`): Biome check with `--write` (lint, format, import order). CI runs `pnpm lint:ci` (`biome ci`), which only reports
- `pnpm type-check`
- `pnpm test`
- `pnpm build`

Docs (in `www/`, or from the root with `pnpm --filter zod-config-docs <script>`; see `www/README.md`):

- `pnpm dev`
- `pnpm lint` (Biome check with `--write`)

One Biome (v2) for the whole repo: the root `biome.json` holds the shared rules and formatting; `www/biome.json` extends it and only adds the docs' build-output ignores.
- `pnpm build` (also type-checks every ` ```ts twoslash ` sample against `../src`)
- `pnpm check:output` (after build: pages, links, anchors, assets, llms.txt, search index, 404)

The library's `engines` field says Node 18+; CI tests it on Node 22 and 24 only.

## Keep the docs up to date

Any change to the public API, to an adapter's options or behaviour, or a new adapter must update the matching page under `www/content/docs/` in the same PR. A new adapter needs a new page in `www/content/docs/adapters/`, an entry in that folder's `meta.json` and a row in the adapters overview table (`www/content/docs/adapters/index.mdx`).

If the change affects what `skills/zod-config/SKILL.md` says (APIs, adapters, peer dependencies, env setup), update it too.

Before finishing, run the docs checks (`cd www && pnpm lint && pnpm build && pnpm check:output`) so broken samples and links are caught.

Keep `README.md` short: essentials only. Details, framework guides, recipes and comparisons go on the docs site.

User-facing library changes need a changeset (`pnpm changeset`). Docs-only changes do not.
