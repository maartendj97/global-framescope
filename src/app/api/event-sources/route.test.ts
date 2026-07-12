import { describe, expect, it } from "vitest";
import { mergeCountryArticles } from "./route";

const article = (title: string, publishedAt: string) => ({
  title,
  url: `https://example.com/${title}`,
  publisher: "Example Publisher",
  publishedAt,
});

describe("mergeCountryArticles", () => {
  it("flattens per-country results and tags each article with countryCode and tier", () => {
    const merged = mergeCountryArticles([
      { countryCode: "NL", tier: "from-country", articles: [article("a", "2026-01-01")] },
      { countryCode: "DE", tier: "mentioning-country", articles: [article("b", "2026-01-02")] },
    ]);

    expect(merged).toContainEqual({ ...article("a", "2026-01-01"), countryCode: "NL", tier: "from-country" });
    expect(merged).toContainEqual({ ...article("b", "2026-01-02"), countryCode: "DE", tier: "mentioning-country" });
  });

  it("sorts the merged list by publishedAt descending", () => {
    const merged = mergeCountryArticles([
      { countryCode: "NL", tier: "from-country", articles: [article("old", "2026-01-01")] },
      { countryCode: "DE", tier: "from-country", articles: [article("new", "2026-01-05")] },
      { countryCode: "US", tier: "from-country", articles: [article("mid", "2026-01-03")] },
    ]);

    expect(merged.map((a) => a.title)).toEqual(["new", "mid", "old"]);
  });

  it("returns an empty array when every country has zero articles", () => {
    const merged = mergeCountryArticles([
      { countryCode: "NL", tier: "from-country", articles: [] },
      { countryCode: "DE", tier: "from-country", articles: [] },
    ]);

    expect(merged).toEqual([]);
  });

  it("preserves articles from countries with no fallback alongside mentioning-country tier rows", () => {
    const merged = mergeCountryArticles([
      { countryCode: "NL", tier: "from-country", articles: [article("direct", "2026-01-02")] },
      { countryCode: "DE", tier: "mentioning-country", articles: [article("mentioned", "2026-01-01")] },
    ]);

    expect(merged.find((a) => a.title === "direct")?.tier).toBe("from-country");
    expect(merged.find((a) => a.title === "mentioned")?.tier).toBe("mentioning-country");
  });
});
