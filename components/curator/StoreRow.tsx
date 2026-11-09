import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { Strings } from '@/constants/Strings';
import { ButtonSize, FontSize, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { CuratorStore } from '@/services/curator';

const S = Strings.curator;

interface Props {
  store: CuratorStore;
  onPress: (store: CuratorStore) => void;
}

export function StoreRow({ store, onPress }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const typeLabel = store.type ? S.storeTypes[store.type as keyof typeof S.storeTypes] ?? store.type : null;
  const meta = [store.area, typeLabel, store.basket_needed != null ? S.toPrice(store.basket_needed) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onPress(store)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.backgroundSecondary },
      ]}
      accessibilityRole="button"
      accessibilityLabel={S.storeLabel(store.store_name, store.area)}
    >
      <View style={styles.text}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {store.store_name}
        </ThemedText>
        {meta ? (
          <ThemedText style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {meta}
          </ThemedText>
        ) : null}
      </View>
      {store.distance_km != null ? (
        <ThemedText style={[styles.distance, { color: colors.textSecondary }]}>
          {S.distance(store.distance_km)}
        </ThemedText>
      ) : null}
      <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: ButtonSize.touch + Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  meta: {
    fontSize: FontSize.sm,
  },
  distance: {
    fontSize: FontSize.sm,
    fontVariant: ['tabular-nums'],
  },
});
