import { describe, expect, it } from "vitest";
import { dedupeByUrl, matchesFallbackTier } from "./route";

function article(url: string, title = "Title") {
  return { title, description: "", url, publishedAt: "2026-07-20", source: { name: "Publisher" } };
}

describe("matchesFallbackTier", () => {
  it("matches when the country name appears in the title", () => {
    expect(
      matchesFallbackTier({ title: "Germany hosts new talks", description: "" }, "Germany")
    ).toBe(true);
  });

  it("matches when the country name appears in the description", () => {
    expect(
      matchesFallbackTier(
        { title: "Talks resume", description: "Officials from Germany attended." },
        "Germany"
      )
    ).toBe(true);
  });

  it("does not match when the country name is absent from both fields", () => {
    expect(
      matchesFallbackTier({ title: "Talks resume", description: "No mention here." }, "Germany")
    ).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(
      matchesFallbackTier({ title: "GERMANY hosts talks", description: "" }, "Germany")
    ).toBe(true);
  });

  // Regression test for e54b1c2: `description` can be null, and the old
  // `article.description?.toLowerCase().includes(...)` chain threw
  // because the optional chain only guarded `.toLowerCase()`, not the
  // subsequent `.includes(...)` call.
  it("does not throw when description is null", () => {
    expect(() =>
      matchesFallbackTier({ title: "Talks resume", description: null }, "Germany")
    ).not.toThrow();
    expect(
      matchesFallbackTier({ title: "Talks resume", description: null }, "Germany")
    ).toBe(false);
  });
});

describe("dedupeByUrl", () => {
  it("drops later articles with a URL already seen", () => {
    const result = dedupeByUrl([
      article("https://example.com/a", "First"),
      article("https://example.com/b", "Second"),
      article("https://example.com/a", "Duplicate"),
    ]);
    expect(result.map((a) => a.title)).toEqual(["First", "Second"]);
  });

  it("returns an empty array for empty input", () => {
    expect(dedupeByUrl([])).toEqual([]);
  });
});
