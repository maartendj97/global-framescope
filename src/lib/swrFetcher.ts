export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

// Both endpoints this hits are already cached server-side for 20min-24h
// (see src/lib/cache.ts), so re-validating on every window focus/
// reconnect just adds a redundant round trip for data that's already
// fresh from the client's point of view.
export const SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};
