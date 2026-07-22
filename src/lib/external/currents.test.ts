import { describe, expect, it } from "vitest";
import { mapArticleToEvent } from "./currents";

function article(overrides: {
  title: string;
  description?: string;
  url?: string;
  author?: string;
  image?: string;
  published?: string;
}) {
  return {
    title: overrides.title,
    description: overrides.description ?? "",
    url: overrides.url ?? `https://example.com/${overrides.title}`,
    author: overrides.author ?? "Wire Service",
    image: overrides.image ?? "None",
    published: overrides.published ?? "2026-07-20T08:00:00Z",
  };
}

describe("mapArticleToEvent", () => {
  // Regression for the silent-collision bug: id used to be just
  // category-publisher-date, so two unrelated same-day stories sharing a
  // publisher (or both defaulting to "Unknown source") collided and the
  // second was dropped by fetchCurrentsEvents' seenIds check.
  it("gives distinct same-day, same-publisher, same-category stories different ids", () => {
    const ceasefire = mapArticleToEvent(
      article({ title: "US and Iran agree ceasefire ending Gulf tensions", author: "Wire Service" }),
      "conflict"
    );
    const election = mapArticleToEvent(
      article({ title: "Opposition contests national election results", author: "Wire Service" }),
      "conflict"
    );
    expect(ceasefire.id).not.toBe(election.id);
  });

  it("falls back to 'Unknown source' when the author field is empty", () => {
    const event = mapArticleToEvent(article({ title: "Talks resume", author: "" }), "diplomacy");
    expect(event.context).toContain("Unknown source");
  });

  it("treats Currents' literal string 'None' as no image", () => {
    const event = mapArticleToEvent(article({ title: "Talks resume", image: "None" }), "diplomacy");
    expect(event.imageUrl).toBeUndefined();
  });

  it("keeps a real image URL", () => {
    const event = mapArticleToEvent(
      article({ title: "Talks resume", image: "https://example.com/photo.jpg" }),
      "diplomacy"
    );
    expect(event.imageUrl).toBe("https://example.com/photo.jpg");
  });

  it("slices the published timestamp down to a plain date", () => {
    const event = mapArticleToEvent(
      article({ title: "Talks resume", published: "2026-07-20T08:00:00Z" }),
      "diplomacy"
    );
    expect(event.date).toBe("2026-07-20");
  });
});
