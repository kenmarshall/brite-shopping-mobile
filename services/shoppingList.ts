import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { registerDevice, syncShoppingList } from './api';

const PROFILE_KEY = 'brite_profile_id';
const STORAGE_KEY = 'brite_shopping_list';

// ---------------------------------------------------------------------------
// Anonymous profile — a random UUID stored locally, no user data collected.
// Each device gets its own profile. Clearing app data resets it.
// ---------------------------------------------------------------------------

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let _profileId: string | null = null;

export async function getProfileId(): Promise<string> {
  if (_profileId) return _profileId;
  try {
    let id = await AsyncStorage.getItem(PROFILE_KEY);
    const isNew = !id;
    if (!id) {
      id = `${Platform.OS}-${generateUUID()}`;
      await AsyncStorage.setItem(PROFILE_KEY, id);
    }
    _profileId = id;
    // Register with server on first creation (best-effort)
    if (isNew) {
      registerDevice(id, Platform.OS).catch(() => {});
    }
    return id;
  } catch {
    _profileId = `temp-${generateUUID()}`;
    return _profileId;
  }
}

// ---------------------------------------------------------------------------
// Shopping list — stored per-profile in AsyncStorage
// ---------------------------------------------------------------------------

export interface ShoppingListItem {
  productId: string;
  name: string;
  estimatedPrice: number | null;
  imageUrl: string | null;
  quantity: number;
  addedAt: string;
  /** Ticked off while shopping ("in cart"). */
  checked?: boolean;
}

export type ShoppingList = ShoppingListItem[];

let _cache: ShoppingList | null = null;

type Listener = (list: ShoppingList) => void;
const _listeners = new Set<Listener>();

/** Called with the new list after every change. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

async function _listKey(): Promise<string> {
  const profileId = await getProfileId();
  return `${STORAGE_KEY}_${profileId}`;
}

async function _load(): Promise<ShoppingList> {
  if (_cache) return _cache;
  try {
    const key = await _listKey();
    const raw = await AsyncStorage.getItem(key);
    _cache = raw ? JSON.parse(raw) : [];
  } catch {
    _cache = [];
  }
  return _cache!;
}

async function _save(list: ShoppingList): Promise<void> {
  _cache = list;
  _listeners.forEach((listener) => listener(list));
  try {
    const key = await _listKey();
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    // List stays in memory cache even if persistence fails
  }
  // Best-effort server sync — fire and forget, never block the UI
  _syncToServer(list);
}

let _syncTimer: ReturnType<typeof setTimeout> | null = null;

function _syncToServer(list: ShoppingList): void {
  // Debounce syncs to avoid flooding the API
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    try {
      const deviceId = await getProfileId();
      await syncShoppingList(deviceId, list);
    } catch {
      // Server sync is best-effort — local list is the source of truth
    }
  }, 2000);
}

export async function getShoppingList(): Promise<ShoppingList> {
  return _load();
}

export async function addToList(
  item: Omit<ShoppingListItem, 'quantity' | 'addedAt'>,
): Promise<ShoppingList> {
  const list = await _load();
  // Never mutate the cached list: Undo restores earlier snapshots of it.
  const exists = list.some((i) => i.productId === item.productId);
  const updated = exists
    ? list.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i))
    : [...list, { ...item, quantity: 1, addedAt: new Date().toISOString() }];
  await _save(updated);
  return updated;
}

export async function updateQuantity(
  productId: string,
  quantity: number,
): Promise<ShoppingList> {
  const list = await _load();
  if (quantity <= 0) {
    const filtered = list.filter((i) => i.productId !== productId);
    await _save(filtered);
    return filtered;
  }
  const updated = list.map((i) => (i.productId === productId ? { ...i, quantity } : i));
  await _save(updated);
  return updated;
}

export async function removeFromList(productId: string): Promise<ShoppingList> {
  const list = await _load();
  const filtered = list.filter((i) => i.productId !== productId);
  await _save(filtered);
  return filtered;
}

export async function setChecked(productId: string, checked: boolean): Promise<ShoppingList> {
  const list = await _load();
  const updated = list.map((i) => (i.productId === productId ? { ...i, checked } : i));
  await _save(updated);
  return updated;
}

/** Removes every ticked-off item. */
export async function clearChecked(): Promise<ShoppingList> {
  const list = await _load();
  const updated = list.filter((i) => !i.checked);
  await _save(updated);
  return updated;
}

/** Puts back a previous list, for Undo. */
export async function restoreList(list: ShoppingList): Promise<ShoppingList> {
  const restored = [...list];
  await _save(restored);
  return restored;
}

export async function clearList(): Promise<ShoppingList> {
  await _save([]);
  return [];
}

export function calculateTotal(list: ShoppingList): number {
  return list.reduce((sum, item) => {
    return sum + (item.estimatedPrice ?? 0) * item.quantity;
  }, 0);
}

export async function isInList(productId: string): Promise<boolean> {
  const list = await _load();
  return list.some((i) => i.productId === productId);
}
