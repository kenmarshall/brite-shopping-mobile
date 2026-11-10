import { describe, expect, it } from '@jest/globals';
import type { LocationPrice } from '@/services/api';
import { comparesPerPound, daysSince, estimateByWeight, formatAge, pricesWithUnits, summarizePrices, unitPrice, weightAmounts } from '@/utils/prices';

const NOW = new Date('2026-11-08T12:00:00Z');

function price(overrides: Partial<LocationPrice>): LocationPrice {
  return {
    location_id: 'store',
    store_name: 'Store',
    amount: 100,
    currency: 'JMD',
    last_seen_at: '2026-11-08T08:00:00Z',
    ...overrides,
  };
}

describe('daysSince', () => {
  it('counts whole days', () => {
    expect(daysSince('2026-11-06T11:00:00Z', NOW)).toBe(2);
  });
  it('returns null for missing or bad dates', () => {
    expect(daysSince(undefined, NOW)).toBeNull();
    expect(daysSince('not a date', NOW)).toBeNull();
  });
  it('never goes negative for future timestamps', () => {
    expect(daysSince('2026-11-09T12:00:00Z', NOW)).toBe(0);
  });
});

describe('formatAge', () => {
  it('uses friendly words for recent days', () => {
    expect(formatAge(0)).toBe('today');
    expect(formatAge(1)).toBe('yesterday');
    expect(formatAge(41)).toBe('41 days ago');
  });
  it('switches to months after 60 days', () => {
    expect(formatAge(95)).toBe('3 months ago');
  });
  it('returns null when the age is unknown', () => {
    expect(formatAge(null)).toBeNull();
  });
});

describe('summarizePrices', () => {
  it('sorts lowest first and computes diffs and savings', () => {
    const s = summarizePrices(
      [price({ location_id: 'b', amount: 1690 }), price({ location_id: 'a', amount: 1450 }), price({ location_id: 'c', amount: 1560 })],
      NOW,
    );
    expect(s.rows.map((r) => r.price.location_id)).toEqual(['a', 'c', 'b']);
    expect(s.rows.map((r) => r.diffFromLowest)).toEqual([0, 110, 240]);
    expect(s.lowest?.isLowest).toBe(true);
    expect(s.savings).toBe(240);
  });

  it('flags prices older than 30 days as stale', () => {
    const s = summarizePrices([price({ last_seen_at: '2026-09-28T12:00:00Z' })], NOW);
    expect(s.rows[0].ageDays).toBe(41);
    expect(s.rows[0].isStale).toBe(true);
  });

  it('has no savings with a single store', () => {
    expect(summarizePrices([price({})], NOW).savings).toBeNull();
  });

  it('does not compare per-kg prices with per-item prices', () => {
    const s = summarizePrices([price({ amount: 300, price_unit: 'kg' }), price({ amount: 900 })], NOW);
    expect(s.rows[1].diffFromLowest).toBe(0);
    expect(s.savings).toBeNull();
  });

  it('handles no prices', () => {
    expect(summarizePrices([], NOW)).toEqual({ rows: [], lowest: null, savings: null });
  });
});

describe('unitPrice', () => {
  it('prices metric sizes per 100 ml or 100 g', () => {
    expect(unitPrice(1450, { value: 400, unit: 'ml' })).toEqual({ amount: 362.5, per: '100 ml' });
    expect(unitPrice(500, { value: 1, unit: 'kg' })).toEqual({ amount: 50, per: '100 g' });
  });
  it('multiplies by the pack count', () => {
    expect(unitPrice(1980, { value: 330, unit: 'ml', pack_count: 6 })).toEqual({ amount: 100, per: '100 ml' });
  });
  it('keeps ounces as ounces', () => {
    expect(unitPrice(800, { value: 16, unit: 'oz' })).toEqual({ amount: 50, per: 'oz' });
  });
  it('prices multi-count packs per item', () => {
    expect(unitPrice(600, { value: 12, unit: 'count' })).toEqual({ amount: 50, per: 'item' });
  });
  it('prices weights per lb when asked, leaving volumes per 100 ml', () => {
    expect(unitPrice(1000, { value: 2, unit: 'lb' }, true)).toEqual({ amount: 500, per: 'lb' });
    expect(unitPrice(1000, { value: 1, unit: 'kg' }, true)).toEqual({ amount: 453.59, per: 'lb' });
    expect(unitPrice(1450, { value: 400, unit: 'ml' }, true)).toEqual({ amount: 362.5, per: '100 ml' });
  });
  it('returns null when the size is missing or unusable', () => {
    expect(unitPrice(100, null)).toBeNull();
    expect(unitPrice(100, { value: null, unit: 'g' })).toBeNull();
    expect(unitPrice(100, { value: 1, unit: 'count' })).toBeNull();
    expect(unitPrice(100, { value: 500, unit: 'mg' })).toBeNull();
  });
});

describe('comparesPerPound', () => {
  it('is true for fresh produce and meat only', () => {
    expect(comparesPerPound({ category: 'Fruits & Vegetables' })).toBe(true);
    expect(comparesPerPound({ category: 'Meat & Seafood' })).toBe(true);
    expect(comparesPerPound({ category: 'Snacks' })).toBe(false);
    expect(comparesPerPound({ category: null })).toBe(false);
  });
});

describe('weightAmounts', () => {
  it('gives a by-weight price in both units', () => {
    const fromKg = weightAmounts({ amount: 1000, price_unit: 'kg' });
    expect(fromKg?.kg).toBe(1000);
    expect(fromKg?.lb).toBeCloseTo(453.59, 2);
    const fromLb = weightAmounts({ amount: 500, price_unit: 'lb' });
    expect(fromLb?.lb).toBe(500);
    expect(fromLb?.kg).toBeCloseTo(1102.31, 2);
  });
  it('is null for per-item prices', () => {
    expect(weightAmounts({ amount: 100 })).toBeNull();
  });
});

describe('estimateByWeight', () => {
  it('reads the estimate in the unit the product is sold by', () => {
    const e = estimateByWeight({ estimated_price: 1000, sold_by: { kind: 'weight', unit: 'kg' } });
    expect(e?.kg).toBe(1000);
    expect(e?.lb).toBeCloseTo(453.59, 2);
  });
  it('is null for items sold each or without an estimate', () => {
    expect(estimateByWeight({ estimated_price: 300, sold_by: { kind: 'each', unit: null } })).toBeNull();
    expect(estimateByWeight({ estimated_price: null, sold_by: { kind: 'weight', unit: 'lb' } })).toBeNull();
  });
});

describe('pricesWithUnits', () => {
  it('puts by-weight prices per lb, filling the unit from how the product is sold', () => {
    const prices = pricesWithUnits({ sold_by: { kind: 'weight', unit: 'kg' }, location_prices: [price({ amount: 1000 }), price({ amount: 500, price_unit: 'lb' })] });
    expect(prices.map((p) => p.price_unit)).toEqual(['lb', 'lb']);
    expect(prices[0].amount).toBeCloseTo(453.59, 2);
    expect(prices[1].amount).toBe(500);
  });
  it('converts back to the store\'s per-kg price exactly enough to show', () => {
    const [p] = pricesWithUnits({ sold_by: { kind: 'weight', unit: 'kg' }, location_prices: [price({ amount: 947.36 })] });
    expect(weightAmounts(p)?.kg.toFixed(2)).toBe('947.36');
  });
  it('compares a per-kg store with a per-lb store', () => {
    const prices = pricesWithUnits({
      sold_by: { kind: 'weight', unit: 'kg' },
      location_prices: [price({ location_id: 'kg', amount: 920 }), price({ location_id: 'lb', amount: 450, price_unit: 'lb' })],
    });
    const s = summarizePrices(prices, NOW);
    expect(s.rows.map((r) => r.price.location_id)).toEqual(['kg', 'lb']);
    expect(s.savings).toBeCloseTo(32.7, 1);
  });
  it('converts a scanned per-kg price on a product not marked as sold by weight', () => {
    const [p] = pricesWithUnits({ sold_by: { kind: 'each', unit: null }, location_prices: [price({ amount: 1000, price_unit: 'kg' })] });
    expect(p.price_unit).toBe('lb');
  });
  it('leaves items sold each alone', () => {
    const list = [price({})];
    expect(pricesWithUnits({ sold_by: { kind: 'each', unit: null }, location_prices: list })).toBe(list);
  });
});
