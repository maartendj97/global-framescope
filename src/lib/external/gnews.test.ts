import { describe, expect, it } from "vitest";
import { clusterArticles, mapClusterToEvent } from "./gnews";

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

  it("merges headlines with 4+ shared keywords even when the ratio falls short", () => {
    const clusters = clusterArticles([
      article({
        title: "Farmers' 'Delhi Chalo' March Halted Amid Police Barricading on Punjab-Haryana Border",
        publisher: "PTI",
      }),
      article({
        title: "Traffic Advisory Issued as Farmers Converge on Shambhu Border for Delhi March",
        publisher: "Hindustan Times",
      }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(2);
  });

  it("merges a 3rd article that matches the 2nd but not the founding 1st article", () => {
    const clusters = clusterArticles([
      article({
        title: "Ambala Police Issue Traffic Advisory After Shambhu Border Closure",
        publisher: "Wire A",
      }),
      article({
        title: "Traffic Advisory Issued as Farmers Converge on Shambhu Border for Delhi March",
        publisher: "Wire B",
      }),
      article({
        title: "Farmers' 'Delhi Chalo' March Halted Amid Police Barricading on Punjab-Haryana Border",
        publisher: "Wire C",
      }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(3);
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

describe("mapClusterToEvent", () => {
  // Regression for the silent-collision bug: id used to be just
  // category-publisher-date, so two unrelated same-day stories sharing a
  // publisher collided and the second was dropped by fetchLiveEvents'
  // seenIds check.
  it("gives distinct same-day, same-publisher, same-category stories different ids", () => {
    const ceasefire = mapClusterToEvent(
      [article({ title: "US and Iran agree ceasefire ending Gulf tensions", publisher: "Reuters" })],
      "conflict"
    );
    const election = mapClusterToEvent(
      [article({ title: "Opposition contests national election results", publisher: "Reuters" })],
      "conflict"
    );
    expect(ceasefire.id).not.toBe(election.id);
  });

  it("picks the article with the longest description as primary", () => {
    const event = mapClusterToEvent(
      [
        article({ title: "Short version", description: "Brief.", publisher: "Wire A" }),
        article({ title: "Long version", description: "A much longer, more detailed account.", publisher: "Wire B" }),
      ],
      "conflict"
    );
    expect(event.title).toBe("Long version");
  });

  it("counts each distinct publisher once even if it appears twice in the cluster", () => {
    const event = mapClusterToEvent(
      [
        article({ title: "First filing", publisher: "Reuters" }),
        article({ title: "Updated filing", publisher: "reuters" }),
        article({ title: "Third outlet covers it", publisher: "AP" }),
      ],
      "conflict"
    );
    expect(event.sources).toHaveLength(2);
  });
});
