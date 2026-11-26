import { createGetUrl } from "fumadocs-core/source";
import { site } from "./site";

export const appName = site.name;
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";

export const gitConfig = {
  user: "alexmarqs",
  repo: "zod-config",
  branch: "main",
  /** where the docs content lives inside the repo */
  contentDir: "www/content/docs",
};

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "image.png"];

  return { segments, url: getImageUrl(segments, page.locale) };
}
