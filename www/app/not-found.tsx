import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";
import { baseOptions } from "@/lib/layout.shared";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="text-fd-muted-foreground">This page doesn&apos;t exist or has moved.</p>
        <Link href="/docs" className="font-medium underline underline-offset-4">
          Go to the docs
        </Link>
      </main>
    </HomeLayout>
  );
}
