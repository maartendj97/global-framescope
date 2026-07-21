import type { MetadataRoute } from "next";
import { getEvents } from "@/lib/data";
import { getSiteUrl } from "@/lib/siteUrl";

const SITE_URL = getSiteUrl();

const STATIC_ROUTES = ["", "/events", "/about", "/settings"];

// See src/app/(tabs)/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  // The live pool rotates every few hours, so this reflects "currently
  // linkable" events rather than a permanent archive — still useful for
  // crawl discovery, and each event stays resolvable for a week after
  // rotating out (see src/lib/data/events.ts) even if a crawler is slow
  // to revisit.
  const events = await getEvents();
  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${SITE_URL}/events/${event.id}`,
    lastModified: new Date(event.date),
  }));

  return [...staticRoutes, ...eventRoutes];
}
