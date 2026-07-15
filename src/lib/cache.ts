import { Redis } from "@upstash/redis";

// Durable shared cache (Upstash Redis via the Vercel integration).
// Every server instance reads and writes the same store, unlike the
// in-memory Maps used before, which lived and died with one instance.
//
// The Vercel integration injects KV_-prefixed variables (the old
// Vercel KV naming), while Redis.fromEnv() expects UPSTASH_-prefixed
// ones — so the client is built explicitly from the KV_ pair.
//
// When the variables are missing (e.g. local development without the
// integration linked), everything degrades gracefully: reads miss,
// writes do nothing, and callers fall back to their in-memory caches.
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (error) {
    // A cache outage must never take the app down — treat it as a miss.
    console.error(`[cache] read failed for ${key}:`, error);
    return null;
  }
}

export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    // Cache writes are best-effort.
    console.error(`[cache] write failed for ${key}:`, error);
  }
}
