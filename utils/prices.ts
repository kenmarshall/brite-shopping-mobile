import { Strings } from '@/constants/Strings';
import type { LocationPrice, Product } from '@/services/api';

/** A store price older than this is shown as "may be outdated". */
export const STALE_AFTER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StorePrice {
  price: LocationPrice;
  ageDays: number | null;
  isStale: boolean;
  isLowest: boolean;
  /** Amount above the lowest price; 0 for the lowest or when units differ. */
  diffFromLowest: number;
}

export interface PriceSummary {
  /** Lowest first. */
  rows: StorePrice[];
  lowest: StorePrice | null;
  /** Lowest vs the most expensive comparable store, or null when there is nothing to save. */
  savings: number | null;
}

export function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
}

export function formatAge(days: number | null): string | null {
  if (days == null) return null;
  const A = Strings.ages;
  if (days === 0) return A.today;
  if (days === 1) return A.yesterday;
  if (days < 60) return A.days(days);
  return A.months(Math.floor(days / 30));
}

const GRAMS_PER_LB = 453.592;
const LB_PER_KG = 1000 / GRAMS_PER_LB;

/** A by-weight price in both units, or null for a per-item price. */
export function weightAmounts(price: Pick<LocationPrice, 'amount' | 'price_unit'>): { lb: number; kg: number } | null {
  if (price.price_unit === 'lb') return { lb: price.amount, kg: price.amount * LB_PER_KG };
  if (price.price_unit === 'kg') return { lb: price.amount / LB_PER_KG, kg: price.amount };
  return null;
}

/** A by-weight product's estimate in both units (it is stored in the unit the product is sold by), else null. */
export function estimateByWeight(product: Pick<Product, 'estimated_price' | 'sold_by'>): { lb: number; kg: number } | null {
  const unit = product.sold_by?.kind === 'weight' ? product.sold_by.unit : null;
  if (product.estimated_price == null || !unit) return null;
  return weightAmounts({ amount: product.estimated_price, price_unit: unit });
}

/**
 * Store prices with their sale unit filled in. Scraped prices for products sold by weight
 * ("Yam Yellow Local KG") are per kg/lb but don't carry the unit themselves.
 * By-weight prices all come back per lb, the unit shoppers talk in, so a store that
 * prices per kg and one that prices per lb can be compared.
 */
export function pricesWithUnits(product: Pick<Product, 'location_prices' | 'sold_by'>): LocationPrice[] {
  const weightUnit = product.sold_by?.kind === 'weight' ? product.sold_by.unit : null;
  if (!weightUnit && !product.location_prices.some((p) => p.price_unit)) return product.location_prices;
  return product.location_prices.map((p) => {
    const amounts = weightAmounts({ amount: p.amount, price_unit: p.price_unit ?? weightUnit });
    return amounts ? { ...p, amount: amounts.lb, price_unit: 'lb' } : p;
  });
}

export function summarizePrices(prices: LocationPrice[], now: Date = new Date()): PriceSummary {
  if (prices.length === 0) return { rows: [], lowest: null, savings: null };
  const sorted = [...prices].sort((a, b) => a.amount - b.amount);
  const lowestPrice = sorted[0];
  // Per-kg and per-item prices can't be compared, so only like units count toward diffs and savings.
  const sameUnit = (p: LocationPrice) => (p.price_unit ?? null) === (lowestPrice.price_unit ?? null);

  const rows = sorted.map((price, i): StorePrice => {
    const ageDays = daysSince(price.last_seen_at, now);
    return {
      price,
      ageDays,
      isStale: ageDays != null && ageDays > STALE_AFTER_DAYS,
      isLowest: i === 0,
      diffFromLowest: i > 0 && sameUnit(price) ? price.amount - lowestPrice.amount : 0,
    };
  });

  const highest = Math.max(...sorted.filter(sameUnit).map((p) => p.amount));
  const savings = highest > lowestPrice.amount ? highest - lowestPrice.amount : null;
  return { rows, lowest: rows[0], savings };
}

/** Grams or millilitres per unit, so a price can be compared per 100 g / 100 ml. */
const METRIC: Record<string, { base: 'g' | 'ml'; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  lb: { base: 'g', factor: GRAMS_PER_LB },
  ml: { base: 'ml', factor: 1 },
  cl: { base: 'ml', factor: 10 },
  l: { base: 'ml', factor: 1000 },
  qt: { base: 'ml', factor: 946.353 },
  gal: { base: 'ml', factor: 3785.41 },
};

export interface UnitPrice {
  amount: number;
  per: string;
}

/** Fresh produce and meat are bought by the pound in Jamaica, so their packs compare per lb, not per 100 g. */
const PER_POUND_CATEGORIES = new Set(['Fruits & Vegetables', 'Meat & Seafood']);

export function comparesPerPound(product: Pick<Product, 'category'>): boolean {
  return product.category != null && PER_POUND_CATEGORIES.has(product.category);
}

/** Price per 100 g / 100 ml / oz / item (per lb for weights when `perPound`), or null when the size can't support one. */
export function unitPrice(amount: number, size: Product['size'] | null | undefined, perPound = false): UnitPrice | null {
  if (!size || size.value == null || size.value <= 0 || !size.unit) return null;
  const unit = size.unit.toLowerCase();
  const quantity = size.value * (size.pack_count && size.pack_count > 1 ? size.pack_count : 1);
  const round = (n: number) => Math.round(n * 100) / 100;
  const U = Strings.product.unitPer;

  const metric = METRIC[unit];
  if (metric) {
    const total = quantity * metric.factor;
    if (perPound && metric.base === 'g') return { amount: round((amount / total) * GRAMS_PER_LB), per: U.pound };
    return { amount: round((amount / total) * 100), per: metric.base === 'g' ? U.hundredGrams : U.hundredMl };
  }
  // Packaging can't tell fluid from weight ounces, so ounces stay as "oz".
  if (unit === 'oz') return { amount: round(amount / quantity), per: U.ounce };
  if (unit === 'count' && quantity > 1) return { amount: round(amount / quantity), per: U.item };
  return null;
}
