import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Tag } from '@/components/ui/Tag';
import { Strings } from '@/constants/Strings';
import { Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { formatPrice } from '@/utils/format';
import { formatAge, weightAmounts, type StorePrice } from '@/utils/prices';

interface Props {
  rows: StorePrice[];
}

const S = Strings.product;

/** Every store's price, lowest first; old prices are marked as possibly outdated. */
export function StorePriceList({ rows }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {rows.map((row, i) => (
        <View key={row.price.location_id}>
          {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          <StoreRow row={row} highlight={row.isLowest && rows.length > 1} />
        </View>
      ))}
    </View>
  );
}

interface RowProps {
  row: StorePrice;
  highlight: boolean;
}

function StoreRow({ row, highlight }: RowProps) {
  const colors = useColors();
  const { price } = row;
  const store = price.store_name ?? price.location_id;
  const byWeight = weightAmounts(price);
  const amount = byWeight ? `${formatPrice(byWeight.lb, price.currency)} ${S.perWeight.lb}` : formatPrice(price.amount, price.currency);
  const perKg = byWeight ? `${formatPrice(byWeight.kg, price.currency)} ${S.perWeight.kg}` : null;
  const age = formatAge(row.ageDays);
  const kind = price.source === 'scan' ? S.shelfPrice : S.onlinePrice;
  const note = row.isStale && age ? `${age} · ${S.outdated}` : [kind, age].filter(Boolean).join(' · ');

  return (
    <View
      style={[styles.row, highlight && { backgroundColor: colors.positiveContainer }]}
      accessible
      accessibilityLabel={S.storePriceLabel(store, perKg ? S.bothWeights(amount, perKg) : amount, note)}
    >
      <View style={styles.info}>
        <ThemedText style={styles.store} numberOfLines={1}>{store}</ThemedText>
        <View style={styles.noteRow}>
          {row.isStale ? <IconSymbol name="clock" size={13} color={colors.caution} /> : null}
          <ThemedText style={[styles.note, { color: row.isStale ? colors.caution : colors.textSecondary }]} numberOfLines={1}>
            {note}
          </ThemedText>
        </View>
      </View>
      <View style={styles.right}>
        <ThemedText style={[styles.amount, highlight && { color: colors.positive }]}>{amount}</ThemedText>
        {perKg ? <ThemedText style={[styles.sub, { color: colors.textSecondary }]}>{perKg}</ThemedText> : null}
        {highlight ? (
          <Tag tone="positive" label={S.lowest} />
        ) : row.diffFromLowest > 0 ? (
          <ThemedText style={[styles.sub, { color: colors.textSecondary }]}>
            {S.moreThanLowest(formatPrice(row.diffFromLowest, price.currency))}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  info: { flex: 1, gap: Spacing.xs / 2 },
  store: { ...Type.body, fontFamily: Fonts.semibold },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  note: { ...Type.callout, flexShrink: 1 },
  right: { alignItems: 'flex-end', gap: Spacing.xs },
  amount: { ...Type.headline, fontFamily: Fonts.displayBold, fontVariant: ['tabular-nums'] },
  sub: { ...Type.callout, fontVariant: ['tabular-nums'] },
});
