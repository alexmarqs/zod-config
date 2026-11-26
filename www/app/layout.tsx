import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Provider } from "@/components/provider";
import { site } from "@/lib/site";
import "./global.css";

const body = Geist({ subsets: ["latin"], variable: "--font-body" });
const code = Geist_Mono({ subsets: ["latin"], variable: "--font-code" });
const heading = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: type-safe configuration with Zod`,
    template: `%s | ${site.name}`,
  },
  description: site.tagline,
  icons: { icon: "/logo.png" },
  openGraph: {
    siteName: site.name,
    title: site.name,
    description: site.tagline,
    url: site.url,
    type: "website",
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${code.variable} ${heading.variable} font-sans`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
