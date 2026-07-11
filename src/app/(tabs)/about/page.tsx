type Section = {
  heading: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    heading: "About Global FrameScope",
    body: "Global FrameScope helps you compare how the same major international event is framed differently across countries — neutral context, country-specific framing, and where coverage differs. We compare perspectives; we don't claim to remove all bias, and we don't label any single national perspective as automatically true, false, or propaganda. You decide.",
  },
  {
    heading: "Our method",
    body: "For each event we provide a neutral summary and broader context, then show how a small set of illustrative sources per country frames the story: what's emphasized, what's downplayed, the tone, and common terminology. Differences between countries are summarized side by side in each event's Differences tab so perspectives can be compared directly.",
  },
  {
    heading: "Data & sources",
    body: "Each source represents a single article or report — its title, publisher, country, type, and publication date, with a link to the original when available. Events are pulled from real, current news coverage and refresh roughly every hour. The per-country framing analysis (what's emphasized, downplayed, the tone, and terminology) is still illustrative mock content built to demonstrate the comparison experience, not real editorial analysis — real per-country framing is planned for a later phase.",
  },
  {
    heading: "Privacy",
    body: "Global FrameScope doesn't require an account and doesn't collect personal data in this version. The only thing stored is your chosen appearance (System/Light/Dark), saved locally in your browser.",
  },
  {
    heading: "Support",
    body: "Contact and feedback options will be added in a later phase.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-4 md:max-w-[960px]">
      <h1 className="font-serif text-2xl text-foreground">About</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One event, viewed through multiple national perspectives.
      </p>
      <div className="mt-4 space-y-3">
        {SECTIONS.map((section) => (
          <div
            key={section.heading}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <h2 className="font-serif text-base text-foreground">
              {section.heading}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {section.body}
            </p>
          </div>
        ))}
        <p className="px-1 text-xs text-muted-foreground">Version 0.1.0</p>
      </div>
    </div>
  );
}
