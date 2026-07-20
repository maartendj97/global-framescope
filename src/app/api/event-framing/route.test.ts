import { describe, expect, it, vi } from "vitest";
import type { Country, CountryCode, CountrySourceArticle, Event } from "@/types";
import type { ArticleWithTier } from "./route";

const event: Event = {
  id: "evt-1",
  title: "US Forces Disable Oil Tanker Near Kharg Island",
  category: "conflict",
  date: "2026-07-16",
  summary: "A tanker heading to Iran was disabled by US missiles.",
  context: "",
  availableCountries: ["US", "IR", "NL"],
};

const iran: Country = { code: "IR", name: "Iran", flagEmoji: "🇮🇷" };
const us: Country = { code: "US", name: "United States", flagEmoji: "🇺🇸" };
const nl: Country = { code: "NL", name: "Netherlands", flagEmoji: "🇳🇱" };

function article(title: string, overrides: Partial<CountrySourceArticle> = {}): CountrySourceArticle {
  return {
    title,
    url: `https://example.com/${title}`,
    publisher: "Press TV",
    publishedAt: "2026-07-16",
    ...overrides,
  };
}

describe("buildEventFramingContent", () => {
  it("assigns full-text tier when extraction succeeds", async () => {
    vi.resetModules();
    vi.doMock("@/lib/external/articleExtractor", () => ({
      extractManyWithBudget: vi.fn().mockResolvedValue(
        new Map([["https://example.com/A", "The full retrieved article body text."]])
      ),
    }));
    const { buildEventFramingContent } = await import("./route");

    const result = await buildEventFramingContent([{ country: iran, articles: [article("A")] }]);

    expect(result.get("IR")?.[0]).toMatchObject({
      tier: "full-text",
      text: "The full retrieved article body text.",
    });
  });

  it("falls back to description tier when extraction fails but a description exists", async () => {
    vi.resetModules();
    vi.doMock("@/lib/external/articleExtractor", () => ({
      extractManyWithBudget: vi.fn().mockResolvedValue(new Map()),
    }));
    const { buildEventFramingContent } = await import("./route");

    const result = await buildEventFramingContent([
      { country: iran, articles: [article("A", { description: "A short snippet." })] },
    ]);

    expect(result.get("IR")?.[0]).toMatchObject({ tier: "description", text: "A short snippet." });
  });

  it("falls back to headline-only tier when neither extraction nor description is available", async () => {
    vi.resetModules();
    vi.doMock("@/lib/external/articleExtractor", () => ({
      extractManyWithBudget: vi.fn().mockResolvedValue(new Map()),
    }));
    const { buildEventFramingContent } = await import("./route");

    const result = await buildEventFramingContent([{ country: iran, articles: [article("A")] }]);

    expect(result.get("IR")?.[0]).toMatchObject({ tier: "headline-only", text: "" });
  });

  it("truncates long body text so worst-case prompt size stays predictable", async () => {
    vi.resetModules();
    const longText = "x".repeat(5000);
    vi.doMock("@/lib/external/articleExtractor", () => ({
      extractManyWithBudget: vi.fn().mockResolvedValue(new Map([["https://example.com/A", longText]])),
    }));
    const { buildEventFramingContent } = await import("./route");

    const result = await buildEventFramingContent([{ country: iran, articles: [article("A")] }]);

    expect(result.get("IR")?.[0].text.length).toBe(1500);
  });
});

describe("buildEventFramingPrompt", () => {
  async function loadPromptBuilder() {
    vi.resetModules();
    vi.doMock("@/lib/external/articleExtractor", () => ({ extractManyWithBudget: vi.fn() }));
    return (await import("./route")).buildEventFramingPrompt;
  }

  it("instructs the model not to invent details", async () => {
    const buildEventFramingPrompt = await loadPromptBuilder();
    const content = new Map<CountryCode, ArticleWithTier[]>([
      ["IR", [{ article: article("A"), text: "body", tier: "full-text" }]],
    ]);

    const prompt = buildEventFramingPrompt(event, [iran], content);

    expect(prompt.toLowerCase()).toContain("do not invent");
  });

  it("instructs the model to always respond in English regardless of source language", async () => {
    const buildEventFramingPrompt = await loadPromptBuilder();
    const content = new Map<CountryCode, ArticleWithTier[]>([
      ["IR", [{ article: article("A"), text: "body", tier: "full-text" }]],
    ]);

    const prompt = buildEventFramingPrompt(event, [iran], content);

    expect(prompt.toLowerCase()).toContain("always write your response in english");
  });

  it("tells the model to scale confidence to the content tier, and labels each article's tier", async () => {
    const buildEventFramingPrompt = await loadPromptBuilder();
    const content = new Map<CountryCode, ArticleWithTier[]>([
      ["IR", [{ article: article("A"), text: "full body", tier: "full-text" }]],
      ["US", [{ article: article("B"), text: "", tier: "headline-only" }]],
    ]);

    const prompt = buildEventFramingPrompt(event, [iran, us], content);

    expect(prompt).toContain("[full-text]: full body");
    expect(prompt).toContain("[headline-only]");
    expect(prompt.toLowerCase()).toContain("more conservatively");
  });

  it("omits a country with zero coverage from the prompt entirely, and instructs against guessing", async () => {
    const buildEventFramingPrompt = await loadPromptBuilder();
    const content = new Map<CountryCode, ArticleWithTier[]>([
      ["IR", [{ article: article("A"), text: "body", tier: "full-text" }]],
    ]);
    // NL has no entry in `content` at all — zero coverage.

    const prompt = buildEventFramingPrompt(event, [iran, nl], content);

    expect(prompt).not.toContain("Netherlands:");
    expect(prompt.toLowerCase()).toContain("do not guess");
  });
});

describe("GET /api/event-framing", () => {
  async function mockRouteDeps(overrides: {
    getEventById?: ReturnType<typeof vi.fn>;
    getCountries?: ReturnType<typeof vi.fn>;
    getCached?: ReturnType<typeof vi.fn>;
    setCached?: ReturnType<typeof vi.fn>;
    acquireLock?: ReturnType<typeof vi.fn>;
    isOverDailyFramingCap?: ReturnType<typeof vi.fn>;
    recordFramingGeneration?: ReturnType<typeof vi.fn>;
    fetchCountryCoverage?: ReturnType<typeof vi.fn>;
    anthropicCreate?: ReturnType<typeof vi.fn>;
  }) {
    vi.resetModules();
    vi.doMock("@/lib/data", () => ({
      getEventById: overrides.getEventById ?? vi.fn().mockResolvedValue(event),
      getCountries: overrides.getCountries ?? vi.fn().mockResolvedValue([iran, us, nl]),
    }));
    vi.doMock("@/lib/cache", () => ({
      getCached: overrides.getCached ?? vi.fn().mockResolvedValue(null),
      setCached: overrides.setCached ?? vi.fn(),
      acquireLock: overrides.acquireLock ?? vi.fn().mockResolvedValue(true),
    }));
    vi.doMock("@/lib/external/anthropicUsage", () => ({
      isOverDailyFramingCap: overrides.isOverDailyFramingCap ?? vi.fn().mockResolvedValue(false),
      recordFramingGeneration: overrides.recordFramingGeneration ?? vi.fn().mockResolvedValue(1),
    }));
    vi.doMock("@/app/api/country-sources/route", () => ({
      fetchCountryCoverage:
        overrides.fetchCountryCoverage ?? vi.fn().mockResolvedValue({ articles: [], tier: "from-country" }),
    }));
    vi.doMock("@/app/api/event-sources/route", () => ({
      createThrottle: () => async () => {},
    }));
    vi.doMock("@/lib/external/articleExtractor", () => ({
      extractManyWithBudget: vi.fn().mockResolvedValue(new Map()),
    }));
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = { create: overrides.anthropicCreate ?? vi.fn() };
      },
    }));
    return import("./route");
  }

  it("returns 400 when eventId is missing", async () => {
    const { GET } = await mockRouteDeps({});

    const response = await GET(new Request("http://localhost/api/event-framing"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ framings: [], differences: [], notCoveredBy: [] });
  });

  it("returns 404 when the event does not exist", async () => {
    const { GET } = await mockRouteDeps({ getEventById: vi.fn().mockResolvedValue(undefined) });

    const response = await GET(new Request("http://localhost/api/event-framing?eventId=missing"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ framings: [], differences: [], notCoveredBy: [] });
  });

  it("returns the cached result without calling the cap check or Anthropic", async () => {
    const cached = { framings: [], differences: [{ eventId: "evt-1", title: "T", description: "D", countryCodes: ["IR"] }] };
    const isOverDailyFramingCap = vi.fn();
    const anthropicCreate = vi.fn();
    const { GET } = await mockRouteDeps({
      getCached: vi.fn().mockResolvedValue(cached),
      isOverDailyFramingCap,
      anthropicCreate,
    });

    const response = await GET(new Request("http://localhost/api/event-framing?eventId=evt-1"));

    expect(await response.json()).toEqual(cached);
    expect(isOverDailyFramingCap).not.toHaveBeenCalled();
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it("degrades to an empty result without calling Anthropic when ANTHROPIC_API_KEY is unset", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const anthropicCreate = vi.fn();
    const { GET } = await mockRouteDeps({ anthropicCreate });

    const response = await GET(new Request("http://localhost/api/event-framing?eventId=evt-1"));

    expect(await response.json()).toEqual({ framings: [], differences: [], notCoveredBy: [] });
    expect(anthropicCreate).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("degrades to an empty result without calling Anthropic once the daily framing cap is reached", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const anthropicCreate = vi.fn();
    const { GET } = await mockRouteDeps({
      isOverDailyFramingCap: vi.fn().mockResolvedValue(true),
      anthropicCreate,
    });

    const response = await GET(new Request("http://localhost/api/event-framing?eventId=evt-1"));

    expect(await response.json()).toEqual({ framings: [], differences: [], notCoveredBy: [] });
    expect(anthropicCreate).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("returns an empty result without calling Anthropic when no country has any coverage, listing every country as not covered", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const anthropicCreate = vi.fn();
    const { GET } = await mockRouteDeps({
      fetchCountryCoverage: vi.fn().mockResolvedValue({ articles: [], tier: "from-country" }),
      anthropicCreate,
    });

    const response = await GET(new Request("http://localhost/api/event-framing?eventId=evt-1"));

    expect(await response.json()).toEqual({
      framings: [],
      differences: [],
      notCoveredBy: ["IR", "US", "NL"],
    });
    expect(anthropicCreate).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("returns pending: true and polls the cache when the generation lock is held by another instance", async () => {
    vi.useFakeTimers();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const getCached = vi.fn().mockResolvedValue(null);
    const { GET } = await mockRouteDeps({
      fetchCountryCoverage: vi.fn().mockResolvedValue({ articles: [article("A")], tier: "from-country" }),
      acquireLock: vi.fn().mockResolvedValue(false),
      getCached,
    });

    const responsePromise = GET(new Request("http://localhost/api/event-framing?eventId=evt-1"));
    // waitForCachedFraming polls up to 8 times, 1s apart — fast-forward
    // through the real delay instead of the test taking 8+ wall-clock seconds.
    await vi.advanceTimersByTimeAsync(8000);
    const body = await (await responsePromise).json();

    expect(body.pending).toBe(true);
    expect(body.framings).toEqual([]);
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("generates, caches, and returns a result on a cache miss with the lock held", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const setCached = vi.fn();
    const anthropicCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            framings: [
              {
                countryCode: "IR",
                mainFrame: "Frame",
                toneCategory: "critical",
                keyEmphasis: ["a"],
                mainNarrative: "Narrative",
                contentTier: "headline-only",
              },
            ],
            differences: [],
          }),
        },
      ],
    });
    const { GET } = await mockRouteDeps({
      fetchCountryCoverage: vi.fn().mockResolvedValue({ articles: [article("A")], tier: "from-country" }),
      setCached,
      anthropicCreate,
    });

    const response = await GET(new Request("http://localhost/api/event-framing?eventId=evt-1"));
    const body = await response.json();

    expect(body.framings[0]).toMatchObject({ eventId: "evt-1", countryCode: "IR" });
    expect(setCached).toHaveBeenCalledWith(
      "event-framing:v1:evt-1",
      expect.objectContaining({ framings: expect.any(Array) }),
      24 * 60 * 60
    );
    vi.unstubAllEnvs();
  });

  it("includes notCoveredBy for countries with zero articles alongside a successful generation", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const anthropicCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            framings: [
              {
                countryCode: "IR",
                mainFrame: "Frame",
                toneCategory: "critical",
                keyEmphasis: ["a"],
                mainNarrative: "Narrative",
                contentTier: "headline-only",
              },
            ],
            differences: [],
          }),
        },
      ],
    });
    const { GET } = await mockRouteDeps({
      // Only Iran has coverage; US and NL come back empty.
      fetchCountryCoverage: vi.fn().mockImplementation((_event, countryCode) =>
        Promise.resolve({
          articles: countryCode === "IR" ? [article("A")] : [],
          tier: "from-country",
        })
      ),
      anthropicCreate,
    });

    const response = await GET(new Request("http://localhost/api/event-framing?eventId=evt-1"));
    const body = await response.json();

    expect(body.notCoveredBy).toEqual(["US", "NL"]);
    vi.unstubAllEnvs();
  });

  it("degrades to an empty result (never throws) when the Anthropic call fails", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const { GET } = await mockRouteDeps({
      fetchCountryCoverage: vi.fn().mockResolvedValue({ articles: [article("A")], tier: "from-country" }),
      anthropicCreate: vi.fn().mockRejectedValue(new Error("api down")),
    });

    const response = await GET(new Request("http://localhost/api/event-framing?eventId=evt-1"));

    expect(await response.json()).toEqual({ framings: [], differences: [], notCoveredBy: [] });
    vi.unstubAllEnvs();
  });
});
