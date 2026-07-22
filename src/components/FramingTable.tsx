import type { Country, CountryCode, ToneCategory } from "@/types";
import { ToneBadge } from "./ToneBadge";
import { Flag } from "./Flag";

// Deliberately narrower than CountryFraming or EventCountryFraming (see
// src/types/framing.ts and src/types/eventFraming.ts) — this table only
// ever renders these three fields, and staying structural lets either
// framing type pass through without coupling the two apart-by-design
// data paths (mock-curated vs. AI-generated) together.
type FramingTableEntry = {
  countryCode: CountryCode;
  mainFrame: string;
  toneCategory: ToneCategory;
};

type FramingTableProps = {
  countries: Country[];
  framings: FramingTableEntry[];
};

export function FramingTable({ countries, framings }: FramingTableProps) {
  const framingByCode = new Map(framings.map((framing) => [framing.countryCode, framing]));

  return (
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
    </div>
  );
}
