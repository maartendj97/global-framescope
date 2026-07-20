import path from "node:path";
import type { NextConfig } from "next";

// This subfolder sits inside the main app's repo (its own package-lock.json
// alongside the parent's), which makes Turbopack's root-inference pick the
// parent directory as the workspace root — and then pull in the parent's
// src/ (e.g. its own proxy.ts) as if it belonged to this build. Pinning the
// root here keeps the two apps' module graphs separate.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
