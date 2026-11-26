import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  // static export: there is no image optimization server, serve files from public/ as they are
  images: { unoptimized: true },
};

export default withMDX(config);
