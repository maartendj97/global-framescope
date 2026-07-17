import { describe, expect, it } from "vitest";
import { buildSummaryArticles, buildSummaryPrompt } from "./route";
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

function article(title: string, description?: string): CountrySourceArticle {
  return {
    title,
    url: "https://example.com",
    publisher: "Press TV",
    publishedAt: "2026-07-16",
    description,
  };
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

  it("appends the article description when present", () => {
    const prompt = buildSummaryPrompt(
      event,
      iran,
      [article("Tanker attack condemned", "Iranian officials called the strike an act of aggression.")],
      "from-country"
    );
    expect(prompt).toContain(
      '"Tanker attack condemned" (Press TV, 2026-07-16): Iranian officials called the strike an act of aggression.'
    );
  });

  it("omits the colon suffix when an article has no description", () => {
    const prompt = buildSummaryPrompt(event, iran, [article("Tanker attack condemned")], "from-country");
    expect(prompt).toContain('"Tanker attack condemned" (Press TV, 2026-07-16)\n');
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

function articleWithUrl(url: string, description?: string): CountrySourceArticle {
  return { title: "A headline", url, publisher: "Press TV", publishedAt: "2026-07-16", description };
}

describe("buildSummaryArticles", () => {
  it("overrides an article's description with its extracted full text", () => {
    const articles = [articleWithUrl("https://a.example", "short snippet")];
    const extracted = new Map([["https://a.example", "The full article body, much longer than the snippet."]]);

    const result = buildSummaryArticles(articles, extracted);

    expect(result[0].description).toBe("The full article body, much longer than the snippet.");
  });

  it("truncates extracted text to the max body length", () => {
    const longText = "x".repeat(2000);
    const articles = [articleWithUrl("https://a.example")];
    const extracted = new Map([["https://a.example", longText]]);

    const result = buildSummaryArticles(articles, extracted);

    expect(result[0].description?.length).toBe(1500);
  });

  it("keeps the original description when no extracted text is available for that URL", () => {
    const articles = [articleWithUrl("https://a.example", "short snippet")];
    const extracted = new Map<string, string | null>([["https://a.example", null]]);

    const result = buildSummaryArticles(articles, extracted);

    expect(result[0].description).toBe("short snippet");
  });

  it("leaves an article with neither extracted text nor a description untouched", () => {
    const articles = [articleWithUrl("https://a.example")];
    const extracted = new Map<string, string | null>();

    const result = buildSummaryArticles(articles, extracted);

    expect(result[0].description).toBeUndefined();
  });
});
