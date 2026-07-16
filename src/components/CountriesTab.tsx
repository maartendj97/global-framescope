"use client";

import { useState } from "react";
import type { Country, CountryCode, CountryFraming, Event, Source } from "@/types";
import { ToneBadge } from "./ToneBadge";
import { Flag } from "./Flag";
import { ChevronRightIcon } from "./icons";
import { CountryPerspective } from "./CountryPerspective";
import { CountryRealSources } from "./CountryRealSources";
import { StaggerItem } from "./StaggerItem";
import { orderCountriesByInterest } from "@/lib/countryOrdering";

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
            eventTitle={event.title}
            onBack={() => setSelectedCode(null)}
          />
        );
      }
      if (!hasFramings) {
        return (
          <CountryRealSources
            // Remount on country switch so fetch state never leaks from the
            // previously viewed country (initial "loading" is always fresh).
            key={country.code}
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
        {orderCountriesByInterest(
          countries.filter((country) => !hasFramings || framingByCode.has(country.code)),
          event
        ).map((country, index) => {
            const framing = framingByCode.get(country.code);
            return (
              <StaggerItem key={country.code} index={index}>
                <button
                  type="button"
                  onClick={() => setSelectedCode(country.code)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <Flag code={country.code} className="h-5 w-7 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{country.name}</p>
                    {framing ? (
                      <>
                        <p className="text-xs font-medium text-muted-foreground">
                          {framing.mainFrame}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {framing.mainNarrative}
                        </p>
                      </>
                    ) : (
                      <p className="truncate text-xs text-muted-foreground">
                        View summary &amp; coverage
                      </p>
                    )}
                  </div>
                  {framing && <ToneBadge tone={framing.toneCategory} />}
                  <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              </StaggerItem>
            );
          })}
      </div>
    </div>
  );
}
