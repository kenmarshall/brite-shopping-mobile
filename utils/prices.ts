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

/**
 * Store prices with their sale unit filled in. Scraped prices for products sold by weight
 * ("Yam Yellow Local KG") are per kg/lb but don't carry the unit themselves.
 */
export function pricesWithUnits(product: Pick<Product, 'location_prices' | 'sold_by'>): LocationPrice[] {
  const weightUnit = product.sold_by?.kind === 'weight' ? product.sold_by.unit : null;
  if (!weightUnit) return product.location_prices;
  return product.location_prices.map((p) => (p.price_unit ? p : { ...p, price_unit: weightUnit }));
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
  lb: { base: 'g', factor: 453.592 },
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

/** Price per 100 g / 100 ml / oz / item, or null when the size can't support one. */
export function unitPrice(amount: number, size: Product['size'] | null | undefined): UnitPrice | null {
  if (!size || size.value == null || size.value <= 0 || !size.unit) return null;
  const unit = size.unit.toLowerCase();
  const quantity = size.value * (size.pack_count && size.pack_count > 1 ? size.pack_count : 1);
  const round = (n: number) => Math.round(n * 100) / 100;
  const U = Strings.product.unitPer;

  const metric = METRIC[unit];
  if (metric) {
    const total = quantity * metric.factor;
    return { amount: round((amount / total) * 100), per: metric.base === 'g' ? U.hundredGrams : U.hundredMl };
  }
  // Packaging can't tell fluid from weight ounces, so ounces stay as "oz".
  if (unit === 'oz') return { amount: round(amount / quantity), per: U.ounce };
  if (unit === 'count' && quantity > 1) return { amount: round(amount / quantity), per: U.item };
  return null;
}
