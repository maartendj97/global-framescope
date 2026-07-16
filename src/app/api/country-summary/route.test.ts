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
    const prompt = buildSummaryPrompt(event, iran, [article("Tanker attack condemned")]);
    expect(prompt).toContain(event.title);
    expect(prompt).toContain("Iran");
    expect(prompt).toContain('"Tanker attack condemned" (Press TV, 2026-07-16)');
  });

  it("caps the prompt at 5 headlines", () => {
    const articles = Array.from({ length: 8 }, (_, i) => article(`Headline ${i}`));
    const prompt = buildSummaryPrompt(event, iran, articles);
    expect(prompt).toContain("Headline 4");
    expect(prompt).not.toContain("Headline 5");
  });

  it("instructs the model not to invent details", () => {
    const prompt = buildSummaryPrompt(event, iran, [article("A")]);
    expect(prompt.toLowerCase()).toContain("do not invent");
  });
});
