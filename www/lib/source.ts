import { docs } from "collections/server";
import { llms, loader } from "fumadocs-core/source";
import { icons } from "lucide-react";
import { createElement } from "react";
import { brandIcons } from "@/components/icons";
import { docsRoute } from "./shared";
import { site } from "./site";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  // `icon` in frontmatter and meta.json: a brand mark from components/icons.tsx (the same ones as
  // the landing page), or else a Lucide icon name.
  icon(name) {
    if (!name) return;
    const Icon = brandIcons[name as keyof typeof brandIcons] ?? icons[name as keyof typeof icons];
    if (!Icon) throw new Error(`Unknown icon "${name}" in the docs frontmatter`);
    return createElement(Icon);
  },
});

// llms.txt: title and description come from content/docs/meta.json.
export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${site.url}${page.url})

${await page.data.getText("processed")}`,
  // absolute links; pages point to their Markdown files under `/llms.mdx`
  renderUrl: (item) =>
    site.url + (/^\/.*\.(md|txt)$/.test(item.url) ? `/llms.mdx${item.url}` : item.url),
});
