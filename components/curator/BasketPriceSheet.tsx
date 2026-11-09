import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriceForm } from '@/components/curator/PriceForm';
import { ProductMatcher } from '@/components/curator/ProductMatcher';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Strings } from '@/constants/Strings';
import { Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { getProduct, type Product } from '@/services/api';
import { type BasketItem, type PriceUnit, linkBasketSlot, recordCuratorPrice } from '@/services/curator';

const S = Strings.curator;

interface Props {
  /** Mount one sheet per item (key it by slot): its first step comes from the item. */
  item: BasketItem;
  storeId: string;
  onClose: () => void;
  onSaved: (productName: string) => void;
}

type Step =
  | { kind: 'loading' }
  | { kind: 'match' }
  | { kind: 'price'; product: Product }
  | { kind: 'error'; message: string; product?: Product };

/** Price a basket item without scanning: load (or add) its product, then take the shelf price. */
export function BasketPriceSheet({ item, storeId, onClose, onSaved }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(() => (item.product ? { kind: 'loading' } : { kind: 'match' }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const productId = item.product?._id;
    if (!productId) return;
    let active = true;
    getProduct(productId)
      .then((product) => active && setStep({ kind: 'price', product }))
      .catch(() => active && setStep({ kind: 'error', message: S.productLoadError }));
    return () => {
      active = false;
    };
  }, [item]);

  const pick = async (product: Product): Promise<void> => {
    setStep({ kind: 'price', product });
    try {
      // The slot now points at this product, so the next visit shows it directly.
      await linkBasketSlot(item.slot, product._id);
    } catch {
      // Pricing still works; the slot just stays unlinked until next time.
    }
  };

  const save = async (amount: number, unit: PriceUnit): Promise<void> => {
    if (step.kind !== 'price' || saving) return;
    setSaving(true);
    try {
      await recordCuratorPrice({ product_id: step.product._id, store_id: storeId, amount, unit });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(step.product.name);
    } catch {
      setStep({ kind: 'error', message: S.saveError, product: step.product });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.backdrop, { backgroundColor: colors.backdrop }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.lg }]}>
          <ThemedText style={[styles.caption, { color: colors.textSecondary }]}>{item.label.toUpperCase()}</ThemedText>
          {step.kind === 'loading' ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.primary} />
              <ThemedText>{S.loadingProduct}</ThemedText>
            </View>
          ) : step.kind === 'match' ? (
            <ProductMatcher suggestedName={item.label} suggestions={[]} onPick={pick} onCancel={onClose} cancelLabel={S.cancel} />
          ) : step.kind === 'price' ? (
            <PriceForm product={step.product} storeId={storeId} saving={saving} onSave={save} onSkip={onClose} />
          ) : (
            <View style={styles.error}>
              <ThemedText style={{ color: colors.danger }}>{step.message}</ThemedText>
              <View style={styles.row}>
                <Button label={S.cancel} variant="secondary" onPress={onClose} />
                {step.product ? (
                  <Button label={S.retry} onPress={() => step.product && setStep({ kind: 'price', product: step.product })} />
                ) : null}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet, padding: Spacing.lg, gap: Spacing.md },
  caption: { ...Type.caption },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  error: { gap: Spacing.md },
});
