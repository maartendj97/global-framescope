import Link from "next/link";
import { getCountries, getEvents, getSourceCountsByEventIds } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { StaggerItem } from "@/components/StaggerItem";

export default async function HomePage() {
  const [events, countries] = await Promise.all([getEvents(), getCountries()]);
  const sourceCountByEventId = await getSourceCountsByEventIds(
    events.map((event) => event.id)
  );

  const HOME_EVENT_COUNT = 5;
  const [featuredEvent, ...otherEvents] = events.slice(0, HOME_EVENT_COUNT);

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 md:max-w-[960px]">
      <p className="text-sm font-medium tracking-wide text-accent-text">
        Global FrameScope
      </p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground">
        Compare international framing, country by country
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One event, viewed through multiple national perspectives.
      </p>

      {featuredEvent && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Today&rsquo;s major events
          </h2>
          <EventCard
            event={featuredEvent}
            countries={countries}
            sourceCount={sourceCountByEventId.get(featuredEvent.id) ?? 0}
            variant="featured"
          />
        </section>
      )}

      {otherEvents.length > 0 && (
        <section className="mt-8 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Other events
            </h2>
            <Link href="/events" className="text-sm font-medium text-accent-text">
              View all
            </Link>
          </div>
          <div className="space-y-5">
            {otherEvents.map((event, index) => (
              <StaggerItem key={event.id} index={index}>
                <EventCard
                  event={event}
                  countries={countries}
                  sourceCount={sourceCountByEventId.get(event.id) ?? 0}
                  variant="secondary"
                />
              </StaggerItem>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
