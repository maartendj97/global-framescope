"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Country, CountryFraming, Event, KeyDifference, Source } from "@/types";
import { BackIcon } from "./icons";
import {
  CATEGORY_LABELS,
  formatEventDate,
  getEventImageSrc,
  isExternalEventImage,
} from "@/lib/eventDisplay";
import { CountriesTab } from "./CountriesTab";
import { DifferencesTable } from "./DifferencesTable";
import { SourcesTab } from "./SourcesTab";

type Tab = "overview" | "countries" | "differences" | "sources";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "countries", label: "Countries" },
  { id: "differences", label: "Differences" },
  { id: "sources", label: "Sources" },
];

type EventDetailViewProps = {
  event: Event;
  countries: Country[];
  framings: CountryFraming[];
  keyDifferences: KeyDifference[];
  sources: Source[];
};

export function EventDetailView({
  event,
  countries,
  framings,
  keyDifferences,
  sources,
}: EventDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const eventCountries = countries.filter((country) =>
    event.availableCountries.includes(country.code)
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-10 md:max-w-[960px]">
      <button
        type="button"
        onClick={() => router.back()}
        className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground"
      >
        <BackIcon className="h-4 w-4" />
        Back
      </button>

      <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl">
        <Image
          src={getEventImageSrc(event)}
          alt=""
          fill
          className="object-cover"
          sizes="(min-width: 768px) 960px, 100vw"
          unoptimized={isExternalEventImage(event)}
          priority
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span>{CATEGORY_LABELS[event.category]}</span>
        <span aria-hidden="true">·</span>
        <span>{formatEventDate(event.date)}</span>
      </div>
      <h1 className="mt-2 font-serif text-2xl leading-snug text-foreground">
        {event.title}
      </h1>

      <div className="mt-5 flex gap-1 rounded-full border border-border bg-surface-secondary p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-foreground text-inverse-foreground"
                : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
              </h2>
              <p className="mt-1 text-sm text-foreground">{event.summary}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Context
              </h2>
              <p className="mt-1 text-sm text-foreground">{event.context}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Countries included
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {eventCountries.map((country) => (
                  <div
                    key={country.code}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  >
                    <span aria-hidden="true">{country.flagEmoji}</span>
                    {country.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "countries" && (
          <CountriesTab
            event={event}
            countries={eventCountries}
            framings={framings}
            sources={sources}
          />
        )}

        {activeTab === "differences" && (
          <div className="space-y-5">
            <div className="space-y-3">
              {keyDifferences.map((difference) => (
                <div
                  key={difference.title}
                  className="rounded-2xl border border-border bg-surface p-3"
                >
                  <h3 className="text-sm font-semibold text-foreground">
                    {difference.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {difference.description}
                  </p>
                </div>
              ))}
            </div>
            <DifferencesTable countries={eventCountries} framings={framings} />
          </div>
        )}

        {activeTab === "sources" && (
          <SourcesTab sources={sources} countries={eventCountries} />
        )}
      </div>
    </div>
  );
}
