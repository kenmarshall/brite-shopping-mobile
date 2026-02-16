const API_BASE_URL = 'https://brite-shopping-api.onrender.com';

export interface LocationPrice {
  location_id: string;
  store_name: string | null;
  amount: number;
  currency: string;
  last_seen_at: string;
}

export interface Product {
  _id: string;
  name: string;
  normalized_name: string;
  brand: string | null;
  category: string | null;
  size: { value: number | null; unit: string | null };
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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

export interface AddProductPayload {
  name: string;
  store_id: string;
  store_name?: string;
  price: number;
  currency?: string;
  brand?: string;
  category?: string;
  size_hint?: string;
  image_url?: string;
  url?: string;
}

export interface AddProductResponse {
  message: string;
  product_id: string;
  store_id: string;
}

export async function addProduct(payload: AddProductPayload): Promise<AddProductResponse> {
  return request<AddProductResponse>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
