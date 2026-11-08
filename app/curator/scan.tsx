import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BarcodeScanner from '@/components/BarcodeScanner';
import { PriceForm } from '@/components/curator/PriceForm';
import { ProductMatcher } from '@/components/curator/ProductMatcher';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { Strings } from '@/constants/Strings';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { lookupBarcode, type Product } from '@/services/api';
import { recordCuratorPrice, type PriceUnit } from '@/services/curator';

const S = Strings.curator;

type Step =
  | { kind: 'scanning' }
  | { kind: 'looking_up'; barcode: string }
  | { kind: 'price'; barcode: string; product: Product }
  | { kind: 'match'; barcode: string; suggestedName: string | null; suggestions: Product[] }
  | { kind: 'error'; message: string };

export default function CuratorScanScreen() {
  const { storeId, storeName } = useLocalSearchParams<{ storeId: string; storeName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const [step, setStep] = useState<Step>({ kind: 'scanning' });
  const [scannerKey, setScannerKey] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const scanNext = () => {
    setStep({ kind: 'scanning' });
    setScannerKey((k) => k + 1); // remount resets the scanner's one-shot guard
  };

  const onScanned = async (barcode: string): Promise<void> => {
    setStep({ kind: 'looking_up', barcode });
    try {
      const result = await lookupBarcode(barcode);
      if (result.found && result.product) {
        setStep({ kind: 'price', barcode, product: result.product });
      } else {
        setStep({ kind: 'match', barcode, suggestedName: result.external_data?.name ?? null, suggestions: result.suggestions ?? [] });
      }
    } catch {
      setStep({ kind: 'error', message: S.lookupError });
    }
  };

  const savePrice = async (amount: number, unit: PriceUnit): Promise<void> => {
    if (step.kind !== 'price' || saving || !storeId) return;
    setSaving(true);
    try {
      await recordCuratorPrice({ product_id: step.product._id, store_id: storeId, amount, unit, barcode: step.barcode });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSavedCount((n) => n + 1);
      setLastSaved(step.product.name);
      scanNext();
    } catch {
      setStep({ kind: 'error', message: S.saveError });
    } finally {
      setSaving(false);
    }
  };

  const sheet = (() => {
    switch (step.kind) {
      case 'looking_up':
        return (
          <View style={styles.row}>
            <ActivityIndicator color={colors.tint} />
            <ThemedText>{S.lookingUp}</ThemedText>
          </View>
        );
      case 'price':
        return <PriceForm product={step.product} storeId={storeId ?? ''} saving={saving} onSave={savePrice} onSkip={scanNext} />;
      case 'match':
        return (
          <ProductMatcher
            suggestedName={step.suggestedName}
            suggestions={step.suggestions}
            onPick={(product) => setStep({ kind: 'price', barcode: step.barcode, product })}
            onCancel={scanNext}
          />
        );
      case 'error':
        return (
          <View style={styles.errorBox}>
            <ThemedText style={{ color: colors.error }}>{step.message}</ThemedText>
            <Pressable onPress={scanNext} style={[styles.button, { backgroundColor: colors.tint }]} accessibilityRole="button">
              <ThemedText style={[styles.buttonText, { color: colors.onTint }]}>{S.scanAgain}</ThemedText>
            </Pressable>
          </View>
        );
      default:
        return null;
    }
  })();

  return (
    <View style={styles.screen}>
      {step.kind === 'scanning' || step.kind === 'looking_up' ? (
        <BarcodeScanner key={scannerKey} onScanned={onScanned} onClose={() => router.back()} />
      ) : null}

      {step.kind === 'scanning' ? (
        <View style={[styles.banner, { backgroundColor: colors.card, bottom: insets.bottom + Spacing.lg }]} accessibilityLiveRegion="polite">
          <ThemedText style={styles.bannerTitle} numberOfLines={1}>{S.scanTitle(storeName ?? '')}</ThemedText>
          <View style={styles.row}>
            {lastSaved ? <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} /> : null}
            <ThemedText style={[styles.bannerMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {lastSaved ? `${S.saved(lastSaved)} · ${S.scannedCount(savedCount)}` : S.scannedCount(savedCount)}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {sheet ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={step.kind === 'looking_up' ? styles.overlay : [styles.fill, { backgroundColor: colors.background }]}
        >
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + Spacing.lg }, step.kind !== 'looking_up' && { paddingTop: insets.top + Spacing.lg }]}>
            {sheet}
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  banner: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  bannerTitle: { fontSize: FontSize.md, fontWeight: '700' },
  bannerMeta: { fontSize: FontSize.sm, flexShrink: 1 },
  errorBox: { gap: Spacing.md },
  button: { minHeight: ButtonSize.touch + Spacing.xs, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: FontSize.md, fontWeight: '700' },
});
