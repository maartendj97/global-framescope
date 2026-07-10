import type { Country, CountryFraming, Source } from "@/types";
import { ToneBadge } from "./ToneBadge";
import { BackIcon, ExternalLinkIcon } from "./icons";
import { formatEventDate } from "@/lib/eventDisplay";

type CountryPerspectiveProps = {
  country: Country;
  framing: CountryFraming;
  sources: Source[];
  onBack: () => void;
};

export function CountryPerspective({
  country,
  framing,
  sources,
  onBack,
}: CountryPerspectiveProps) {
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
        <ToneBadge tone={framing.toneCategory} />
      </div>

      <div className="mt-4 space-y-5 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Main frame
          </h4>
          <p className="mt-1 font-serif text-lg text-foreground">
            {framing.mainFrame}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {framing.mainNarrative}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key focus
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {framing.keyEmphasis.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-emphasized">
              Emphasized
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {framing.highlighted.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-downplayed">
              Downplayed
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {framing.omitted.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sources used
          </h4>
          <ul className="mt-2 space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground">{source.title}</span>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${source.title} in a new tab`}
                    >
                      <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                    </a>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {source.publisher} &middot; {formatEventDate(source.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
