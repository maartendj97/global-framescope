import type { Country, CountryFraming, Source } from "@/types";
import { ToneBadge } from "./ToneBadge";
import { BackButton } from "./BackButton";
import { CountryHeader } from "./CountryHeader";
import { SourceListItem } from "./SourceListItem";
import { ShareButton } from "./ShareButton";
import { formatEventDate } from "@/lib/eventDisplay";

type CountryPerspectiveProps = {
  country: Country;
  framing: CountryFraming;
  sources: Source[];
  eventTitle: string;
  onBack: () => void;
};

export function CountryPerspective({
  country,
  framing,
  sources,
  eventTitle,
  onBack,
}: CountryPerspectiveProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} label="Countries" />
        <ShareButton
          title={`${country.name}'s perspective: ${eventTitle}`}
          text={framing.mainFrame}
        />
      </div>

      <CountryHeader country={country} badge={<ToneBadge tone={framing.toneCategory} />} />

      <div className="mt-4 space-y-5 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Main frame
          </h4>
          <p className="mt-1 font-serif text-xl text-foreground">
            {framing.mainFrame}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground">
            {framing.mainNarrative}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tone
          </h4>
          <p className="mt-1 text-sm text-foreground">{framing.tone}</p>
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

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Terminology &amp; wording
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {framing.terminology.map((term) => (
              <span
                key={term}
                className="inline-flex items-center rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {term}
              </span>
            ))}
          </div>
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
              <SourceListItem
                key={source.id}
                title={source.title}
                url={source.url}
                publisher={source.publisher}
                dateLabel={formatEventDate(source.publishedAt)}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
