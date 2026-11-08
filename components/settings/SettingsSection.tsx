import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ROW_ICON_TILE } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { CardShadow, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Props {
  title?: string;
  children: ReactNode;
}

/** Inset grouped list section: optional uppercase title over a rounded card of rows. */
export function SettingsSection({ title, children }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const rows = Children.toArray(children);

  return (
    <View style={styles.section}>
      {title ? (
        <ThemedText
          style={[styles.title, { color: colors.textSecondary }]}
          accessibilityRole="header"
        >
          {title.toUpperCase()}
        </ThemedText>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    ...CardShadow,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    // Inset to align with row labels, past the icon tile
    marginLeft: Spacing.lg + ROW_ICON_TILE + Spacing.md,
  },
});
