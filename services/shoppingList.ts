import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'brite_shopping_list';

export interface ShoppingListItem {
  productId: string;
  name: string;
  brand: string | null;
  estimatedPrice: number | null;
  imageUrl: string | null;
  quantity: number;
  addedAt: string;
}

export type ShoppingList = ShoppingListItem[];

let _cache: ShoppingList | null = null;

async function _load(): Promise<ShoppingList> {
  if (_cache) return _cache;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  _cache = raw ? JSON.parse(raw) : [];
  return _cache!;
}

async function _save(list: ShoppingList): Promise<void> {
  _cache = list;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function getShoppingList(): Promise<ShoppingList> {
  return _load();
}

export async function addToList(item: Omit<ShoppingListItem, 'quantity' | 'addedAt'>): Promise<ShoppingList> {
  const list = await _load();
  const existing = list.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    list.push({ ...item, quantity: 1, addedAt: new Date().toISOString() });
  }
  await _save(list);
  return list;
}

export async function updateQuantity(productId: string, quantity: number): Promise<ShoppingList> {
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
  await _save(list);
  return list;
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
