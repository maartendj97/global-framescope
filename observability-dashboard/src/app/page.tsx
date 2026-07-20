import { isAuthenticated } from "@/lib/session";
import { fetchMetrics } from "@/lib/metrics";
import { LoginForm } from "./login/LoginForm";
import { logoutAction } from "./login/actions";

function barClass(count: number, cap: number): string {
  const ratio = cap > 0 ? count / cap : 0;
  if (ratio >= 1) return "bar-fill danger";
  if (ratio >= 0.85) return "bar-fill warn";
  return "bar-fill";
}

function CapTile({ label, count, cap }: { label: string; count: number; cap: number }) {
  const percent = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
  return (
    <div className="tile">
      <p className="tile-label">{label}</p>
      <p className="tile-value">{count}</p>
      <p className="tile-cap">of {cap}/day</p>
      <div className="bar-track">
        <div className={barClass(count, cap)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default async function Home() {
  const authed = await isAuthenticated();
  if (!authed) {
    return (
      <main>
        <h1>FrameScope Observability</h1>
        <LoginForm />
      </main>
    );
  }

  const result = await fetchMetrics();

  return (
    <main>
      <h1>FrameScope Observability</h1>
      <p className="subtitle">Today&apos;s traffic and API budget usage</p>

      {!result.ok ? (
        <div className="error-box">
          {result.reason === "not-configured"
            ? "METRICS_API_URL or METRICS_API_TOKEN isn't set on this deployment."
            : "Couldn't reach the main app's metrics endpoint — it may be down or the token may not match."}
        </div>
      ) : (
        <div className="tiles">
          <div className="tile">
            <p className="tile-label">Visits today</p>
            <p className="tile-value">{result.metrics.visits.total}</p>
          </div>
          <div className="tile">
            <p className="tile-label">Unique visitors</p>
            <p className="tile-value">{result.metrics.visits.unique}</p>
          </div>
          <CapTile label="GNews calls" count={result.metrics.gnews.count} cap={result.metrics.gnews.cap} />
          <CapTile
            label="NewsData calls"
            count={result.metrics.newsdata.count}
            cap={result.metrics.newsdata.cap}
          />
          <CapTile
            label="AI summaries (Haiku)"
            count={result.metrics.anthropic.summaries.count}
            cap={result.metrics.anthropic.summaries.cap}
          />
          <CapTile
            label="AI framing (Sonnet)"
            count={result.metrics.anthropic.framing.count}
            cap={result.metrics.anthropic.framing.cap}
          />
        </div>
      )}

      <div className="footer">
        <span>Resets daily at midnight UTC</span>
        <form action={logoutAction}>
          <button type="submit">Log out</button>
        </form>
      </div>
    </main>
  );
}
