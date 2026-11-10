import { useMemo, useRef, useState } from 'react';

import { Strings } from '@/constants/Strings';
import { useShoppingList } from '@/hooks/useShoppingList';
import type { SnackbarState } from '@/hooks/useSnackbar';
import type { Product } from '@/services/api';
import { setQuantity } from '@/services/shoppingList';
import { estimateByWeight } from '@/utils/prices';

const S = Strings.cart;

export interface ListActions {
  /** Quantity of a product in the list; 0 when it isn't there. */
  quantityOf: (productId: string) => number;
  busy: boolean;
  /** Sets the quantity (0 removes) and confirms adds and removals with a snackbar. */
  setProductQuantity: (product: Product, quantity: number) => void;
}

/**
 * Add, change or remove products from any screen. Adding offers "View list" (or Undo with
 * `undoOnAdd`); removing always offers Undo.
 */
export function useListActions(snackbar: SnackbarState, onViewList: () => void, undoOnAdd = false): ListActions {
  const list = useShoppingList();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const quantities = useMemo(() => new Map((list ?? []).map((i) => [i.productId, i.quantity])), [list]);
  const quantityOf = (productId: string) => quantities.get(productId) ?? 0;

  const apply = async (product: Product, quantity: number, confirm: boolean): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const previous = quantityOf(product._id);
    try {
      await setQuantity(
        { productId: product._id, name: product.name, estimatedPrice: estimateByWeight(product)?.lb ?? product.estimated_price, imageUrl: product.image_url },
        quantity,
      );
      if (!confirm) return;
      const undo = { label: S.undo, onPress: () => apply(product, previous, false) };
      if (previous === 0 && quantity > 0) {
        snackbar.show(S.added(product.name), undoOnAdd ? undo : { label: S.view, onPress: onViewList });
      } else if (quantity === 0) {
        snackbar.show(S.removed(product.name), undo);
      }
    } catch {
      snackbar.show(S.error);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return { quantityOf, busy, setProductQuantity: (product, quantity) => apply(product, quantity, true) };
}
