export type Metrics = {
  visits: { total: number; unique: number };
  gnews: { count: number; cap: number };
  newsdata: { count: number; cap: number };
  anthropic: {
    summaries: { count: number; cap: number };
    framing: { count: number; cap: number };
  };
};

export type MetricsResult =
  | { ok: true; metrics: Metrics }
  | { ok: false; reason: "not-configured" | "unreachable" };

// Always fetched fresh — this dashboard exists to show current numbers,
// and a handful of requests a minute doesn't warrant caching.
export async function fetchMetrics(): Promise<MetricsResult> {
  const url = process.env.METRICS_API_URL;
  const token = process.env.METRICS_API_TOKEN;
  if (!url || !token) return { ok: false, reason: "not-configured" };

  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, reason: "unreachable" };
    const metrics = (await response.json()) as Metrics;
    return { ok: true, metrics };
  } catch (error) {
    console.error("[dashboard] metrics fetch failed:", error);
    return { ok: false, reason: "unreachable" };
  }
}
