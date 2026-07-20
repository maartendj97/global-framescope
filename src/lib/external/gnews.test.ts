import { describe, expect, it } from "vitest";
import { clusterArticles } from "./gnews";

function article(overrides: {
  title: string;
  description?: string;
  url?: string;
  publisher?: string;
  publishedAt?: string;
}) {
  return {
    title: overrides.title,
    description: overrides.description ?? "",
    url: overrides.url ?? `https://example.com/${overrides.title}`,
    image: null,
    publishedAt: overrides.publishedAt ?? "2026-07-20T08:00:00Z",
    source: { name: overrides.publisher ?? "Wire Service", url: "https://example.com" },
  };
}

describe("clusterArticles", () => {
  it("merges same-story headlines from different publishers into one cluster", () => {
    const clusters = clusterArticles([
      article({ title: "US and Iran agree ceasefire ending Gulf tensions", publisher: "Reuters" }),
      article({ title: "Iran, US reach ceasefire deal ending Gulf tensions", publisher: "AP" }),
      article({
        title: "Ceasefire agreed between Iran and United States over Gulf tensions",
        publisher: "BBC",
      }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(3);
  });

  it("does not merge different stories in the same category that share only the topic keyword and a country", () => {
    const clusters = clusterArticles([
      article({ title: "US resumes nuclear talks with North Korea", publisher: "Reuters" }),
      article({ title: "Iran and world powers hold nuclear talks in Vienna", publisher: "AP" }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("keeps unrelated stories in separate clusters", () => {
    const clusters = clusterArticles([
      article({ title: "US and Iran agree ceasefire in Gulf tensions", publisher: "Reuters" }),
      article({ title: "Colombia and rebel group sign peace talks framework", publisher: "AP" }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("does not merge on a single shared generic word", () => {
    const clusters = clusterArticles([
      article({ title: "Government announces new peace talks framework", publisher: "Reuters" }),
      article({ title: "Opposition rejects election talks proposal", publisher: "AP" }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("returns one cluster per article when nothing matches", () => {
    const clusters = clusterArticles([
      article({ title: "Trade deal signed between two nations", publisher: "Reuters" }),
      article({ title: "Climate summit ends without agreement", publisher: "AP" }),
      article({ title: "Election results contested by opposition", publisher: "BBC" }),
    ]);
    expect(clusters).toHaveLength(3);
  });

  it("handles an empty article list", () => {
    expect(clusterArticles([])).toEqual([]);
  });
});
