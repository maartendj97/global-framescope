import { getCountries, getEvents, getSourceCountsByEventIds } from "@/lib/data";
import { EventCard } from "@/components/EventCard";

export default async function EventsPage() {
  const [events, countries] = await Promise.all([getEvents(), getCountries()]);
  const sourceCountByEventId = await getSourceCountsByEventIds(
    events.map((event) => event.id)
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-4 md:max-w-[960px]">
      <h1 className="font-serif text-2xl text-foreground">Events</h1>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            countries={countries}
            sourceCount={sourceCountByEventId.get(event.id) ?? 0}
            variant="list"
          />
        ))}
      </div>
    </div>
  );
}
