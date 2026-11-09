import type { Product } from '@/services/api';

export type SuggestionKind = 'correction' | 'wrong_price' | 'new_product' | 'barcode';

export interface CorrectionDraft {
  name: string;
  brand: string;
}

export interface CorrectionFields {
  name?: string;
  brand?: string;
}

/** Only the fields the shopper actually changed, trimmed; empty means nothing to correct. */
export function correctionFields(product: Pick<Product, 'name' | 'brand'>, draft: CorrectionDraft): CorrectionFields {
  const fields: CorrectionFields = {};
  const name = draft.name.trim();
  const brand = draft.brand.trim();
  if (name && name !== product.name) fields.name = name;
  if (brand && brand !== (product.brand ?? '')) fields.brand = brand;
  return fields;
}

export type SuggestionField = 'name' | 'brand' | 'category' | 'image_url' | 'size_hint';
const FIELD_ORDER: SuggestionField[] = ['name', 'brand', 'size_hint', 'category', 'image_url'];

export interface FieldChange {
  field: SuggestionField;
  before: string | null;
  after: string;
}

/** What a suggestion would change, in a stable order, skipping values that already match. */
export function suggestionChanges(
  fields: Partial<Record<SuggestionField, string>>,
  current?: Partial<Record<SuggestionField, string | null>> | null,
): FieldChange[] {
  return FIELD_ORDER.flatMap((field) => {
    const after = fields[field];
    if (!after) return [];
    const before = current?.[field] ?? null;
    return before === after ? [] : [{ field, before, after }];
  });
}
