import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineCollections, defineConfig, defineDocs } from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { twoslashCompilerOptions } from "./lib/twoslash-paths";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// Code shown outside the docs (landing page), type-checked like the docs samples.
export const snippets = defineCollections({
  type: "doc",
  dir: "content/snippets",
  schema: pageSchema,
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      transformers: [
        // Merging with fumadocs's defaults
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        // Only blocks marked ```ts twoslash are type-checked; a type error fails the build.
        transformerTwoslash({
          throws: true,
          twoslashOptions: { compilerOptions: twoslashCompilerOptions },
        }),
      ],
    },
  },
});
