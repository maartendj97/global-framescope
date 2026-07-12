import type { Country, Event, Source } from "@/types";
import { ExternalLinkIcon } from "./icons";
import { EventRealSources } from "./EventRealSources";
import { formatEventDate } from "@/lib/eventDisplay";

const SOURCE_TYPE_LABELS: Record<Source["sourceType"], string> = {
  newspaper: "Newspaper",
  broadcast: "Broadcast",
  "wire-service": "Wire service",
  "state-media": "State media",
  online: "Online",
};

type SourcesTabProps = {
  sources: Source[];
  countries: Country[];
  event: Event;
};

export function SourcesTab({ sources, countries, event }: SourcesTabProps) {
  const countryByCode = new Map(countries.map((country) => [country.code, country]));

  if (sources.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          All sources cited in this analysis
        </h3>
        <div className="mt-3">
          <EventRealSources event={event} countries={countries} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">
        All sources cited in this analysis
      </h3>
      <div className="mt-3 space-y-2">
        {sources.map((source) => {
          const country = countryByCode.get(source.countryCode);
          return (
            <div
              key={source.id}
              className="rounded-2xl border border-border bg-surface p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{source.title}</p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${source.title} in a new tab`}
                  >
                    <ExternalLinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {source.publisher}
                {country && (
                  <>
                    {" "}
                    <span aria-hidden="true">{country.flagEmoji}</span> {country.name}
                  </>
                )}
                {" · "}
                {SOURCE_TYPE_LABELS[source.sourceType]}
                {" · "}
                {formatEventDate(source.publishedAt)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
