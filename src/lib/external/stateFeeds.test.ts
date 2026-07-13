import { describe, expect, it } from "vitest";
import {
  countKeywordHits,
  extractCategoryPhrases,
  extractTitleKeywords,
  mapFeedItem,
  STATE_FEEDS,
} from "./stateFeeds";
import { CATEGORY_QUERIES } from "./gnews";
import { isSanctionedPublisher } from "./blockedPublishers";

describe("extractCategoryPhrases", () => {
  it("pulls the quoted phrases out of a category query", () => {
    expect(extractCategoryPhrases('"ceasefire" OR "peace talks"')).toEqual([
      "ceasefire",
      "peace talks",
    ]);
  });

  it("works on every real category query", () => {
    for (const query of Object.values(CATEGORY_QUERIES)) {
      expect(extractCategoryPhrases(query).length).toBeGreaterThan(0);
    }
  });
});

describe("extractTitleKeywords", () => {
  it("keeps the meaningful words of an event title", () => {
    const keywords = extractTitleKeywords(
      "US and Iran trade Strait of Hormuz control claims after fresh strikes"
    );
    expect(keywords).toContain("iran");
    expect(keywords).toContain("hormuz");
    expect(keywords).toContain("strait");
  });

  it("drops stopwords and short words", () => {
    const keywords = extractTitleKeywords("US and Iran claims after fresh news");
    expect(keywords).not.toContain("and");
    expect(keywords).not.toContain("us");
    expect(keywords).not.toContain("claims");
    expect(keywords).not.toContain("after");
    expect(keywords).not.toContain("fresh");
    expect(keywords).not.toContain("news");
  });

  it("deduplicates repeated words", () => {
    expect(extractTitleKeywords("Ukraine Ukraine peace")).toEqual(["ukraine", "peace"]);
  });
});

describe("countKeywordHits", () => {
  const keywords = ["iran", "hormuz", "ceasefire"];

  it("counts distinct keyword matches, case-insensitively", () => {
    expect(countKeywordHits("IRAN closes Strait of Hormuz", keywords)).toBe(2);
  });

  it("returns zero for unrelated text", () => {
    expect(countKeywordHits("Local football results", keywords)).toBe(0);
  });
});

describe("mapFeedItem", () => {
  const validItem = {
    title: "Ceasefire talks continue",
    link: "https://tass.com/politics/12345",
    isoDate: "2026-07-13T10:00:00.000Z",
  };

  it("maps a valid feed item and labels it state media", () => {
    expect(mapFeedItem(validItem, "TASS")).toEqual({
      title: "Ceasefire talks continue",
      url: "https://tass.com/politics/12345",
      publisher: "TASS",
      publishedAt: "2026-07-13",
      sourceType: "state-media",
    });
  });

  it("falls back to pubDate when isoDate is missing", () => {
    const item = { ...validItem, isoDate: undefined, pubDate: "Sun, 13 Jul 2026 10:00:00 GMT" };
    expect(mapFeedItem(item, "TASS")?.publishedAt).toBe("2026-07-13");
  });

  it("skips items without a link", () => {
    expect(mapFeedItem({ ...validItem, link: undefined }, "TASS")).toBeNull();
  });

  it("skips items without a title", () => {
    expect(mapFeedItem({ ...validItem, title: undefined }, "TASS")).toBeNull();
  });

  it("skips items with an unparseable date", () => {
    expect(mapFeedItem({ ...validItem, isoDate: undefined, pubDate: "not a date" }, "TASS")).toBeNull();
  });
});

describe("STATE_FEEDS config", () => {
  it("contains no EU-sanctioned outlets", () => {
    for (const feed of STATE_FEEDS) {
      expect(isSanctionedPublisher(feed.outlet), `${feed.outlet} is sanctioned`).toBe(false);
    }
  });
});
