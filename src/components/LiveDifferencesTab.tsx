"use client";

import useSWR from "swr";
import type { Country, CountryCode, Event, EventCountryFraming, EventKeyDifference } from "@/types";
import { Flag } from "./Flag";
import { ToneBadge } from "./ToneBadge";
import { fetcher, SWR_OPTIONS } from "@/lib/swrFetcher";

type LiveDifferencesTabProps = {
  event: Event;
  countries: Country[];
};

type EventFramingResponse = {
  framings: EventCountryFraming[];
  differences: EventKeyDifference[];
  notCoveredBy: CountryCode[];
  pending?: boolean;
};

export function LiveDifferencesTab({ event, countries }: LiveDifferencesTabProps) {
  const { data, error } = useSWR<EventFramingResponse>(
    `/api/event-framing?eventId=${encodeURIComponent(event.id)}`,
    fetcher,
    {
      ...SWR_OPTIONS,
      // Poll while a generation is in progress (this can legitimately
      // take longer than one request); stop once it resolves either way.
      refreshInterval: (latestData) => (latestData?.pending ? 4000 : 0),
    }
  );

  const loading = !error && data === undefined;
  const pending = data?.pending === true;
  const framingByCode = new Map((data?.framings ?? []).map((f) => [f.countryCode, f]));
  const hasContent = !!data && !pending && (data.framings.length > 0 || data.differences.length > 0);
  const notCoveredByCountries = (data?.notCoveredBy ?? [])
    .map((code) => countries.find((country) => country.code === code))
    .filter((country): country is Country => country !== undefined);

  return (
    <div className="space-y-5">
      {hasContent && (
        <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
          AI-generated analysis
        </span>
      )}

      {(loading || pending) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Comparison overview</h3>
          <div
            className="mt-3 animate-pulse space-y-3 rounded-2xl border border-border bg-surface p-4"
            aria-label={pending ? "Still generating comparison" : "Loading comparison"}
            aria-busy="true"
          >
            <div className="h-4 w-[85%] rounded bg-surface-secondary" />
            <div className="h-4 w-[70%] rounded bg-surface-secondary" />
            <div className="h-4 w-[50%] rounded bg-surface-secondary" />
          </div>
          {pending && (
            <p className="mt-2 text-xs text-muted-foreground">
              Still generating — this can take a little while the first time. Check back in a
              moment.
            </p>
          )}
        </div>
      )}

      {error && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Comparison overview</h3>
          <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted-foreground">
              Couldn&rsquo;t load the comparison right now. Please try again shortly.
            </p>
          </div>
        </div>
      )}

      {data && !pending && !hasContent && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Comparison overview</h3>
          <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted-foreground">
              A comparison isn&rsquo;t available for this event right now — check the Countries
              tab for real coverage from each country instead.
            </p>
          </div>
        </div>
      )}

      {!loading && !pending && !error && notCoveredByCountries.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-3">
          <h3 className="text-sm font-semibold text-foreground">Not covered by</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {notCoveredByCountries.map((country) => (
              <span
                key={country.code}
                title={country.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground"
              >
                <Flag code={country.code} className="h-3 w-4" aria-hidden="true" />
                {country.name}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            No coverage of this story was found in these countries&rsquo; press.
          </p>
        </div>
      )}

      {hasContent && data.differences.length > 0 && (
        <div className="space-y-3">
          {data.differences.map((difference) => (
            <div
              key={difference.title}
              className="rounded-2xl border border-border bg-surface p-3"
            >
              <h3 className="text-sm font-semibold text-foreground">{difference.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{difference.description}</p>
            </div>
          ))}
        </div>
      )}

      {hasContent && data.framings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Comparison overview</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Country</th>
                  <th className="px-3 py-2">Main frame</th>
                  <th className="px-3 py-2">Tone</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((country) => {
                  const framing = framingByCode.get(country.code);
                  if (!framing) return null;
                  return (
                    <tr key={country.code} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap text-foreground">
                        <Flag code={country.code} className="mr-1.5 h-3.5 w-5" aria-hidden="true" />
                        {country.name}
                      </td>
                      <td className="px-3 py-2 text-foreground">{framing.mainFrame}</td>
                      <td className="px-3 py-2">
                        <ToneBadge tone={framing.toneCategory} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            AI-generated from real headlines and, where available, full article text — read the
            Countries tab for the underlying sources.
          </p>
        </div>
      )}
    </div>
  );
}
