import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Strings } from '@/constants/Strings';
import { Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import type { Suggestion, SuggestionAction } from '@/services/curator';
import { daysSince, formatAge } from '@/utils/prices';
import { suggestionChanges } from '@/utils/suggestions';

const S = Strings.curator;

interface Props {
  suggestion: Suggestion;
  busy: boolean;
  onReview: (suggestion: Suggestion, action: SuggestionAction) => void;
}

/** One shopper suggestion: what it would change, and Apply / Dismiss. */
export function SuggestionCard({ suggestion, busy, onReview }: Props) {
  const colors = useColors();
  const changes = suggestionChanges(suggestion.fields, suggestion.current);
  const title = suggestion.product_name ?? suggestion.fields.name ?? '';
  const age = formatAge(daysSince(suggestion.created_at, new Date()));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Tag label={S.suggestionKinds[suggestion.kind]} tone={suggestion.kind === 'wrong_price' ? 'caution' : 'neutral'} />
        {age ? <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{S.suggestionAge(age)}</ThemedText> : null}
      </View>
      <ThemedText style={styles.title} numberOfLines={2}>{title}</ThemedText>
      {changes.map((c) => (
        <View key={c.field} style={styles.change}>
          <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{S.suggestionField[c.field]}</ThemedText>
          {c.field === 'image_url' ? (
            <ThemedText style={styles.body}>{S.newPhoto}</ThemedText>
          ) : (
            <>
              {c.before ? <ThemedText style={[styles.body, styles.before, { color: colors.textSecondary }]}>{c.before}</ThemedText> : null}
              <ThemedText style={[styles.body, styles.after]}>{c.after}</ThemedText>
            </>
          )}
        </View>
      ))}
      {suggestion.barcode ? <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{S.suggestionBarcode(suggestion.barcode)}</ThemedText> : null}
      {suggestion.note ? <ThemedText style={styles.body}>“{suggestion.note}”</ThemedText> : null}
      <View style={styles.actions}>
        <Button label={S.dismiss} variant="secondary" onPress={() => onReview(suggestion, 'dismiss')} disabled={busy} />
        <Button
          label={suggestion.kind === 'wrong_price' ? S.markChecked : S.apply}
          onPress={() => onReview(suggestion, 'apply')}
          busy={busy}
          disabled={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...Type.headline },
  change: { gap: Spacing.xs / 2 },
  meta: { ...Type.caption },
  body: { ...Type.body },
  before: { textDecorationLine: 'line-through' },
  after: { fontFamily: Fonts.semibold },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
