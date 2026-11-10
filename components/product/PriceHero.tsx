import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Tag } from '@/components/ui/Tag';
import { Strings } from '@/constants/Strings';
import { Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import type { Product } from '@/services/api';
import { formatPrice } from '@/utils/format';
import { comparesPerPound, estimateByWeight, formatAge, unitPrice, weightAmounts, type PriceSummary } from '@/utils/prices';

interface Props {
  product: Product;
  summary: PriceSummary;
}

const S = Strings.product;

/** Lowest price and where to get it, with the estimate, store count and unit price beneath. */
export function PriceHero({ product, summary }: Props) {
  const colors = useColors();
  const lowest = summary.lowest;
  const multiStore = summary.rows.length > 1;
  const byWeight = lowest ? weightAmounts(lowest.price) : null;
  const unit = lowest && !byWeight ? unitPrice(lowest.price.amount, product.size, comparesPerPound(product)) : null;
  const estimate = estimateByWeight(product);
  const age = formatAge(lowest?.ageDays ?? null);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {lowest ? (
        <View style={styles.top}>
          <View style={styles.main}>
            <ThemedText style={[styles.caption, { color: colors.textSecondary }]}>
              {(multiStore ? S.lowestPrice : S.price).toUpperCase()}
            </ThemedText>
            <ThemedText style={styles.amount} accessibilityRole="header">
              {formatPrice(byWeight ? byWeight.lb : lowest.price.amount, lowest.price.currency)}
              {byWeight ? <ThemedText style={[styles.perWeight, { color: colors.textSecondary }]}>{` ${S.perWeight.lb}`}</ThemedText> : null}
            </ThemedText>
            {byWeight ? (
              <ThemedText style={[styles.perKg, { color: colors.textSecondary }]}>
                {`${formatPrice(byWeight.kg, lowest.price.currency)} ${S.perWeight.kg}`}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.where}>
              {S.at}
              <ThemedText style={styles.store}>{lowest.price.store_name ?? lowest.price.location_id}</ThemedText>
              {age ? ` · ${S.updated(age)}` : ''}
            </ThemedText>
          </View>
          {summary.savings ? (
            <Tag tone="positive" icon="arrow.down.right" label={S.save(formatPrice(summary.savings, lowest.price.currency))} />
          ) : null}
        </View>
      ) : null}

      {lowest ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}

      <View style={styles.stats}>
        {estimate ? (
          <Stat
            value={`${formatPrice(estimate.lb)} ${S.perWeight.lb}`}
            label={S.estimateAlso(`${formatPrice(estimate.kg)} ${S.perWeight.kg}`)}
          />
        ) : (
          <Stat value={formatPrice(product.estimated_price)} label={S.estimate} />
        )}
        <Stat value={String(summary.rows.length)} label={S.stores(summary.rows.length)} />
        {unit ? <Stat value={formatPrice(unit.amount)} label={S.per(unit.per)} /> : null}
      </View>
    </View>
  );
}

interface StatProps {
  value: string;
  label: string;
}

function Stat({ value, label }: StatProps) {
  const colors = useColors();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  main: { flex: 1 },
  caption: { ...Type.caption },
  amount: { ...Type.display, fontVariant: ['tabular-nums'] },
  perWeight: { ...Type.headline },
  perKg: { ...Type.body, fontVariant: ['tabular-nums'] },
  where: { ...Type.body },
  store: { ...Type.body, fontFamily: Fonts.semibold },
  divider: { height: StyleSheet.hairlineWidth },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: { flex: 1 },
  statValue: { ...Type.headline, fontFamily: Fonts.displayBold, fontVariant: ['tabular-nums'] },
  statLabel: { ...Type.callout },
});
