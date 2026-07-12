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
  if (!event) return {};

  return {
    title: `${event.title} | Global FrameScope`,
    description: event.summary,
    openGraph: {
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
