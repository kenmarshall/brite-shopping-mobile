import { useEffect, useState } from 'react';

import { getShoppingList, subscribe, type ShoppingList } from '@/services/shoppingList';

/** The shopping list, kept current across screens. `null` until it has loaded. */
export function useShoppingList(): ShoppingList | null {
  const [list, setList] = useState<ShoppingList | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribe((next) => setList(next));
    getShoppingList()
      .then((loaded) => {
        if (active) setList(loaded);
      })
      .catch(() => {
        if (active) setList([]);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return list;
}
