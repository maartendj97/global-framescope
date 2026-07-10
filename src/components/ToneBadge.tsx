import type { ToneCategory } from "@/types";

// Tailwind's built-in palette, deliberately not our navy/gold theme tokens:
// these small accent pills should read consistently on both light and dark
// card surfaces, not flip when --foreground swaps between themes.
const TONE_STYLES: Record<ToneCategory, { label: string; className: string }> = {
  concerned: { label: "Concerned", className: "bg-blue-100 text-blue-800" },
  cautious: { label: "Cautious", className: "bg-amber-100 text-amber-800" },
  critical: { label: "Critical", className: "bg-rose-100 text-rose-800" },
  neutral: { label: "Neutral", className: "bg-gray-100 text-gray-700" },
  balanced: { label: "Balanced", className: "bg-emerald-100 text-emerald-800" },
  supportive: { label: "Supportive", className: "bg-teal-100 text-teal-800" },
};

export function ToneBadge({ tone }: { tone: ToneCategory }) {
  const { label, className } = TONE_STYLES[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
