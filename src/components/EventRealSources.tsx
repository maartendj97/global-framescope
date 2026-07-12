"use client";

import { useEffect, useState } from "react";
import type { Country, Event } from "@/types";
import { ExternalLinkIcon } from "./icons";
import { formatRelativeOrDate } from "@/lib/eventDisplay";
import type { EventSourceArticle } from "@/app/api/event-sources/route";

type EventRealSourcesProps = {
  event: Event;
  countries: Country[];
};

type FetchState =
  | { status: "loading" }
  | { status: "loaded"; articles: EventSourceArticle[] }
  | { status: "error" };

export function EventRealSources({ event, countries }: EventRealSourcesProps) {
  // Lazy initializer, not a setState call inside the effect body — this
  // component only mounts when there's no curated source list, and fully
  // remounts whenever the event changes (one event per route), so there's
  // no case where the effect itself needs to reset state back to "loading".
  const [state, setState] = useState<FetchState>(() => ({ status: "loading" }));
  const countryByCode = new Map(countries.map((country) => [country.code, country]));

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/event-sources?eventId=${encodeURIComponent(event.id)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { articles: EventSourceArticle[] }) => {
        if (!cancelled) setState({ status: "loaded", articles: data.articles });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [event.id]);

  if (state.status === "loading") {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <ul className="space-y-3" aria-label="Loading real coverage" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <li key={index} className="animate-pulse space-y-2">
              <div className="h-4 w-[85%] rounded bg-surface-secondary" />
              <div className="h-3 w-1/3 rounded bg-surface-secondary" />
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Checking coverage across all {countries.length} countries — this can
          take up to 15 seconds the first time.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">
          Couldn&rsquo;t load coverage right now. Please try again shortly.
        </p>
      </div>
    );
  }

  if (state.articles.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">
          No coverage was found for this topic across any of the {countries.length}{" "}
          countries yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {state.articles.map((article) => {
        const country = countryByCode.get(article.countryCode);
        return (
          <div key={article.url} className="rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{article.title}</p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${article.title} in a new tab`}
              >
                <ExternalLinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <p className="text-xs text-muted-foreground">
                {article.publisher}
                {country && (
                  <>
                    {" "}
                    <span aria-hidden="true">{country.flagEmoji}</span> {country.name}
                  </>
                )}
                {" · "}
                {formatRelativeOrDate(article.publishedAt)}
              </p>
              {article.tier === "mentioning-country" && country && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  Mentions {country.name}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Coverage results may be cached for up to 24 hours.
      </p>
    </div>
  );
}
