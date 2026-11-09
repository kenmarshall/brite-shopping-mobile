import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        store.set(k, v);
      },
    },
  };
});
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('@/services/api', () => ({
  registerDevice: async () => undefined,
  syncShoppingList: async () => undefined,
}));

// eslint-disable-next-line import/first
import * as List from '@/services/shoppingList';

const beans = { productId: 'beans', name: 'Grace Baked Beans', estimatedPrice: 283, imageUrl: null };
const rice = { productId: 'rice', name: 'White Rice 2 kg', estimatedPrice: 1000, imageUrl: null };

describe('shopping list', () => {
  beforeEach(async () => {
    await List.clearList();
  });

  it('adds, increments and removes without mutating earlier snapshots', async () => {
    const first = await List.addToList(beans);
    const second = await List.addToList(beans);
    expect(first[0].quantity).toBe(1);
    expect(second[0].quantity).toBe(2);
    const removed = await List.updateQuantity('beans', 0);
    expect(removed).toEqual([]);
  });

  it('restores a previous snapshot for Undo', async () => {
    await List.addToList(beans);
    const before = await List.addToList(rice);
    await List.clearList();
    const restored = await List.restoreList(before);
    expect(restored.map((i) => i.productId)).toEqual(['beans', 'rice']);
  });

  it('ticks items off and clears only the ticked ones', async () => {
    await List.addToList(beans);
    await List.addToList(rice);
    const ticked = await List.setChecked('rice', true);
    expect(ticked.find((i) => i.productId === 'rice')?.checked).toBe(true);
    const left = await List.clearChecked();
    expect(left.map((i) => i.productId)).toEqual(['beans']);
  });

  it('notifies subscribers on every change until unsubscribed', async () => {
    const seen: number[] = [];
    const unsubscribe = List.subscribe((list) => seen.push(list.length));
    await List.addToList(beans);
    await List.addToList(rice);
    unsubscribe();
    await List.clearList();
    expect(seen).toEqual([1, 2]);
  });

  it('setQuantity adds, updates and removes', async () => {
    expect((await List.setQuantity(beans, 3))[0].quantity).toBe(3);
    expect((await List.setQuantity(beans, 1))[0].quantity).toBe(1);
    expect(await List.setQuantity(beans, 0)).toEqual([]);
    expect(await List.setQuantity(rice, 0)).toEqual([]);
  });
});
