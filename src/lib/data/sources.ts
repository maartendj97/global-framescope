import { sources } from "@/data/sources";
import type { Source } from "@/types";

export async function getSources(): Promise<Source[]> {
  return sources;
}

export async function getSourcesByIds(sourceIds: string[]): Promise<Source[]> {
  return sources.filter((source) => sourceIds.includes(source.id));
}

export async function getSourcesByEventId(eventId: string): Promise<Source[]> {
  return sources.filter((source) => source.eventId === eventId);
}

export async function getSourceCountsByEventIds(
  eventIds: string[]
): Promise<Map<string, number>> {
  const entries = await Promise.all(
    eventIds.map(async (eventId) => [eventId, (await getSourcesByEventId(eventId)).length] as const)
  );
  return new Map(entries);
}
