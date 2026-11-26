# zod-config docs

The documentation site for [zod-config](https://github.com/alexmarqs/zod-config), live at <https://zod-config.alexandremarques.io>.

Built with [Fumadocs](https://fumadocs.dev) (Next.js, static export) and deployed as a Cloudflare Worker with static assets. This folder is a pnpm workspace member (`zod-config-docs`, private): it shares the repo's single `pnpm-lock.yaml` and is not part of the published npm package.

## Local development

Requires Node 22 and pnpm 10 (pinned in `packageManager`; `corepack enable` picks it up). Install once from the repo root:

```bash
pnpm install        # at the repo root: installs the library and the docs
```

Then, in `www/`:

```bash
pnpm dev            # http://localhost:3000
pnpm lint           # Biome check --write, extends the repo's root biome.json
pnpm build          # static export to out/
pnpm check:output   # checks out/: every content page was exported; links, #anchors, assets and og images resolve; llms.txt, search index, 404
pnpm preview        # serves out/ through the Cloudflare Worker locally (wrangler dev), after pnpm build
```

## Writing docs

- Pages are MDX files in `content/docs/`. Sidebar order is set by the `meta.json` in each folder.
- Code blocks marked ` ```ts twoslash ` are type-checked against the library source in `../src` (see `lib/twoslash-paths.ts`): a sample that no longer matches the API fails `pnpm build`. Use a plain ` ```ts ` block for code that cannot compile on its own (framework-specific APIs, partial snippets).
- Code shown outside the docs (the landing page quick start) lives in `content/snippets/` and is type-checked the same way.
