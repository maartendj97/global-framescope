// Single source of truth for the canonical site URL, used by
// metadataBase, robots.ts, and sitemap.ts. NEXT_PUBLIC_SITE_URL wins
// when set; otherwise fall back to VERCEL_PROJECT_PRODUCTION_URL, which
// Vercel injects automatically on every deployment (hostname only, no
// protocol) — without this fallback, production metadata silently
// pointed at localhost:3000 whenever NEXT_PUBLIC_SITE_URL was unset.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
