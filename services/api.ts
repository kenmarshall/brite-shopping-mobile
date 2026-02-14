const API_BASE_URL = __DEV__
  ? 'http://localhost:5000'
  : 'https://brite-shopping-api.onrender.com';

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

export async function searchProducts(query: string): Promise<Product[]> {
  return request<Product[]>(`/products?name=${encodeURIComponent(query)}`);
}

export async function getProduct(id: string): Promise<Product> {
  return request<Product>(`/products/${id}`);
}

export async function getAllProducts(): Promise<Product[]> {
  return request<Product[]>('/products');
}

export async function getProductPrices(id: string): Promise<LocationPrice[]> {
  return request<LocationPrice[]>(`/products/${id}/prices`);
}
