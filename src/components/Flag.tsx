import { CN, DE, IN, IR, NL, RU, UA, US } from "country-flag-icons/react/3x2";
import type { AriaAttributes } from "react";
import type { CountryCode } from "@/types";

// Real SVG flags instead of raw emoji — flag emoji render as plain text
// ("NL", "US") on Windows and some Linux setups, which don't ship flag
// glyphs. country-flag-icons keys its exports by the same ISO 3166-1
// alpha-2 codes as CountryCode, so this map is a direct match.
type CountryFlagIcon = typeof NL;

const FLAG_COMPONENTS: Record<CountryCode, CountryFlagIcon> = {
  NL,
  US,
  RU,
  CN,
  IN,
  IR,
  UA,
  DE,
};

type FlagProps = {
  code: CountryCode;
  className?: string;
} & Pick<AriaAttributes, "aria-hidden">;

export function Flag({ code, className, ...rest }: FlagProps) {
  const FlagIcon = FLAG_COMPONENTS[code];
  return <FlagIcon className={`inline-block rounded-[2px] ${className ?? ""}`} {...rest} />;
}
