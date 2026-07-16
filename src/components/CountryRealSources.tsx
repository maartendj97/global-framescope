"use client";

import useSWR from "swr";
import type { Country, CountrySourceArticle, CoverageTier, Event } from "@/types";
import { BackButton } from "./BackButton";
import { CountryHeader } from "./CountryHeader";
import { SourceListItem } from "./SourceListItem";
import { ExternalLinkIcon } from "./icons";
import { formatRelativeOrDate } from "@/lib/eventDisplay";
import { fetcher, SWR_OPTIONS } from "@/lib/swrFetcher";

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
// gray for state media, amber for mentions-only. Same fixed-pill
// approach as ToneBadge, and the same WCAG check applies (gray-100/700
// ~9.4:1, sky-100/800 ~6.5:1, amber-100/800 ~6.4:1 — all well past 4.5:1).
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
  // Keyed by event id + country code, so switching back to a country
  // already viewed in this session serves its coverage instantly from
  // SWR's cache instead of re-fetching and re-showing the skeleton.
  const { data, error } = useSWR<{ articles: CountrySourceArticle[]; tier: CoverageTier }>(
    `/api/country-sources?eventId=${encodeURIComponent(event.id)}&country=${country.code}`,
    fetcher,
    SWR_OPTIONS
  );

  // Fetched in parallel with the sources above; the section renders
  // only when a summary actually comes back, so a missing API key, the
  // daily spend cap, or zero coverage all just mean "sources only".
  const { data: summaryData } = useSWR<{ summary: string | null; pending?: boolean }>(
    `/api/country-summary?eventId=${encodeURIComponent(event.id)}&country=${country.code}`,
    fetcher,
    SWR_OPTIONS
  );
  const summaryLoading = summaryData === undefined;
  const summary = summaryData?.summary ?? null;
  const state: FetchState = error
    ? { status: "error" }
    : data
      ? { status: "loaded", articles: data.articles, tier: data.tier }
      : { status: "loading" };

  const loaded = state.status === "loaded" && state.articles.length > 0 ? state : null;
  const [latest, ...others] = loaded ? loaded.articles : [];
  const badge = loaded ? COVERAGE_BADGES[coverageKind(loaded.articles, loaded.tier)] : null;

  return (
    <div>
      <BackButton onClick={onBack} label="Countries" />

      <CountryHeader
        country={country}
        badge={
          badge && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          )
        }
      />

      <div className="mt-4 space-y-5 rounded-2xl border border-border bg-surface p-4">
        {(summaryLoading || summary) && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What {country.name}&rsquo;s media is saying
            </h4>
            {summaryLoading ? (
              <div
                className="mt-2 animate-pulse space-y-2"
                aria-label="Loading summary"
                aria-busy="true"
              >
                <div className="h-4 w-full rounded bg-surface-secondary" />
                <div className="h-4 w-[92%] rounded bg-surface-secondary" />
                <div className="h-4 w-[60%] rounded bg-surface-secondary" />
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  AI-generated overview of the headlines below — read the sources for the full
                  picture.
                </p>
              </>
            )}
          </div>
        )}

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
                <SourceListItem
                  key={article.url}
                  title={article.title}
                  url={article.url}
                  publisher={article.publisher}
                  dateLabel={formatRelativeOrDate(article.publishedAt)}
                />
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
