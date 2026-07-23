import { afterEach, describe, expect, it, vi } from "vitest";

const getRecentErrors = vi.fn();

vi.mock("@/lib/external/errorLog", () => ({ getRecentErrors }));

function request(url: string, token?: string): Request {
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  return new Request(url, { headers });
}

describe("GET /api/admin/logs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getRecentErrors.mockReset();
  });

  it("returns 404 when METRICS_API_TOKEN is not configured", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "");
    const { GET } = await import("./route");

    const response = await GET(request("https://example.com/api/admin/logs", "anything"));

    expect(response.status).toBe(404);
  });

  it("returns 401 when the bearer token doesn't match", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    const { GET } = await import("./route");

    const response = await GET(request("https://example.com/api/admin/logs", "wrong-token"));

    expect(response.status).toBe(401);
  });

  it("returns entries from getRecentErrors, defaulting to a limit of 50", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    const entries = [{ timestamp: "2026-07-23T00:00:00.000Z", source: "gnews", message: "boom" }];
    getRecentErrors.mockResolvedValue(entries);
    const { GET } = await import("./route");

    const response = await GET(request("https://example.com/api/admin/logs", "secret-token"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ entries });
    expect(getRecentErrors).toHaveBeenCalledWith(50);
  });

  it("clamps the requested limit to 200", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    getRecentErrors.mockResolvedValue([]);
    const { GET } = await import("./route");

    await GET(request("https://example.com/api/admin/logs?limit=9000", "secret-token"));

    expect(getRecentErrors).toHaveBeenCalledWith(200);
  });
});
