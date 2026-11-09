import AsyncStorage from '@react-native-async-storage/async-storage';

import { addRecentSearch } from '@/utils/recentSearches';

const STORAGE_KEY = 'brite_recent_searches';

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string') : [];
  } catch {
    return [];
  }
}

/** Records a search and returns the updated list (unchanged if storage fails). */
export async function saveRecentSearch(recent: string[], query: string): Promise<string[]> {
  const next = addRecentSearch(recent, query);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Recent searches are a convenience; keep the in-memory list.
  }
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the screen already shows the list as cleared.
  }
}
