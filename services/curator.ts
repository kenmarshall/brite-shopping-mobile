import { API_BASE_URL, API_KEY, type Product } from '@/services/api';
import type { SuggestionKind } from '@/utils/suggestions';

// Curator tools ship only in dev builds: the key lives in .env.local and is
// never added to the EAS production environment, so production builds hide them.
const CURATOR_KEY = process.env.EXPO_PUBLIC_CURATOR_KEY ?? '';

export const IS_CURATOR = CURATOR_KEY.length > 0;

export type StoreType =
  | 'stall'
  | 'minimart'
  | 'market'
  | 'supermarket'
  | 'wholesale'
  | 'pharmacy'
  | 'meat & grocery';

export type PriceUnit = 'each' | 'kg' | 'lb';

export interface CuratorStore {
  store_id: string;
  store_name: string;
  chain_id: string | null;
  type: string | null;
  area: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  distance_km?: number;
  /** Basket items without a fresh price at this store. */
  basket_needed?: number;
}

export type BasketStatus = 'needed' | 'outdated' | 'done';

export interface BasketItem {
  slot: string;
  label: string;
  status: BasketStatus;
  product: Pick<Product, '_id' | 'name' | 'size' | 'image_url' | 'sold_by'> | null;
  price: { amount: number; price_unit: 'kg' | 'lb' | null; seen_at: string } | null;
}

export interface BasketGroup {
  group: string;
  items: BasketItem[];
}

export interface StoreBasket {
  store_id: string;
  store_name: string;
  summary: Record<BasketStatus | 'total', number>;
  groups: BasketGroup[];
}

export interface CreatedProduct {
  product_id: string;
  name: string;
}

async function curatorRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      'X-Curator-Key': CURATOR_KEY,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function listCuratorStores(params: {
  lat?: number;
  lng?: number;
  q?: string;
}): Promise<CuratorStore[]> {
  const search = new URLSearchParams({ limit: '60' });
  if (params.lat != null && params.lng != null) {
    search.set('lat', String(params.lat));
    search.set('lng', String(params.lng));
  }
  if (params.q?.trim()) search.set('q', params.q.trim());
  const res = await curatorRequest<{ stores: CuratorStore[] }>(`/curator/stores?${search.toString()}`);
  return res.stores;
}

export async function createCuratorStore(store: {
  store_name: string;
  type: StoreType;
  latitude: number;
  longitude: number;
  area?: string;
}): Promise<CuratorStore> {
  const res = await curatorRequest<{ store: CuratorStore }>('/curator/stores', {
    method: 'POST',
    body: JSON.stringify(store),
  });
  return res.store;
}

export async function createCuratorProduct(product: {
  name: string;
  size_hint?: string;
  brand?: string;
  image_url?: string;
  sold_by: PriceUnit;
}): Promise<CreatedProduct> {
  const res = await curatorRequest<{ product: CreatedProduct }>('/curator/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  return res.product;
}

export async function recordCuratorPrice(price: {
  product_id: string;
  store_id: string;
  amount: number;
  unit: PriceUnit;
  barcode?: string;
}): Promise<void> {
  await curatorRequest<{ price: unknown }>('/curator/prices', {
    method: 'POST',
    body: JSON.stringify(price),
  });
}

export async function getStoreBasket(storeId: string): Promise<StoreBasket> {
  return curatorRequest<StoreBasket>(`/curator/basket?store_id=${encodeURIComponent(storeId)}`);
}

/** Save a product photo taken in store. */
export async function setCuratorProductImage(productId: string, imageUrl: string): Promise<void> {
  await curatorRequest<{ product: unknown }>(`/curator/products/${encodeURIComponent(productId)}/image`, {
    method: 'PUT',
    body: JSON.stringify({ image_url: imageUrl }),
  });
}

/** Point a basket slot at a product, e.g. one just added in store. */
export async function linkBasketSlot(slot: string, productId: string): Promise<void> {
  await curatorRequest<{ slot: unknown }>(`/curator/basket/${encodeURIComponent(slot)}`, {
    method: 'PUT',
    body: JSON.stringify({ product_id: productId }),
  });
}

export type SuggestionStatus = 'open' | 'applied' | 'dismissed';
export type SuggestionAction = 'apply' | 'dismiss';

export interface SuggestionFields {
  name?: string;
  brand?: string;
  category?: string;
  image_url?: string;
  size_hint?: string;
}

export interface Suggestion {
  _id: string;
  kind: SuggestionKind;
  status: SuggestionStatus;
  product_id: string | null;
  product_name: string | null;
  barcode: string | null;
  fields: SuggestionFields;
  note: string | null;
  created_at: string;
  /** The product's values now, for corrections. */
  current?: { name?: string | null; brand?: string | null; category?: string | null; image_url?: string | null } | null;
}

export async function listSuggestions(): Promise<Suggestion[]> {
  const res = await curatorRequest<{ suggestions: Suggestion[] }>('/curator/suggestions?status=open');
  return res.suggestions;
}

/** Apply (change the catalog) or dismiss a shopper suggestion. */
export async function reviewSuggestion(id: string, action: SuggestionAction): Promise<void> {
  await curatorRequest<{ suggestion: unknown }>(`/curator/suggestions/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}
