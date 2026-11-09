import { describe, expect, it } from '@jest/globals';

import type { BasketGroup, BasketItem } from '@/services/curator';
import { filterBasket, parsePriceInput } from '@/utils/curator';

const item = (slot: string, status: BasketItem['status']): BasketItem => ({ slot, label: slot, status, product: null, price: null });
const groups: BasketGroup[] = [
  { group: 'Canned goods', items: [item('beans', 'done'), item('mackerel', 'needed')] },
  { group: 'Fresh produce', items: [item('yam', 'outdated')] },
  { group: 'Drinks', items: [item('ting', 'done')] },
];

describe('filterBasket', () => {
  it('keeps needed and outdated items for "to price" and drops empty groups', () => {
    const todo = filterBasket(groups, 'todo');
    expect(todo.map((g) => g.group)).toEqual(['Canned goods', 'Fresh produce']);
    expect(todo[0].items.map((i) => i.slot)).toEqual(['mackerel']);
  });
  it('shows only fresh prices for "done"', () => {
    expect(filterBasket(groups, 'done').flatMap((g) => g.items.map((i) => i.slot))).toEqual(['beans', 'ting']);
  });
  it('returns everything for "all"', () => {
    expect(filterBasket(groups, 'all')).toBe(groups);
  });
});

describe('parsePriceInput', () => {
  it('reads shelf prices with commas and symbols', () => {
    expect(parsePriceInput('1,450')).toBe(1450);
    expect(parsePriceInput('J$289.5')).toBe(289.5);
    expect(parsePriceInput('0')).toBeNull();
    expect(parsePriceInput('1.2.3')).toBeNull();
  });
});
