import { countryFramings } from "@/data/countryFramings";
import type { CountryCode, CountryFraming } from "@/types";

export async function getCountryFraming(
  eventId: string,
  countryCode: CountryCode
): Promise<CountryFraming | undefined> {
  return countryFramings.find(
    (framing) => framing.eventId === eventId && framing.countryCode === countryCode
  );
}

export async function getCountryFramingsForEvent(eventId: string): Promise<CountryFraming[]> {
  return countryFramings.filter((framing) => framing.eventId === eventId);
}
