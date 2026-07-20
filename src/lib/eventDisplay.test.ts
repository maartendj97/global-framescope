import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_CATEGORIES } from "@/types";
import type { Event } from "@/types";
import {
  CATEGORY_IMAGES,
  CATEGORY_LABELS,
  formatEventDate,
  formatRelativeOrDate,
  getEventSourceCount,
} from "./eventDisplay";
import { CATEGORY_QUERIES } from "./external/gnews";

function baseEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "conflict-reuters-2026-07-20",
    title: "Ceasefire agreed",
    category: "conflict",
    date: "2026-07-20",
    summary: "Summary",
    context: "Context",
    availableCountries: [],
    ...overrides,
  };
}

describe("formatEventDate", () => {
  it("formats an ISO date as a full day/month/year string", () => {
    expect(formatEventDate("2026-03-05")).toBe("5 March 2026");
  });
});

describe("formatRelativeOrDate", () => {
  const now = new Date("2026-03-10T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Today' for the current day", () => {
    expect(formatRelativeOrDate(now.toISOString())).toBe("Today");
  });

  it("returns 'Yesterday' for one day ago", () => {
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    expect(formatRelativeOrDate(yesterday.toISOString())).toBe("Yesterday");
  });

  it("returns 'N days ago' for 2-6 days ago", () => {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeOrDate(threeDaysAgo.toISOString())).toBe("3 days ago");
  });

  it("falls back to the full date at 7+ days ago", () => {
    const isoDate = "2026-02-01";
    expect(formatRelativeOrDate(isoDate)).toBe(formatEventDate(isoDate));
  });
});

describe("category mapping completeness", () => {
  it("has a label for every category", () => {
    for (const category of ALL_CATEGORIES) {
      expect(CATEGORY_LABELS[category], `missing CATEGORY_LABELS entry for "${category}"`).toBeTruthy();
    }
  });

  it("has an illustration for every category", () => {
    for (const category of ALL_CATEGORIES) {
      expect(CATEGORY_IMAGES[category], `missing CATEGORY_IMAGES entry for "${category}"`).toBeTruthy();
    }
  });

  it("has a GNews query for every category", () => {
    for (const category of ALL_CATEGORIES) {
      expect(CATEGORY_QUERIES[category], `missing CATEGORY_QUERIES entry for "${category}"`).toBeTruthy();
    }
  });
});

describe("getEventSourceCount", () => {
  it("uses the event's own clustered sources when present", () => {
    const event = baseEvent({
      sources: [
        { publisher: "Reuters", url: "https://reuters.example/a" },
        { publisher: "AP", url: "https://ap.example/b" },
      ],
    });
    expect(getEventSourceCount(event, new Map([[event.id, 99]]))).toBe(2);
  });

  it("falls back to the mock source-count map when the event has no sources field", () => {
    const event = baseEvent();
    expect(getEventSourceCount(event, new Map([[event.id, 3]]))).toBe(3);
  });

  it("returns 0 when neither the event nor the map has a count", () => {
    const event = baseEvent();
    expect(getEventSourceCount(event, new Map())).toBe(0);
  });
});
