import { API_BASE_URL, API_KEY } from '@/services/api';
import { getProfileId } from '@/services/shoppingList';
import type { SuggestionKind } from '@/utils/suggestions';

export interface SuggestionInput {
  kind: SuggestionKind;
  product_id?: string;
  barcode?: string;
  fields?: { name?: string; brand?: string; image_url?: string; size_hint?: string };
  note?: string;
}

/** Send a suggestion for a curator to review. Shoppers never change the catalog directly. */
export async function submitSuggestion(input: SuggestionInput): Promise<void> {
  const deviceId = await getProfileId();
  const response = await fetch(`${API_BASE_URL}/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(API_KEY ? { 'X-API-Key': API_KEY } : {}) },
    body: JSON.stringify({ ...input, device_id: deviceId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${response.status}`);
  }
}
