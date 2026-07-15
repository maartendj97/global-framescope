"use client";

import * as Tabs from "@radix-ui/react-tabs";
import Image from "next/image";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import type { Country, CountryFraming, Event, KeyDifference, Source } from "@/types";
import { BackIcon } from "./icons";
import {
  CATEGORY_LABELS,
  formatEventDate,
  getEventImageSrc,
  isExternalEventImage,
} from "@/lib/eventDisplay";
import { getFadeSlideVariants, getTransition, useReducedMotion } from "@/lib/motionConfig";
import { CountriesTab } from "./CountriesTab";
import { DifferencesTable } from "./DifferencesTable";
import { ShareButton } from "./ShareButton";

type Tab = "overview" | "countries" | "differences";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "countries", label: "Countries" },
  { id: "differences", label: "Differences" },
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
  const prefersReducedMotion = useReducedMotion();
  const fadeSlideVariants = getFadeSlideVariants(prefersReducedMotion);
  const transition = getTransition(prefersReducedMotion);
  const eventCountries = countries.filter((country) =>
    event.availableCountries.includes(country.code)
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-10 md:max-w-[960px]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground"
        >
          <BackIcon className="h-4 w-4" />
          Back
        </button>
        <ShareButton title={event.title} text={event.summary} />
      </div>

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

      <Tabs.Root defaultValue="overview">
        <Tabs.List
          aria-label="Event detail sections"
          className="mt-5 flex gap-1 rounded-full border border-border bg-surface-secondary p-1"
        >
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="flex min-h-11 flex-1 items-center justify-center rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-foreground data-[state=active]:text-inverse-foreground"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="overview" asChild>
          <motion.div
            className="mt-5 space-y-5"
            variants={fadeSlideVariants}
            initial="hidden"
            animate="visible"
            transition={transition}
          >
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {event.summary}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Context
              </h2>
              <p className="mt-1 text-sm text-foreground">{event.context}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Perspectives
              </h2>
              <p className="mt-1 text-sm text-foreground">
                {eventCountries.length} countries are covering this story. Open the{" "}
                <span className="font-medium">Countries</span> tab above to see how each
                one frames it.
              </p>
            </div>
          </motion.div>
        </Tabs.Content>

        <Tabs.Content value="countries" asChild>
          <motion.div
            className="mt-5"
            variants={fadeSlideVariants}
            initial="hidden"
            animate="visible"
            transition={transition}
          >
            <CountriesTab
              event={event}
              countries={eventCountries}
              framings={framings}
              sources={sources}
            />
          </motion.div>
        </Tabs.Content>

        <Tabs.Content value="differences" asChild>
          <motion.div
            className="mt-5 space-y-5"
            variants={fadeSlideVariants}
            initial="hidden"
            animate="visible"
            transition={transition}
          >
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
          </motion.div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
