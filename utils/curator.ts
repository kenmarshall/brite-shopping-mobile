import type { Product } from '@/services/api';
import type { BasketGroup, PriceUnit } from '@/services/curator';

/** Parse a typed shelf price ("1,450", "289.5", "$95") into a positive number, or null. */
export function parsePriceInput(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned || (cleaned.match(/\./g) ?? []).length > 1) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

/** The price unit a product is usually sold in, used to preselect the unit picker. */
export function defaultPriceUnit(product: Pick<Product, 'sold_by'>): PriceUnit {
  const soldBy = product.sold_by;
  if (soldBy?.kind === 'weight' && soldBy.unit) return soldBy.unit;
  return 'each';
}

/** The price this store last recorded for the product, if any. */
export function priceAtStore(product: Pick<Product, 'location_prices'>, storeId: string): number | null {
  const entry = product.location_prices?.find((lp) => lp.location_id === storeId);
  return entry?.amount ?? null;
}

export type BasketFilter = 'todo' | 'done' | 'all';

/** Basket groups showing only items for the filter; "todo" is anything not priced fresh here. Empty groups drop out. */
export function filterBasket(groups: BasketGroup[], filter: BasketFilter): BasketGroup[] {
  if (filter === 'all') return groups;
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => (filter === 'done' ? i.status === 'done' : i.status !== 'done')) }))
    .filter((g) => g.items.length > 0);
}
