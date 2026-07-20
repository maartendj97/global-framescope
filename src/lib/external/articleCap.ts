// Shared by every per-country coverage source (GNews, NewsData.io, state
// feeds) so a country's source list can't be dominated by one outlet —
// without this, all 5 shown articles could come from the same publisher,
// which skews the "how this country's press frames it" read.
export const MAX_PER_PUBLISHER = 2;

export function capPerPublisher<T>(
  items: T[],
  getPublisher: (item: T) => string,
  options: { maxPerPublisher: number; maxTotal: number }
): T[] {
  const counts = new Map<string, number>();
  const result: T[] = [];
  for (const item of items) {
    if (result.length >= options.maxTotal) break;
    const key = getPublisher(item).toLowerCase();
    const count = counts.get(key) ?? 0;
    if (count >= options.maxPerPublisher) continue;
    counts.set(key, count + 1);
    result.push(item);
  }
  return result;
}
