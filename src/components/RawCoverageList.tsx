import type { Country, CountryCode, CountrySourceArticle } from "@/types";
import { Flag } from "./Flag";
import { SourceListItem } from "./SourceListItem";
import { formatRelativeOrDate } from "@/lib/eventDisplay";

type RawCoverageListProps = {
  countries: Country[];
  rawCoverage: { countryCode: CountryCode; articles: CountrySourceArticle[] }[];
};

// Shown instead of an AI-synthesized comparison when generation failed
// (most often a safety-classifier refusal on dense conflict content — see
// event-framing/route.ts) — real headlines the client already has, so
// "one event, multiple perspectives" still holds even without an AI
// narrative layered on top.
export function RawCoverageList({ countries, rawCoverage }: RawCoverageListProps) {
  const articlesByCode = new Map(rawCoverage.map((entry) => [entry.countryCode, entry.articles]));

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">Coverage by country</h3>
      <div className="mt-3 space-y-4">
        {countries.map((country) => {
          const articles = articlesByCode.get(country.code);
          if (!articles || articles.length === 0) return null;
          return (
            <div key={country.code} className="rounded-2xl border border-border bg-surface p-3">
              <h4 className="flex items-center text-sm font-semibold text-foreground">
                <Flag code={country.code} className="mr-1.5 h-3.5 w-5" aria-hidden="true" />
                {country.name}
              </h4>
              <ul className="mt-2 space-y-3">
                {articles.map((article) => (
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
          );
        })}
      </div>
    </div>
  );
}
