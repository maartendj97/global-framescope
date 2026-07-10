import { countries } from "@/data/countries";
import type { Country, CountryCode } from "@/types";

export async function getCountries(): Promise<Country[]> {
  return countries;
}

export async function getCountryByCode(code: CountryCode): Promise<Country | undefined> {
  return countries.find((country) => country.code === code);
}
