import { keyDifferences } from "@/data/keyDifferences";
import type { KeyDifference } from "@/types";

export async function getKeyDifferences(eventId: string): Promise<KeyDifference[]> {
  return keyDifferences.filter((keyDifference) => keyDifference.eventId === eventId);
}
