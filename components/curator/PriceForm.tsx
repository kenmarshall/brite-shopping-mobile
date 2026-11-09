import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ProductPhotoButton } from '@/components/curator/ProductPhotoButton';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Strings } from '@/constants/Strings';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Product } from '@/services/api';
import type { PriceUnit } from '@/services/curator';
import { defaultPriceUnit, parsePriceInput, priceAtStore } from '@/utils/curator';
import { formatPrice, formatProductSize } from '@/utils/format';

const S = Strings.curator;
const UNITS: PriceUnit[] = ['each', 'kg', 'lb'];

interface Props {
  product: Product;
  storeId: string;
  saving: boolean;
  onSave: (amount: number, unit: PriceUnit) => void;
  onSkip: () => void;
}

export function PriceForm({ product, storeId, saving, onSave, onSkip }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const [text, setText] = useState('');
  const [unit, setUnit] = useState<PriceUnit>(defaultPriceUnit(product));
  const [touched, setTouched] = useState(false);
  const amount = parsePriceInput(text);
  const lastPrice = priceAtStore(product, storeId);
  const size = formatProductSize(product.size);

  const submit = () => {
    setTouched(true);
    if (amount != null && !saving) onSave(amount, unit);
  };

  return (
    <View style={styles.container}>
      <View>
        <ThemedText style={styles.name} numberOfLines={2}>
          {product.name}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>
          {[size, lastPrice != null ? S.lastPriceHere(formatPrice(lastPrice)) : S.noPriceHere]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>

      {product.image_url ? null : <ProductPhotoButton product={product} />}

      <View style={styles.field}>
        <ThemedText style={styles.label} nativeID="shelf-price-label">
          {S.shelfPrice}
        </ThemedText>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          placeholder={S.pricePlaceholder}
          placeholderTextColor={colors.placeholderText}
          keyboardType="decimal-pad"
          returnKeyType="done"
          autoFocus
          editable={!saving}
          accessibilityLabelledBy="shelf-price-label"
          style={[
            styles.input,
            { color: colors.text, borderColor: touched && amount == null ? colors.error : colors.tint },
          ]}
        />
        {touched && amount == null ? (
          <ThemedText style={[styles.hint, { color: colors.error }]}>{S.invalidPrice}</ThemedText>
        ) : null}
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>{S.unitLabel}</ThemedText>
        <View style={[styles.segment, { backgroundColor: colors.backgroundSecondary }]} accessibilityRole="radiogroup">
          {UNITS.map((u) => (
            <Pressable
              key={u}
              onPress={() => setUnit(u)}
              style={[styles.segmentItem, u === unit && { backgroundColor: colors.card }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: u === unit }}
            >
              <ThemedText style={[styles.segmentText, { color: u === unit ? colors.text : colors.textSecondary }]}>
                {S.units[u]}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onSkip} disabled={saving} style={styles.secondary} accessibilityRole="button">
          <ThemedText style={[styles.secondaryText, { color: colors.tint }]}>{S.skip}</ThemedText>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={saving}
          style={[styles.primary, { backgroundColor: colors.tint }, saving && styles.dimmed]}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color={colors.onTint} />
          ) : (
            <ThemedText style={[styles.primaryText, { color: colors.onTint }]}>{S.savePrice}</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  meta: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  input: {
    height: ButtonSize.touch + Spacing.md,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: FontSize.sm,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: Spacing.xs / 2,
  },
  segmentItem: {
    flex: 1,
    minHeight: ButtonSize.touch,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  secondary: {
    minHeight: ButtonSize.touch,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  primary: {
    flex: 1,
    minHeight: ButtonSize.touch + Spacing.xs,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  dimmed: {
    opacity: 0.6,
  },
});
