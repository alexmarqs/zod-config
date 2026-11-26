import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
import { NpmIcon } from "@/components/icons";
import { site } from "./site";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image src="/logo.png" alt="" width={24} height={24} />
          <span className="font-display font-semibold tracking-tight">{site.name}</span>
        </>
      ),
    },
    githubUrl: site.repo,
    links: [
      { text: "AI skills", url: "/docs/ai", active: "url" },
      {
        type: "icon",
        label: "npm",
        text: "npm",
        icon: <NpmIcon />,
        url: site.npm,
        external: true,
      },
    ],
  };
}
