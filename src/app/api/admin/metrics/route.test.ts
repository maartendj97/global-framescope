import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/external/gnewsUsage", () => ({ getGNewsCallCountToday: vi.fn().mockResolvedValue(10) }));
vi.mock("@/lib/external/newsdataUsage", () => ({
  getNewsDataCallCountToday: vi.fn().mockResolvedValue(20),
}));
vi.mock("@/lib/external/currentsUsage", () => ({
  getCurrentsCallCountToday: vi.fn().mockResolvedValue(7),
}));
vi.mock("@/lib/external/anthropicUsage", () => ({
  getSummaryCallCountToday: vi.fn().mockResolvedValue(30),
  getFramingCallCountToday: vi.fn().mockResolvedValue(5),
  dailySummaryCap: vi.fn().mockReturnValue(300),
  dailyFramingCap: vi.fn().mockReturnValue(50),
}));
vi.mock("@/lib/external/visitUsage", () => ({
  getVisitCountToday: vi.fn().mockResolvedValue(100),
  getUniqueVisitCountToday: vi.fn().mockResolvedValue(40),
}));

function request(token?: string): Request {
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  return new Request("https://example.com/api/admin/metrics", { headers });
}

describe("GET /api/admin/metrics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 when METRICS_API_TOKEN is not configured", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "");
    const { GET } = await import("./route");

    const response = await GET(request("anything"));

    expect(response.status).toBe(404);
  });

  it("returns 401 when no bearer token is provided", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    const { GET } = await import("./route");

    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns 401 when the bearer token doesn't match", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    const { GET } = await import("./route");

    const response = await GET(request("wrong-token"));

    expect(response.status).toBe(401);
  });

  it("returns every counter when the bearer token matches", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    const { GET } = await import("./route");

    const response = await GET(request("secret-token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      visits: { total: 100, unique: 40 },
      gnews: { count: 10, cap: 85 },
      newsdata: { count: 20, cap: 150 },
      currents: { count: 7, cap: 900 },
      anthropic: {
        summaries: { count: 30, cap: 300 },
        framing: { count: 5, cap: 50 },
      },
    });
  });
});
