import type { Country } from "@/types";
import { Flag } from "./Flag";

type CountryHeaderProps = {
  country: Country;
  badge?: React.ReactNode;
};

export function CountryHeader({ country, badge }: CountryHeaderProps) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <Flag code={country.code} className="h-6 w-9" aria-hidden="true" />
      <h3 className="font-serif text-xl text-foreground">{country.name}</h3>
      {badge}
    </div>
  );
}
