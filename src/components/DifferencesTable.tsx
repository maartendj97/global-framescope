import type { Country, CountryFraming } from "@/types";
import { ToneBadge } from "./ToneBadge";

type DifferencesTableProps = {
  countries: Country[];
  framings: CountryFraming[];
};

export function DifferencesTable({ countries, framings }: DifferencesTableProps) {
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
                    <span className="mr-1" aria-hidden="true">
                      {country.flagEmoji}
                    </span>
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
