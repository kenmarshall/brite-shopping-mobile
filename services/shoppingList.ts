import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
    if (!id) {
      id = `${Platform.OS}-${generateUUID()}`;
      await AsyncStorage.setItem(PROFILE_KEY, id);
    }
    _profileId = id;
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
}

export type ShoppingList = ShoppingListItem[];

let _cache: ShoppingList | null = null;

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
  try {
    const key = await _listKey();
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    // List stays in memory cache even if persistence fails
  }
}

export async function getShoppingList(): Promise<ShoppingList> {
  return _load();
}

export async function addToList(
  item: Omit<ShoppingListItem, 'quantity' | 'addedAt'>,
): Promise<ShoppingList> {
  const list = await _load();
  const existing = list.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    list.push({ ...item, quantity: 1, addedAt: new Date().toISOString() });
  }
  const updated = [...list];
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
  const item = list.find((i) => i.productId === productId);
  if (item) {
    item.quantity = quantity;
  }
  const updated = [...list];
  await _save(updated);
  return updated;
}

export async function removeFromList(productId: string): Promise<ShoppingList> {
  const list = await _load();
  const filtered = list.filter((i) => i.productId !== productId);
  await _save(filtered);
  return filtered;
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
