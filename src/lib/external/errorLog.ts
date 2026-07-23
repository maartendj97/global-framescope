import { redis } from "@/lib/cache";

// Capped recent-errors list for the observability dashboard's logs tab.
// Deliberately narrow: only real external-pipeline failures (GNews,
// Currents, NewsData, state feeds, Anthropic, article extraction) get
// logged here, not every console.error in the app — cache.ts's warnings
// in particular are known noisy false-positives (see the separately
// tracked cleanup task) and would drown out real signal if included.
const LOG_KEY = "error-log";
const MAX_ENTRIES = 200;
const MAX_MESSAGE_LENGTH = 500;

export type LoggedError = {
  timestamp: string;
  source: string;
  message: string;
};

export async function recordError(source: string, message: string): Promise<void> {
  if (!redis) return;
  const entry: LoggedError = {
    timestamp: new Date().toISOString(),
    source,
    message: message.length > MAX_MESSAGE_LENGTH ? message.slice(0, MAX_MESSAGE_LENGTH) : message,
  };
  try {
    await redis.lpush(LOG_KEY, entry);
    // Trim on every write rather than relying on a capped list type —
    // keeps the list bounded even if entries never expire on their own.
    await redis.ltrim(LOG_KEY, 0, MAX_ENTRIES - 1);
  } catch (error) {
    // Logging must never break the caller's real error handling.
    console.warn("[error-log] write failed:", error);
  }
}

export async function getRecentErrors(limit = MAX_ENTRIES): Promise<LoggedError[]> {
  if (!redis) return [];
  try {
    return await redis.lrange<LoggedError>(LOG_KEY, 0, Math.min(limit, MAX_ENTRIES) - 1);
  } catch (error) {
    console.warn("[error-log] read failed:", error);
    return [];
  }
}

// Formats an unknown catch-block value into a short, loggable string —
// mirrors what the existing console.error(..., error) calls already show,
// so the dashboard log line matches the Vercel log line.
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
