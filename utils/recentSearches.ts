export const MAX_RECENT_SEARCHES = 5;

/** Puts a query at the front of the recent list: trimmed, de-duplicated ignoring case, capped. */
export function addRecentSearch(recent: string[], query: string, max = MAX_RECENT_SEARCHES): string[] {
  const q = query.trim();
  if (!q) return recent;
  const key = q.toLowerCase();
  return [q, ...recent.filter((r) => r.toLowerCase() !== key)].slice(0, max);
}
