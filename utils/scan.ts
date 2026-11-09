import type { PriceSummary } from '@/utils/prices';

export type ScanInsight =
  | { kind: 'none' }
  | { kind: 'onlyAt'; store: string }
  | { kind: 'cheaper'; store: string; amount: number; than: string }
  | { kind: 'same'; stores: number };

/** The one line a shopper in the aisle needs: where it's cheaper, by how much, or that only one store has it. */
export function scanInsight(summary: PriceSummary): ScanInsight {
  const { lowest, rows, savings } = summary;
  if (!lowest) return { kind: 'none' };
  const store = lowest.price.store_name ?? '';
  const unit = lowest.price.price_unit ?? null;
  const comparable = rows.filter((r) => (r.price.price_unit ?? null) === unit);
  if (comparable.length < 2) return { kind: 'onlyAt', store };
  if (savings && savings > 0) {
    const priciest = comparable[comparable.length - 1];
    return { kind: 'cheaper', store, amount: savings, than: priciest.price.store_name ?? '' };
  }
  return { kind: 'same', stores: comparable.length };
}
