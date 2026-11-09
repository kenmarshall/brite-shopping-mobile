import { describe, expect, it } from '@jest/globals';

import type { LocationPrice } from '@/services/api';
import { summarizePrices } from '@/utils/prices';
import { scanInsight } from '@/utils/scan';

const NOW = new Date('2026-11-09T12:00:00Z');
const price = (store: string, amount: number, unit: 'kg' | null = null): LocationPrice => ({
  location_id: store.toLowerCase(),
  store_name: store,
  amount,
  currency: 'JMD',
  last_seen_at: '2026-11-08T12:00:00Z',
  price_unit: unit,
});

describe('scanInsight', () => {
  it('names the cheapest store and the saving against the priciest', () => {
    const s = summarizePrices([price('Hi-Lo', 1690), price('CoolMarket', 1450), price('Sampars', 1560)], NOW);
    expect(scanInsight(s)).toEqual({ kind: 'cheaper', store: 'CoolMarket', amount: 240, than: 'Hi-Lo' });
  });
  it('says only one store has it', () => {
    expect(scanInsight(summarizePrices([price('Hi-Lo', 500)], NOW))).toEqual({ kind: 'onlyAt', store: 'Hi-Lo' });
  });
  it('does not compare per-kg and per-item prices', () => {
    expect(scanInsight(summarizePrices([price('Hi-Lo', 900, 'kg'), price('CoolMarket', 1200)], NOW))).toEqual({ kind: 'onlyAt', store: 'Hi-Lo' });
  });
  it('reports equal prices and no prices', () => {
    expect(scanInsight(summarizePrices([price('Hi-Lo', 500), price('CoolMarket', 500)], NOW))).toEqual({ kind: 'same', stores: 2 });
    expect(scanInsight(summarizePrices([], NOW))).toEqual({ kind: 'none' });
  });
});
