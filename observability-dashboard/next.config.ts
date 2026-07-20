import path from "node:path";
import type { NextConfig } from "next";

// This subfolder sits inside the main app's repo (its own package-lock.json
// alongside the parent's), which makes Turbopack's root-inference pick the
// parent directory as the workspace root — and then pull in the parent's
// src/ (e.g. its own proxy.ts) and postcss.config.mjs (requiring
// @tailwindcss/postcss, which this app doesn't depend on) as if they
// belonged to this build. On Vercel, `outputFileTracingRoot` must be set
// to the same value or it silently wins over `turbopack.root` — both are
// set here so they agree and Turbopack stops reaching outside this folder.
const projectRoot = path.join(__dirname);
const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
