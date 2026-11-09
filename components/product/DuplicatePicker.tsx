import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { type Product, searchProducts } from '@/services/api';
import { formatProductSize } from '@/utils/format';

const S = Strings.suggest;
const SEARCH_DEBOUNCE_MS = 350;
const MAX_RESULTS = 6;

interface Props {
  /** The product being flagged; left out of the results. */
  productId: string;
  initialQuery: string;
  selected: Product | null;
  onSelect: (product: Product) => void;
}

/** Search the catalog for the other listing of the same product. */
export function DuplicatePicker({ productId, initialQuery, selected, onSelect }: Props) {
  const colors = useColors();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[] | null>(null);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      if (!q) return setResults(null);
      setSearching(true);
      try {
        const found = await searchProducts(q, { limit: MAX_RESULTS + 1 });
        if (id === requestId.current) setResults(found.filter((p) => p._id !== productId).slice(0, MAX_RESULTS));
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, productId]);

  return (
    <View style={styles.block}>
      <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={S.duplicateSearch}
          placeholderTextColor={colors.placeholderText}
          accessibilityLabel={S.duplicateSearch}
          autoCorrect={false}
          style={[styles.input, { color: colors.text }]}
        />
        {searching ? <ActivityIndicator color={colors.primary} /> : null}
      </View>
      {results && results.length === 0 && !searching ? (
        <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{S.duplicateNone}</ThemedText>
      ) : null}
      {(results ?? []).map((p) => {
        const on = selected?._id === p._id;
        const size = formatProductSize(p.size);
        return (
          <Pressable
            key={p._id}
            onPress={() => onSelect(p)}
            style={[styles.result, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primaryContainer : colors.surface }]}
            accessibilityRole="radio"
            aria-checked={on}
            accessibilityLabel={S.duplicatePick(p.name)}
          >
            <IconSymbol name={on ? 'checkmark.circle.fill' : 'circle'} size={20} color={on ? colors.primary : colors.textTertiary} />
            <View style={styles.text}>
              <ThemedText style={styles.name} numberOfLines={2}>{p.name}</ThemedText>
              {size ? <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{size}</ThemedText> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.sm },
  field: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: ButtonSize.large, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md },
  input: { ...Type.body, flex: 1, minHeight: ButtonSize.touch },
  result: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: ButtonSize.large, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  text: { flex: 1, minWidth: 0 },
  name: { ...Type.body, fontFamily: Fonts.semibold },
  meta: { ...Type.callout },
});
