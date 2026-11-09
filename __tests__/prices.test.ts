import { describe, expect, it } from '@jest/globals';
import type { LocationPrice } from '@/services/api';
import { daysSince, formatAge, pricesWithUnits, summarizePrices, unitPrice } from '@/utils/prices';

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
  it('returns null when the size is missing or unusable', () => {
    expect(unitPrice(100, null)).toBeNull();
    expect(unitPrice(100, { value: null, unit: 'g' })).toBeNull();
    expect(unitPrice(100, { value: 1, unit: 'count' })).toBeNull();
    expect(unitPrice(100, { value: 500, unit: 'mg' })).toBeNull();
  });
});

describe('pricesWithUnits', () => {
  it('marks scraped prices of weight-sold products as per kg or lb', () => {
    const prices = pricesWithUnits({ sold_by: { kind: 'weight', unit: 'kg' }, location_prices: [price({}), price({ price_unit: 'lb' })] });
    expect(prices.map((p) => p.price_unit)).toEqual(['kg', 'lb']);
  });
  it('leaves items sold each alone', () => {
    const list = [price({})];
    expect(pricesWithUnits({ sold_by: { kind: 'each', unit: null }, location_prices: list })).toBe(list);
  });
});
