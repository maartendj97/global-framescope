import { beforeEach, describe, expect, it, vi } from "vitest";

// Validation/status-code behavior of the GET handler is the risky,
// previously-untested surface here — the pure matchesFallbackTier logic
// already has its own coverage in route.test.ts. External dependencies
// are mocked so these tests never touch the network or Redis.
const getCountriesMock = vi.fn();
const getCountryByCodeMock = vi.fn();
const getEventByIdMock = vi.fn();

vi.mock("@/lib/data", () => ({
  getCountries: getCountriesMock,
  getCountryByCode: getCountryByCodeMock,
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

const { GET } = await import("./route");

const netherlands = { code: "NL" as const, name: "Netherlands", flagEmoji: "🇳🇱" };

describe("GET /api/country-sources", () => {
  beforeEach(() => {
    getCountriesMock.mockReset().mockResolvedValue([netherlands]);
    getCountryByCodeMock.mockReset();
    getEventByIdMock.mockReset();
  });

  it("returns 400 when eventId is missing", async () => {
    const response = await GET(new Request("http://localhost/api/country-sources?country=NL"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ articles: [] });
  });

  it("returns 400 when country is missing", async () => {
    const response = await GET(
      new Request("http://localhost/api/country-sources?eventId=some-event")
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when country is not a recognized code", async () => {
    const response = await GET(
      new Request("http://localhost/api/country-sources?eventId=some-event&country=ZZ")
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 when the event does not exist", async () => {
    getEventByIdMock.mockResolvedValue(undefined);

    const response = await GET(
      new Request("http://localhost/api/country-sources?eventId=missing&country=NL")
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ articles: [] });
  });

  it("returns 200 with articles and tier for a valid request", async () => {
    getEventByIdMock.mockResolvedValue({
      id: "some-event",
      title: "Some Event",
      category: "trade",
      date: "2026-07-15",
      summary: "summary",
      context: "context",
      availableCountries: ["NL"],
    });

    const response = await GET(
      new Request("http://localhost/api/country-sources?eventId=some-event&country=NL")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("articles");
    expect(body).toHaveProperty("tier");
  });
});
