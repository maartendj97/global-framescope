import { events as mockEvents } from "@/data/events";
import { fetchLiveEvents } from "@/lib/external/gnews";
import type { Event } from "@/types";

const EVENTS_SOURCE = process.env.EVENTS_SOURCE ?? "live";

export async function getEvents(): Promise<Event[]> {
  if (EVENTS_SOURCE === "mock") return mockEvents;

  // 6 categories every 3h keeps daily GNews calls for the events pool
  // roughly flat versus the old 3 categories every 1h (8 cycles/day x 6
  // vs. 24 cycles/day x 3 = 48 either way).
  const liveEvents = await fetchLiveEvents({
    next: { revalidate: 10800, tags: ["events"] },
  });

  // GNews has no SLA, and the key may be unset — fall back to mock events
  // rather than showing an empty state if the live fetch comes back empty.
  return liveEvents.length > 0 ? liveEvents : mockEvents;
}

export async function getEventById(id: string): Promise<Event | undefined> {
  const allEvents = await getEvents();
  return allEvents.find((event) => event.id === id);
}
