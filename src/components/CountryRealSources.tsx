"use client";

import { useEffect, useState } from "react";
import type { Country, Event } from "@/types";
import { Flag } from "./Flag";
import { BackIcon, ExternalLinkIcon } from "./icons";
import { formatRelativeOrDate } from "@/lib/eventDisplay";
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

// Factual coverage-type labels in the same restrained pill style as
// ToneBadge — deliberately not tones. Real per-country tone analysis is
// a later phase; until then the only honest badge is where the coverage
// comes from. Colors reuse the signals this view already established:
// gray for state media, amber for mentions-only.
type CoverageKind = "state-media" | "local-press" | "mentions-only";

const COVERAGE_BADGES: Record<CoverageKind, { label: string; className: string }> = {
  "state-media": { label: "State media", className: "bg-gray-100 text-gray-700" },
  "local-press": { label: "Local press", className: "bg-sky-100 text-sky-800" },
  "mentions-only": { label: "Mentions only", className: "bg-amber-100 text-amber-800" },
};

// A response is homogeneous: fetchCountryCoverage returns either only
// state-outlet articles or only aggregator articles, never a mix.
function coverageKind(articles: CountrySourceArticle[], tier: CoverageTier): CoverageKind {
  if (tier === "mentioning-country") return "mentions-only";
  if (articles.some((article) => article.sourceType === "state-media")) return "state-media";
  return "local-press";
}

// Purely factual: counts, outlet counts, and provenance — no synthesized
// narrative or tone claims.
function coverageSummary(
  articles: CountrySourceArticle[],
  tier: CoverageTier,
  countryName: string
): string {
  const count = articles.length;
  const articleWord = count === 1 ? "article" : "articles";
  if (tier === "mentioning-country") {
    return `No outlets based in ${countryName} were found covering this story directly, so this is broader English-language coverage that mentions ${countryName} — ${count} recent ${articleWord}.`;
  }
  if (articles.every((article) => article.sourceType === "state-media")) {
    return `${count} recent ${articleWord} directly from ${countryName}’s state-run outlets.`;
  }
  const outletCount = new Set(articles.map((article) => article.publisher)).size;
  const outletPhrase = outletCount === 1 ? "an outlet" : `${outletCount} outlets`;
  return `${count} recent ${articleWord} from ${outletPhrase} based in ${countryName}.`;
}

export function CountryRealSources({ country, event, onBack }: CountryRealSourcesProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  // The parent keys this component by country code, so a country switch
  // remounts it and the initial "loading" state above is always correct —
  // no synchronous reset inside the effect needed.
  useEffect(() => {
    let cancelled = false;

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

  const loaded = state.status === "loaded" && state.articles.length > 0 ? state : null;
  const [latest, ...others] = loaded ? loaded.articles : [];
  const badge = loaded ? COVERAGE_BADGES[coverageKind(loaded.articles, loaded.tier)] : null;

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
        <Flag code={country.code} className="h-6 w-9" aria-hidden="true" />
        <h3 className="font-serif text-xl text-foreground">{country.name}</h3>
        {badge && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-5 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coverage
          </h4>

          {state.status === "loading" && (
            <div className="mt-2 animate-pulse space-y-2" aria-label="Loading coverage" aria-busy="true">
              <div className="h-5 w-[70%] rounded bg-surface-secondary" />
              <div className="h-4 w-[90%] rounded bg-surface-secondary" />
            </div>
          )}

          {state.status === "error" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Couldn&rsquo;t load coverage right now. Please try again shortly.
            </p>
          )}

          {state.status === "loaded" && state.articles.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              No coverage from or mentioning {country.name} was found for this topic yet.
            </p>
          )}

          {loaded && (
            <>
              <p className="mt-1 font-serif text-lg text-foreground">
                {coverageSummary(loaded.articles, loaded.tier, country.name)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                The headlines below are real, current reporting — how{" "}
                {country.name}&rsquo;s press is telling this story right now, not a
                synthesized summary of {country.name}&rsquo;s framing.
              </p>
            </>
          )}
        </div>

        {state.status === "loading" && (
          <ul className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <li key={index} className="animate-pulse space-y-2">
                <div className="h-4 w-[85%] rounded bg-surface-secondary" />
                <div className="h-3 w-1/3 rounded bg-surface-secondary" />
              </li>
            ))}
          </ul>
        )}

        {loaded && latest && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Latest headline
            </h4>
            <a
              href={latest.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block font-serif text-lg leading-snug text-foreground hover:underline"
            >
              {latest.title}
              <ExternalLinkIcon className="ml-1.5 inline h-4 w-4 align-baseline text-muted-foreground" />
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              {latest.publisher} &middot; {formatRelativeOrDate(latest.publishedAt)}
            </p>
          </div>
        )}

        {loaded && others.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              More sources ({others.length})
            </h4>
            <ul className="mt-2 space-y-3">
              {others.map((article) => (
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
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {article.publisher} &middot; {formatRelativeOrDate(article.publishedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.status === "loaded" && (
          <p className="text-xs text-muted-foreground">
            Coverage results may be cached for up to 24 hours.
          </p>
        )}
      </div>
    </div>
  );
}
