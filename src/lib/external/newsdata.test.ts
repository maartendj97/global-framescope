import { describe, expect, it } from "vitest";
import { toCountrySourceArticle } from "./newsdata";

function article(overrides: {
  title?: string;
  link?: string;
  description?: string | null;
  pubDate?: string;
  source_id?: string;
  source_name?: string;
}) {
  return {
    title: overrides.title ?? "Talks resume",
    link: overrides.link ?? "https://example.com/article",
    description: overrides.description === undefined ? "Officials met today." : overrides.description,
    pubDate: overrides.pubDate ?? "2026-07-20 08:00:00",
    source_id: overrides.source_id ?? "example_wire",
    source_name: overrides.source_name,
  };
}

describe("toCountrySourceArticle", () => {
  it("prefers source_name over source_id when both are present", () => {
    const result = toCountrySourceArticle(
      article({ source_id: "example_wire", source_name: "Example Wire" })
    );
    expect(result.publisher).toBe("Example Wire");
  });

  it("falls back to source_id when source_name is absent", () => {
    const result = toCountrySourceArticle(article({ source_id: "example_wire", source_name: undefined }));
    expect(result.publisher).toBe("example_wire");
  });

  // NewsData.io's pubDate is "YYYY-MM-DD HH:mm:ss" (UTC, space-separated,
  // no "T"), unlike GNews/Currents' ISO format.
  it("slices the space-separated pubDate down to a plain date", () => {
    const result = toCountrySourceArticle(article({ pubDate: "2026-07-20 14:32:10" }));
    expect(result.publishedAt).toBe("2026-07-20");
  });

  it("passes through a null description as undefined", () => {
    const result = toCountrySourceArticle(article({ description: null }));
    expect(result.description).toBeUndefined();
  });

  it("keeps a real description", () => {
    const result = toCountrySourceArticle(article({ description: "Officials met today." }));
    expect(result.description).toBe("Officials met today.");
  });
});
