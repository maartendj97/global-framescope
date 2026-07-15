import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCountries,
  getCountryFramingsForEvent,
  getEventById,
  getKeyDifferences,
  getSourcesByEventId,
} from "@/lib/data";
import { EventDetailView } from "@/components/EventDetailView";
import { getEventImageSrc } from "@/lib/eventDisplay";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) {
    // The event may have rotated out of the live pool or been an
    // invalid link — notFound() below still renders the branded 404,
    // this just keeps that page from inheriting a stale/blank title.
    return { title: "Event not found" };
  }

  return {
    title: event.title,
    description: event.summary,
    openGraph: {
      title: event.title,
      description: event.summary,
      images: [getEventImageSrc(event)],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.summary,
      images: [getEventImageSrc(event)],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  const [countries, framings, keyDifferences, sources] = await Promise.all([
    getCountries(),
    getCountryFramingsForEvent(id),
    getKeyDifferences(id),
    getSourcesByEventId(id),
  ]);

  return (
    <EventDetailView
      event={event}
      countries={countries}
      framings={framings}
      keyDifferences={keyDifferences}
      sources={sources}
    />
  );
}
