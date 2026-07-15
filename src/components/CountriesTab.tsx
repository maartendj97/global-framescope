"use client";

import { useState } from "react";
import useSWR from "swr";
import type {
  Country,
  CountryCode,
  CountryFraming,
  Event,
  EventSourceArticle,
  Source,
} from "@/types";
import { ToneBadge } from "./ToneBadge";
import { Flag } from "./Flag";
import { ChevronRightIcon } from "./icons";
import { CountryPerspective } from "./CountryPerspective";
import { CountryRealSources } from "./CountryRealSources";
import { StaggerItem } from "./StaggerItem";
import { fetcher, SWR_OPTIONS } from "@/lib/swrFetcher";

type CountriesTabProps = {
  event: Event;
  countries: Country[];
  framings: CountryFraming[];
  sources: Source[];
};

type CoverageSummary = { count: number; hasStateMedia: boolean };

type CoverageState =
  | { status: "loading" }
  | { status: "loaded"; byCountry: Map<CountryCode, CoverageSummary> }
  | { status: "error" };

// One aggregate fetch for the whole event, not one per row — reuses the
// same /api/event-sources endpoint the old Sources tab called. Article
// counts/tiers only, so this stays cheap even at 8 countries; tapping into
// a country still does its own richer fetch (cache-backed, so effectively
// free after this call already warmed it).
function summarizeByCountry(articles: EventSourceArticle[]): Map<CountryCode, CoverageSummary> {
  const byCountry = new Map<CountryCode, CoverageSummary>();
  for (const article of articles) {
    const entry = byCountry.get(article.countryCode) ?? { count: 0, hasStateMedia: false };
    entry.count += 1;
    if (article.sourceType === "state-media") entry.hasStateMedia = true;
    byCountry.set(article.countryCode, entry);
  }
  return byCountry;
}

function liveRowSubtitle(coverage: CoverageState, countryCode: CountryCode): string {
  if (coverage.status === "loading") return "Checking coverage…";
  if (coverage.status === "error") return "View real coverage";
  const entry = coverage.byCountry.get(countryCode);
  if (!entry || entry.count === 0) return "View real coverage";
  const articleWord = entry.count === 1 ? "article" : "articles";
  return entry.hasStateMedia
    ? `${entry.count} ${articleWord} · State media`
    : `${entry.count} ${articleWord} · Local press`;
}

export function CountriesTab({ event, countries, framings, sources }: CountriesTabProps) {
  const [selectedCode, setSelectedCode] = useState<CountryCode | null>(null);

  const framingByCode = new Map(framings.map((framing) => [framing.countryCode, framing]));
  // Mock events have hand-written framings for every country; real
  // (live-fetched) events have none yet, since per-country narrative
  // analysis isn't generated — those fall back to real, on-demand
  // fetched articles per country instead of a synthesized frame.
  const hasFramings = framings.length > 0;

  // Keyed by event id so revisiting this event's Countries tab (e.g.
  // after navigating away and back) serves the already-fetched summary
  // instantly from SWR's cache instead of re-fetching.
  const { data, error } = useSWR<{ articles: EventSourceArticle[] }>(
    hasFramings ? null : `/api/event-sources?eventId=${encodeURIComponent(event.id)}`,
    fetcher,
    SWR_OPTIONS
  );
  const coverage: CoverageState = error
    ? { status: "error" }
    : data
      ? { status: "loaded", byCountry: summarizeByCountry(data.articles) }
      : { status: "loading" };

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
        {countries
          .filter((country) => !hasFramings || framingByCode.has(country.code))
          .map((country, index) => {
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
                        {liveRowSubtitle(coverage, country.code)}
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
