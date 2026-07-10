import { notFound } from "next/navigation";
import {
  getCountries,
  getCountryFramingsForEvent,
  getEventById,
  getKeyDifferences,
  getSourcesByEventId,
} from "@/lib/data";
import { EventDetailView } from "@/components/EventDetailView";

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
