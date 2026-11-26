import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
  const base = baseOptions();
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...base}
      // text links ("AI skills") are for the landing page header; the sidebar already lists the page
      links={base.links?.filter((link) => link.type === "icon")}
    >
      {children}
    </DocsLayout>
  );
}
