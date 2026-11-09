import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Strings } from '@/constants/Strings';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getProduct, searchProducts, type Product } from '@/services/api';
import { createCuratorProduct } from '@/services/curator';
import { formatProductSize } from '@/utils/format';

const S = Strings.curator;
const SEARCH_DEBOUNCE_MS = 400;
const RESULTS_MAX_HEIGHT = 240;

interface Props {
  suggestedName: string | null;
  suggestions: Product[];
  onPick: (product: Product) => void;
  onCancel: () => void;
  /** Label for the way out; defaults to "Scan again" for the scan flow. */
  cancelLabel?: string;
}

export function ProductMatcher({ suggestedName, suggestions, onPick, onCancel, cancelLabel = S.scanAgain }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const [query, setQuery] = useState(suggestedName ?? '');
  const [results, setResults] = useState<Product[]>(suggestions);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(suggestedName ?? '');
  const [sizeHint, setSizeHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) return;
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchProducts(query, { limit: 15 }));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const create = async (): Promise<void> => {
    if (saving || name.trim().length < 2) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createCuratorProduct({ name: name.trim(), size_hint: sizeHint.trim() || undefined, sold_by: 'each' });
      onPick(await getProduct(created.product_id));
    } catch {
      setError(S.createError);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];

  if (creating) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>{S.createProduct}</ThemedText>
        <TextInput value={name} onChangeText={setName} placeholder={S.productName} placeholderTextColor={colors.placeholderText}
          accessibilityLabel={S.productName} style={inputStyle} autoFocus />
        <TextInput value={sizeHint} onChangeText={setSizeHint} placeholder={S.sizeHintPlaceholder} placeholderTextColor={colors.placeholderText}
          accessibilityLabel={S.sizeHint} style={inputStyle} />
        {error ? <ThemedText style={[styles.meta, { color: colors.error }]}>{error}</ThemedText> : null}
        <View style={styles.actions}>
          <Pressable onPress={() => setCreating(false)} disabled={saving} style={styles.secondary} accessibilityRole="button">
            <ThemedText style={[styles.link, { color: colors.tint }]}>{S.back}</ThemedText>
          </Pressable>
          <Pressable onPress={create} disabled={saving || name.trim().length < 2} accessibilityRole="button"
            accessibilityState={{ disabled: saving || name.trim().length < 2, busy: saving }}
            style={[styles.primary, { backgroundColor: colors.tint }, (saving || name.trim().length < 2) && styles.dimmed]}>
            {saving ? <ActivityIndicator color={colors.onTint} /> : (
              <ThemedText style={[styles.primaryText, { color: colors.onTint }]}>{S.createAndContinue}</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <ThemedText style={styles.title}>{S.notFoundTitle}</ThemedText>
        <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>
          {suggestedName ? S.suggestedName(suggestedName) : S.notFoundBody}
        </ThemedText>
      </View>
      <TextInput value={query} onChangeText={setQuery} placeholder={S.searchCatalog} placeholderTextColor={colors.placeholderText}
        accessibilityLabel={S.searchCatalog} style={inputStyle} returnKeyType="search" />
      <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
        {searching ? <ActivityIndicator color={colors.tint} style={styles.spinner} /> : null}
        {results.map((p) => (
          <Pressable key={p._id} onPress={() => onPick(p)} accessibilityRole="button" accessibilityLabel={p.name}
            style={({ pressed }) => [styles.result, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.backgroundSecondary }]}>
            <ThemedText style={styles.resultName} numberOfLines={1}>{p.name}</ThemedText>
            <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{formatProductSize(p.size) ?? ''}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.secondary} accessibilityRole="button">
          <ThemedText style={[styles.link, { color: colors.tint }]}>{cancelLabel}</ThemedText>
        </Pressable>
        <Pressable onPress={() => setCreating(true)} style={[styles.primary, { backgroundColor: colors.backgroundSecondary }]} accessibilityRole="button">
          <ThemedText style={[styles.primaryText, { color: colors.tint }]}>{S.createProduct}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '700' },
  meta: { fontSize: FontSize.sm },
  input: {
    minHeight: ButtonSize.touch,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  results: { maxHeight: RESULTS_MAX_HEIGHT },
  spinner: { marginVertical: Spacing.md },
  result: {
    minHeight: ButtonSize.touch,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultName: { fontSize: FontSize.md, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.md },
  secondary: { minHeight: ButtonSize.touch, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  link: { fontSize: FontSize.md, fontWeight: '600' },
  primary: {
    flex: 1,
    minHeight: ButtonSize.touch + Spacing.xs,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  primaryText: { fontSize: FontSize.md, fontWeight: '700' },
  dimmed: { opacity: 0.6 },
});
