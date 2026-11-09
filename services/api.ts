export const API_BASE_URL = 'https://brite-shopping-api.onrender.com';

// App-level API key — blocks casual unauthorized access.
// Set via EXPO_PUBLIC_API_KEY env var or defaults to empty (no enforcement in dev).
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';

export interface LocationPrice {
  location_id: string;
  store_name: string | null;
  amount: number;
  currency: string;
  last_seen_at: string;
  price_unit?: 'kg' | 'lb' | null;
  source?: string;
}

export interface Product {
  _id: string;
  name: string;
  normalized_name: string;
  brand: string | null;
  category: string | null;
  size: { value: number | null; unit: string | null; pack_count?: number | null };
  sold_by?: { kind: 'each' | 'weight' | 'pack'; unit: 'kg' | 'lb' | null };
  tags: string[];
  estimated_price: number | null;
  location_prices: LocationPrice[];
  image_url: string | null;
  store_id: string;
  store_name: string;
  url: string;
}

export interface SearchParams {
  q?: string;
  category?: string;
  tag?: string;
  store_id?: string;
  limit?: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function searchProducts(query: string, filters?: Omit<SearchParams, 'q'>): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.tag) params.set('tag', filters.tag);
  if (filters?.store_id) params.set('store_id', filters.store_id);
  if (filters?.limit) params.set('limit', String(filters.limit));
  return request<Product[]>(`/products?${params.toString()}`);
}

export async function browseByCategory(category: string, limit?: number): Promise<Product[]> {
  const params = new URLSearchParams({ category });
  if (limit) params.set('limit', String(limit));
  return request<Product[]>(`/products?${params.toString()}`);
}

export async function browseByTag(tag: string, limit?: number): Promise<Product[]> {
  const params = new URLSearchParams({ tag });
  if (limit) params.set('limit', String(limit));
  return request<Product[]>(`/products?${params.toString()}`);
}

export async function getProduct(id: string): Promise<Product> {
  return request<Product>(`/products/${id}`);
}

export async function getAllProducts(limit?: number): Promise<Product[]> {
  const params = limit ? `?limit=${limit}` : '';
  return request<Product[]>(`/products${params}`);
}

export async function getProductPrices(id: string): Promise<LocationPrice[]> {
  return request<LocationPrice[]>(`/products/${id}/prices`);
}

export async function getCategories(): Promise<string[]> {
  return request<string[]>('/categories');
}

export interface Store {
  store_id: string;
  store_name: string;
  product_count: number;
}

export async function getStores(): Promise<Store[]> {
  return request<Store[]>('/product-stores');
}

export interface GoogleStore {
  name: string;
  place_id: string;
  latitude: number;
  longitude: number;
  address: string;
}

export async function searchGoogleStores(name: string): Promise<GoogleStore[]> {
  const params = new URLSearchParams({ name });
  const res = await request<{ stores: GoogleStore[] }>(`/stores/search?${params.toString()}`);
  return res.stores;
}

// ---------- Device Profiles ----------

export interface DeviceProfile {
  device_id: string;
  platform: string;
  created_at: string;
}

export async function registerDevice(deviceId: string, platform: string): Promise<DeviceProfile> {
  return request<DeviceProfile>('/devices', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId, platform }),
  });
}

export interface ShoppingListSyncItem {
  productId: string;
  name: string;
  estimatedPrice: number | null;
  imageUrl: string | null;
  quantity: number;
  addedAt: string;
}

export async function getRemoteShoppingList(deviceId: string): Promise<ShoppingListSyncItem[]> {
  const res = await request<{ shopping_list: ShoppingListSyncItem[] }>(`/devices/${deviceId}/shopping-list`);
  return res.shopping_list;
}

export async function syncShoppingList(deviceId: string, list: ShoppingListSyncItem[]): Promise<void> {
  await request<{ message: string }>(`/devices/${deviceId}/shopping-list`, {
    method: 'PUT',
    body: JSON.stringify({ shopping_list: list }),
  });
}

// ---------- Barcode Scanning ----------

export interface BarcodeLookupResult {
  found: boolean;
  product?: Product;
  /** Open Food Facts data when the barcode is known there but not linked in our catalog */
  external_data?: { name?: string; brand?: string; image_url?: string };
  suggestions?: Product[];
}

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const response = await fetch(`${API_BASE_URL}/barcodes/${barcode}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    },
  });
  if (response.status === 404) {
    return { found: false };
  }
  if (!response.ok) {
    throw new Error(`Barcode lookup failed: ${response.status}`);
  }
  return response.json();
}

export interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  image_url?: string;
  categories?: string;
}

export async function lookupOpenFoodFacts(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,image_url,categories`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 1 || !data.product) return null;
    return data.product as OpenFoodFactsProduct;
  } catch {
    return null;
  }
}
