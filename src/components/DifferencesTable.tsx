import type { Country, CountryFraming } from "@/types";
import { FramingTable } from "./FramingTable";

type DifferencesTableProps = {
  countries: Country[];
  framings: CountryFraming[];
};

export function DifferencesTable({ countries, framings }: DifferencesTableProps) {
  if (framings.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground">Comparison overview</h3>
        <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm text-muted-foreground">
            A side-by-side comparison of country framing isn&rsquo;t available for this
            event yet — that requires hand-written analysis, which only exists for
            the original demo events. Check the Countries tab for real coverage from
            each country instead.
          </p>
        </div>
      </div>
    );
  }

  return <FramingTable countries={countries} framings={framings} />;
}
