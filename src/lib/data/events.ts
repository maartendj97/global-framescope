import { events } from "@/data/events";
import type { Event } from "@/types";

export async function getEvents(): Promise<Event[]> {
  return events;
}

export async function getEventById(id: string): Promise<Event | undefined> {
  return events.find((event) => event.id === id);
}
