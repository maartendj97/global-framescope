"use client";

import { useState } from "react";
import type { Country, CountryCode, CountryFraming, Event, Source } from "@/types";
import { ToneBadge } from "./ToneBadge";
import { ChevronRightIcon } from "./icons";
import { CountryPerspective } from "./CountryPerspective";
import { CountryRealSources } from "./CountryRealSources";

type CountriesTabProps = {
  event: Event;
  countries: Country[];
  framings: CountryFraming[];
  sources: Source[];
};

export function CountriesTab({ event, countries, framings, sources }: CountriesTabProps) {
  const [selectedCode, setSelectedCode] = useState<CountryCode | null>(null);

  const framingByCode = new Map(framings.map((framing) => [framing.countryCode, framing]));
  // Mock events have hand-written framings for every country; real
  // (live-fetched) events have none yet, since per-country narrative
  // analysis isn't generated — those fall back to real, on-demand
  // fetched articles per country instead of a synthesized frame.
  const hasFramings = framings.length > 0;

  if (selectedCode) {
    const country = countries.find((c) => c.code === selectedCode);
    if (country) {
      const framing = framingByCode.get(selectedCode);
      if (hasFramings && framing) {
        const framingSources = sources.filter((source) =>
          framing.sourceIds.includes(source.id)
        );
        return (
          <CountryPerspective
            country={country}
            framing={framing}
            sources={framingSources}
            onBack={() => setSelectedCode(null)}
          />
        );
      }
      if (!hasFramings) {
        return (
          <CountryRealSources
            country={country}
            event={event}
            onBack={() => setSelectedCode(null)}
          />
        );
      }
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">
        Choose a country to view its perspective
      </h3>
      <div className="mt-3 space-y-2">
        {countries.map((country) => {
          const framing = framingByCode.get(country.code);
          if (hasFramings && !framing) return null;
          return (
            <button
              key={country.code}
              type="button"
              onClick={() => setSelectedCode(country.code)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-xl" aria-hidden="true">
                {country.flagEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{country.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {framing ? framing.mainFrame : "View real coverage"}
                </p>
              </div>
              {framing && <ToneBadge tone={framing.toneCategory} />}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
