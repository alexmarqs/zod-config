// Post-build checks on the static export in out/.
// Run after `pnpm build`: exits 1 and prints one line per problem.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const wwwDir = join(import.meta.dirname, "..");
const outDir = join(wwwDir, "out");
const contentDir = join(wwwDir, "content", "docs");
const siteUrl = "https://zod-config.alexandremarques.io";

// Files that must exist in out/, besides the pages.
const requiredFiles = ["404.html", "llms.txt", "llms-full.txt", "api/search"];

const failures = [];

if (!existsSync(outDir)) {
  console.error("MISSING FILE out/ (run pnpm build first)");
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** Resolve a site path (no query/hash) to a file in out/, or null. */
function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath).replace(/\/+$/, "");
  const candidates =
    clean === "" ? ["index.html"] : [clean, `${clean}.html`, `${clean}/index.html`];
  for (const candidate of candidates) {
    const file = join(outDir, candidate);
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

// 1. every content page (and the landing page) was exported
const expectedPages = [
  "/",
  ...walk(contentDir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = relative(contentDir, file)
        .replace(/\.mdx$/, "")
        .replace(/(^|\/)index$/, "");
      return slug ? `/docs/${slug}` : "/docs";
    }),
];
for (const page of expectedPages) {
  if (!resolvePath(page)) failures.push(`MISSING PAGE ${page}`);
}

// 2. required files exist
for (const file of requiredFiles) {
  if (!existsSync(join(outDir, file))) failures.push(`MISSING FILE ${file}`);
}

// 3. links, assets and #fragments resolve
const idCache = new Map();
function idsOf(file) {
  if (!idCache.has(file)) {
    const html = readFileSync(file, "utf8");
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

const seen = new Set();
for (const file of walk(outDir).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  const from = `/${relative(outDir, file)}`;
  const urls = [
    // links and asset URLs (images, scripts)
    ...[...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    // srcset lists, entry by entry
    ...[...html.matchAll(/\ssrcSet="([^"]+)"/gi)].flatMap((m) =>
      m[1].split(",").map((entry) => entry.trim().split(/\s+/)[0]),
    ),
    // this site's URLs in <meta content>, e.g. og:image
    ...[...html.matchAll(/<meta [^>]*content="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((url) => url.startsWith(siteUrl)),
  ].map((url) => url.replaceAll("&amp;", "&").replace(siteUrl, "") || "/");

  for (const url of urls) {
    const key = `${from} -> ${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // same-page anchor
    if (url.startsWith("#")) {
      const fragment = decodeURIComponent(url.slice(1));
      if (fragment && !idsOf(file).has(fragment)) {
        failures.push(`BROKEN LINK ${url} (in ${from}: no id "${fragment}")`);
      }
      continue;
    }

    if (!url.startsWith("/") || url.startsWith("//")) continue;
    const [pathAndQuery, fragment] = url.split("#");
    const target = resolvePath(pathAndQuery.split("?")[0]);
    if (!target) {
      failures.push(`BROKEN LINK ${url} (in ${from})`);
    } else if (
      fragment &&
      target.endsWith(".html") &&
      !idsOf(target).has(decodeURIComponent(fragment))
    ) {
      failures.push(`BROKEN LINK ${url} (in ${from}: no id "${fragment}")`);
    }
  }
}

for (const line of failures) console.log(line);
if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s) in out/`);
  process.exit(1);
}
