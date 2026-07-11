"use client";

import { useEffect, useState } from "react";
import type { Country, Event } from "@/types";
import { BackIcon, ExternalLinkIcon } from "./icons";
import { formatEventDate } from "@/lib/eventDisplay";
import type { CountrySourceArticle, CoverageTier } from "@/app/api/country-sources/route";

type CountryRealSourcesProps = {
  country: Country;
  event: Event;
  onBack: () => void;
};

type FetchState =
  | { status: "loading" }
  | { status: "loaded"; articles: CountrySourceArticle[]; tier: CoverageTier }
  | { status: "error" };

export function CountryRealSources({ country, event, onBack }: CountryRealSourcesProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/country-sources?eventId=${encodeURIComponent(event.id)}&country=${country.code}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { articles: CountrySourceArticle[]; tier: CoverageTier }) => {
        if (!cancelled) {
          setState({ status: "loaded", articles: data.articles, tier: data.tier });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [country.code, event.id]);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground"
      >
        <BackIcon className="h-4 w-4" />
        Countries
      </button>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          {country.flagEmoji}
        </span>
        <h3 className="font-serif text-xl text-foreground">{country.name}</h3>
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Real coverage
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.status === "loaded" && state.tier === "mentioning-country" ? (
              <>
                No outlets based in {country.name} were found covering this specific
                story, so here&rsquo;s broader English-language coverage that mentions{" "}
                {country.name} instead.
              </>
            ) : (
              <>
                Recent English-language coverage of this story from outlets based in{" "}
                {country.name}.
              </>
            )}{" "}
            This is real, current reporting — not a synthesized summary of{" "}
            {country.name}&rsquo;s framing.
          </p>
        </div>

        {state.status === "loading" && (
          <ul className="space-y-3" aria-label="Loading real coverage" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <li key={index} className="animate-pulse space-y-2">
                <div className="h-4 w-[85%] rounded bg-surface-secondary" />
                <div className="h-3 w-1/3 rounded bg-surface-secondary" />
              </li>
            ))}
          </ul>
        )}

        {state.status === "error" && (
          <p className="text-sm text-muted-foreground">
            Couldn&rsquo;t load coverage right now. Please try again shortly.
          </p>
        )}

        {state.status === "loaded" && state.articles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No coverage from or mentioning {country.name} was found for this topic
            yet.
          </p>
        )}

        {state.status === "loaded" && state.articles.length > 0 && (
          <ul className="space-y-3">
            {state.articles.map((article) => (
              <li key={article.url} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline"
                  >
                    {article.title}
                  </a>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${article.title} in a new tab`}
                  >
                    <ExternalLinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                </div>
                <span className="text-xs text-muted-foreground">
                  {article.publisher} &middot; {formatEventDate(article.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
