import { getCountries, getEvents, getSourceCountsByEventIds } from "@/lib/data";
import { EventsList } from "@/components/EventsList";

export default async function EventsPage() {
  const [events, countries] = await Promise.all([getEvents(), getCountries()]);
  const sourceCountByEventId = await getSourceCountsByEventIds(
    events.map((event) => event.id)
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-4 md:max-w-[960px]">
      <h1 className="font-serif text-2xl text-foreground">Events</h1>
      <EventsList
        events={events}
        countries={countries}
        sourceCountByEventId={sourceCountByEventId}
      />
    </div>
  );
}
