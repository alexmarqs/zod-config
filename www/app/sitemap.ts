import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { source } from "@/lib/source";

export const dynamic = "force-static";

// out/sitemap.xml: the landing page and every docs page
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url },
    ...source.getPages().map((page) => ({ url: `${site.url}${page.url}` })),
  ];
}
