import { beforeEach, describe, expect, it, vi } from "vitest";

// event-sources/route.ts imports fetchCountryCoverage from
// country-sources/route.ts directly, which transitively pulls in all of
// these same modules — mocking them here covers both route files'
// module graphs for this test file.
const getCountriesMock = vi.fn();
const getEventByIdMock = vi.fn();

vi.mock("@/lib/data", () => ({
  getCountries: getCountriesMock,
  getCountryByCode: vi.fn(),
  getEventById: getEventByIdMock,
}));
vi.mock("@/lib/cache", () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn(),
  acquireLock: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/external/blockedPublishers", () => ({
  isSanctionedPublisher: vi.fn().mockReturnValue(false),
}));
vi.mock("@/lib/external/gnewsUsage", () => ({
  isOverDailyBudget: vi.fn().mockResolvedValue(false),
  recordGNewsCall: vi.fn().mockResolvedValue(1),
}));
vi.mock("@/lib/external/stateFeeds", () => ({
  fetchStateMediaCoverage: vi.fn().mockResolvedValue([]),
  STATE_MEDIA_COUNTRIES: new Set(),
}));
vi.mock("@/lib/external/newsdata", () => ({
  fetchNewsDataCountryCoverage: vi.fn().mockResolvedValue([]),
}));

const { GET } = await import("./route");

describe("GET /api/event-sources", () => {
  beforeEach(() => {
    getCountriesMock.mockReset().mockResolvedValue([]);
    getEventByIdMock.mockReset();
  });

  it("returns 400 when eventId is missing", async () => {
    const response = await GET(new Request("http://localhost/api/event-sources"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ articles: [] });
  });

  it("returns 404 when the event does not exist", async () => {
    getEventByIdMock.mockResolvedValue(undefined);

    const response = await GET(
      new Request("http://localhost/api/event-sources?eventId=missing")
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ articles: [] });
  });

  it("returns 200 with an articles array for a valid event with no available countries", async () => {
    getEventByIdMock.mockResolvedValue({
      id: "some-event",
      title: "Some Event",
      category: "trade",
      date: "2026-07-15",
      summary: "summary",
      context: "context",
      availableCountries: [],
    });

    const response = await GET(
      new Request("http://localhost/api/event-sources?eventId=some-event")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ articles: [] });
  });
});
