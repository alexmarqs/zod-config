import { mdiAws } from "@mdi/js";
import type { SVGProps } from "react";
import {
  type SimpleIcon,
  siAstro,
  siDotenv,
  siGithub,
  siJson,
  siNextdotjs,
  siNpm,
  siTanstack,
  siToml,
  siTypescript,
  siVite,
  siYaml,
} from "simple-icons";

// Brand marks from Simple Icons (CC0), and the AWS mark from Material Design Icons (Apache-2.0),
// since Simple Icons has none: lucide-react 1.x ships no brand icons.
// Drawn in currentColor, so they follow the text colour in light and dark mode.

type IconProps = SVGProps<SVGSVGElement>;

function BrandIcon({ icon, ...props }: IconProps & { icon: Pick<SimpleIcon, "path"> }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d={icon.path} />
    </svg>
  );
}

export const GitHubIcon = (props: IconProps) => <BrandIcon icon={siGithub} {...props} />;
export const NpmIcon = (props: IconProps) => <BrandIcon icon={siNpm} {...props} />;
export const NextjsIcon = (props: IconProps) => <BrandIcon icon={siNextdotjs} {...props} />;
export const ViteIcon = (props: IconProps) => <BrandIcon icon={siVite} {...props} />;
export const AstroIcon = (props: IconProps) => <BrandIcon icon={siAstro} {...props} />;
export const TanStackIcon = (props: IconProps) => <BrandIcon icon={siTanstack} {...props} />;
export const JsonIcon = (props: IconProps) => <BrandIcon icon={siJson} {...props} />;
export const YamlIcon = (props: IconProps) => <BrandIcon icon={siYaml} {...props} />;
export const TomlIcon = (props: IconProps) => <BrandIcon icon={siToml} {...props} />;
export const DotenvIcon = (props: IconProps) => <BrandIcon icon={siDotenv} {...props} />;
export const TypeScriptIcon = (props: IconProps) => <BrandIcon icon={siTypescript} {...props} />;
export const AwsIcon = (props: IconProps) => <BrandIcon icon={{ path: mdiAws }} {...props} />;

/** Brand marks by name, for `icon:` in docs frontmatter and meta.json (see lib/source.ts). */
export const brandIcons = {
  Aws: AwsIcon,
  Astro: AstroIcon,
  Dotenv: DotenvIcon,
  Json: JsonIcon,
  Nextjs: NextjsIcon,
  TanStack: TanStackIcon,
  Toml: TomlIcon,
  TypeScript: TypeScriptIcon,
  Vite: ViteIcon,
  Yaml: YamlIcon,
} as const;
