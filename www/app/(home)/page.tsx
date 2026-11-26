import { readFileSync } from "node:fs";
import { join } from "node:path";
import { snippets } from "collections/server";
import {
  Feather,
  FolderTree,
  Layers,
  type LucideIcon,
  Plug,
  ShieldCheck,
  Timer,
  Variable,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  AstroIcon,
  AwsIcon,
  DotenvIcon,
  GitHubIcon,
  JsonIcon,
  NextjsIcon,
  NpmIcon,
  TanStackIcon,
  TomlIcon,
  TypeScriptIcon,
  ViteIcon,
  YamlIcon,
} from "@/components/icons";
import { InstallCommand } from "@/components/install-command";
import { getMDXComponents } from "@/components/mdx";
import { site } from "@/lib/site";

// content/snippets/quick-start.mdx: a twoslash block, type-checked at build like the docs samples
const quickStart = snippets.find((entry) => entry.info.path === "quick-start.mdx");
if (!quickStart) throw new Error("content/snippets/quick-start.mdx is missing");
const QuickStart = quickStart.body;

// The library's version, read at build time from the repo's package.json (builds run in www/).
const { version } = JSON.parse(readFileSync(join(process.cwd(), "..", "package.json"), "utf8")) as {
  version: string;
};

type Feature = { Icon: LucideIcon; title: string; body: string; href?: string };

const features: Feature[] = [
  {
    Icon: ShieldCheck,
    title: "Type safety",
    body: "A Zod schema validates your configuration, and the result is fully typed.",
  },
  {
    Icon: Feather,
    title: "Tiny",
    body: "No dependencies, tree-shaking friendly. Adapters are separate entry points.",
  },
  {
    Icon: Layers,
    title: "Flexible",
    body: "Combine adapters to read from several sources, deep-merged in order, or write your own.",
    href: "/docs/guides/combine-adapters",
  },
  {
    Icon: Timer,
    title: "Async and sync",
    body: "loadConfig for any adapter, loadConfigSync when every adapter is synchronous.",
    href: "/docs/guides/sync-loading",
  },
];

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

// Format logos where one exists; `needs` is the peer dependency to install (see the adapters docs).
const adapters: { name: string; href: string; Icon: Icon; needs: string; sync: boolean }[] = [
  { name: "Env", href: "/docs/adapters/env", Icon: Variable, needs: "built in", sync: true },
  { name: "JSON", href: "/docs/adapters/json", Icon: JsonIcon, needs: "built in", sync: true },
  { name: "JSON5", href: "/docs/adapters/json5", Icon: JsonIcon, needs: "json5", sync: true },
  { name: "YAML", href: "/docs/adapters/yaml", Icon: YamlIcon, needs: "yaml", sync: true },
  { name: "TOML", href: "/docs/adapters/toml", Icon: TomlIcon, needs: "smol-toml", sync: true },
  { name: "Dotenv", href: "/docs/adapters/dotenv", Icon: DotenvIcon, needs: "dotenv", sync: true },
  {
    name: "Script",
    href: "/docs/adapters/script",
    Icon: TypeScriptIcon,
    needs: "jiti, optional",
    sync: false,
  },
  {
    name: "Directory",
    href: "/docs/adapters/directory",
    Icon: FolderTree,
    needs: "built in",
    sync: false,
  },
  {
    name: "AWS Secrets Manager",
    href: "/docs/adapters/aws-secrets-manager",
    Icon: AwsIcon,
    needs: "AWS SDK",
    sync: false,
  },
  {
    name: "AWS SSM",
    href: "/docs/adapters/aws-ssm",
    Icon: AwsIcon,
    needs: "AWS SDK",
    sync: false,
  },
];

const frameworks = [
  { name: "Next.js", href: "/docs/env/nextjs", Icon: NextjsIcon },
  { name: "Vite", href: "/docs/env/vite", Icon: ViteIcon },
  { name: "Astro", href: "/docs/env/astro", Icon: AstroIcon },
  { name: "TanStack Start", href: "/docs/env/tanstack-start", Icon: TanStackIcon },
];

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-x-clip">
      {/* hero */}
      <section className="relative">
        <div className="circuit-grid pointer-events-none absolute inset-0 -z-10" />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-16 pb-20 md:pt-24 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col items-start gap-6">
            <Link
              href={`${site.repo}/releases/tag/v${version}`}
              className="rise inline-flex max-w-full items-center gap-2 rounded-full border bg-fd-card/70 py-1 pr-3 pl-1 text-xs backdrop-blur transition-colors hover:bg-fd-accent"
            >
              <span className="shrink-0 rounded-full bg-fd-primary px-2 py-0.5 font-mono font-medium text-fd-primary-foreground">
                v{version}
              </span>
              <span className="truncate text-fd-muted-foreground">See what's new</span>
            </Link>

            <h1
              className="rise font-display text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Type-safe configuration with Zod
            </h1>

            <p
              className="rise max-w-lg text-lg text-fd-muted-foreground"
              style={{ animationDelay: "160ms" }}
            >
              {site.tagline}
            </p>

            <div className="rise" style={{ animationDelay: "240ms" }}>
              <InstallCommand command="npm install zod-config zod" />
            </div>

            <div
              className="rise flex flex-wrap items-center gap-3"
              style={{ animationDelay: "320ms" }}
            >
              <Link
                href="/docs"
                className="inline-flex items-center rounded-full bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
              >
                Get started
              </Link>
              <a
                href={site.repo}
                className="inline-flex items-center gap-2 rounded-full border bg-fd-card/70 px-5 py-2.5 text-sm font-medium backdrop-blur transition-colors hover:bg-fd-accent"
              >
                <GitHubIcon className="size-4" />
                GitHub
              </a>
              <a
                href={site.npm}
                className="inline-flex items-center gap-2 rounded-full border bg-fd-card/70 px-5 py-2.5 text-sm font-medium backdrop-blur transition-colors hover:bg-fd-accent"
              >
                <NpmIcon className="size-4 text-[#cb3837]" />
                npm
              </a>
            </div>
          </div>

          <div className="rise relative min-w-0" style={{ animationDelay: "200ms" }}>
            <Image
              src="/logo.png"
              alt=""
              width={88}
              height={88}
              priority
              className="absolute -top-10 -right-2 z-10 hidden rounded-full shadow-xl ring-4 ring-fd-background sm:block"
            />
            <div className="rounded-2xl border bg-fd-card/80 p-1.5 backdrop-blur [&_figure]:my-0">
              <QuickStart components={getMDXComponents()} />
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, title, body, href }) => {
            const content = (
              <>
                <Icon className="mb-4 size-5 text-brand" />
                <h3 className="mb-2 font-display font-semibold">{title}</h3>
                <p className="text-sm text-fd-muted-foreground">{body}</p>
              </>
            );
            const className = "flex flex-col rounded-xl border bg-fd-card p-5";
            return href ? (
              <Link
                key={title}
                href={href}
                className={`${className} transition-colors hover:bg-fd-accent`}
              >
                {content}
              </Link>
            ) : (
              <div key={title} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* adapters */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight">Adapters</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {adapters.map(({ name, href, Icon, needs, sync }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl border bg-fd-card px-4 py-3 transition-colors hover:bg-fd-accent"
            >
              <Icon className="size-5 shrink-0 text-fd-muted-foreground transition-colors group-hover:text-brand" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{name}</span>
                <span className="block truncate font-mono text-xs text-fd-muted-foreground">
                  {needs} · {sync ? "sync" : "async"}
                </span>
              </span>
            </Link>
          ))}
          <Link
            href="/docs/adapters/custom"
            className="group flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors hover:bg-fd-accent"
          >
            <Plug className="size-5 shrink-0 text-fd-muted-foreground transition-colors group-hover:text-brand" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">Write your own</span>
              <span className="block truncate font-mono text-xs text-fd-muted-foreground">
                sync or async
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* env */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-2xl border bg-fd-card p-8 md:p-10">
          <div className="circuit-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 className="mb-2 font-display text-3xl font-semibold tracking-tight">
                Type-safe environment variables
              </h2>
              <p className="text-fd-muted-foreground">
                One <code className="font-mono text-fd-foreground">env.ts</code> with separate
                server and client schemas, checked when the build starts. Public prefixes are
                enforced, and reading a server variable in the browser throws.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {frameworks.map(({ name, href, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex items-center gap-2 rounded-full border bg-fd-background px-4 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand"
                >
                  <Icon className="size-4" />
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-fd-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={20} height={20} />
            <span>MIT License</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-fd-foreground">
              Docs
            </Link>
            <a href="/llms.txt" className="hover:text-fd-foreground">
              llms.txt
            </a>
            <a href={site.repo} aria-label="GitHub" className="hover:text-fd-foreground">
              <GitHubIcon className="size-4" />
            </a>
            <a href={site.npm} aria-label="npm" className="hover:text-fd-foreground">
              <NpmIcon className="size-4" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
