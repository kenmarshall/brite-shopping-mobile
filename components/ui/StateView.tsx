import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';

interface Props {
  /** Omit for a loading spinner. */
  title?: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

/** Full-screen loading, empty or error state. */
export function StateView({ title, body, action }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {title ? (
        <>
          <ThemedText style={styles.title} accessibilityRole="header">{title}</ThemedText>
          {body ? <ThemedText style={[styles.body, { color: colors.textSecondary }]}>{body}</ThemedText> : null}
          {action ? (
            <View style={styles.action}>
              <Button label={action.label} onPress={action.onPress} />
            </View>
          ) : null}
        </>
      ) : (
        <ActivityIndicator size="large" color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  title: { ...Type.title, textAlign: 'center' },
  body: { ...Type.body, textAlign: 'center' },
  action: { flexDirection: 'row', alignSelf: 'stretch', marginTop: Spacing.lg },
});
