import { describe, expect, it } from "vitest";
import { buildSummaryPrompt } from "./route";
import type { Country, CountrySourceArticle, Event } from "@/types";

const event: Event = {
  id: "evt-1",
  title: "US Forces Disable Oil Tanker Near Kharg Island",
  category: "conflict",
  date: "2026-07-16",
  summary: "A tanker heading to Iran was disabled by US missiles.",
  context: "",
  availableCountries: ["US", "IR"],
};

const iran: Country = { code: "IR", name: "Iran", flagEmoji: "🇮🇷" };

function article(title: string): CountrySourceArticle {
  return { title, url: "https://example.com", publisher: "Press TV", publishedAt: "2026-07-16" };
}

describe("buildSummaryPrompt", () => {
  it("includes the event title, country name, and each headline with its publisher", () => {
    const prompt = buildSummaryPrompt(
      event,
      iran,
      [article("Tanker attack condemned")],
      "from-country"
    );
    expect(prompt).toContain(event.title);
    expect(prompt).toContain("Iran");
    expect(prompt).toContain('"Tanker attack condemned" (Press TV, 2026-07-16)');
  });

  it("caps the prompt at 5 headlines", () => {
    const articles = Array.from({ length: 8 }, (_, i) => article(`Headline ${i}`));
    const prompt = buildSummaryPrompt(event, iran, articles, "from-country");
    expect(prompt).toContain("Headline 4");
    expect(prompt).not.toContain("Headline 5");
  });

  it("instructs the model not to invent details", () => {
    const prompt = buildSummaryPrompt(event, iran, [article("A")], "from-country");
    expect(prompt.toLowerCase()).toContain("do not invent");
  });

  it("describes from-country articles as the country's own press", () => {
    const prompt = buildSummaryPrompt(event, iran, [article("A")], "from-country");
    expect(prompt).toContain("Iran's own press coverage");
    expect(prompt).toContain("how Iran's media is framing this event");
  });

  // Regression: v1 called fallback-tier articles "press coverage in or
  // about Iran", so the model refused to attribute framing to Iranian
  // media — and that refusal rendered in the UI as if it were a summary.
  it("does not claim mentions-only articles are the country's own media", () => {
    const prompt = buildSummaryPrompt(event, iran, [article("A")], "mentioning-country");
    expect(prompt).toContain("No outlets based in Iran covered this directly");
    expect(prompt).toContain("international headlines that mention Iran");
    expect(prompt).toContain("Do not present this as Iran's own media framing");
    expect(prompt).not.toContain("how Iran's media is framing this event");
  });
});
