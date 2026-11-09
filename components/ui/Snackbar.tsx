import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ButtonSize, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';

export interface SnackbarMessage {
  /** Changes on every show, so the same text can appear twice in a row. */
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface Props {
  message: SnackbarMessage | null;
  onDismiss: () => void;
  /** Distance from the bottom of the screen. */
  bottom: number;
}

const VISIBLE_MS = 4000;
const FADE_MS = 160;

/** Brief confirmation with an optional action, e.g. "Added to your list · Undo". */
export function Snackbar({ message, onDismiss, bottom }: Props) {
  const colors = useColors();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => onDismiss());
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, opacity, onDismiss]);

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: colors.text, bottom, opacity }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <ThemedText style={[styles.text, { color: colors.background }]} numberOfLines={2}>{message.text}</ThemedText>
      {message.actionLabel && message.onAction ? (
        <Pressable
          onPress={() => {
            message.onAction?.();
            onDismiss();
          }}
          style={styles.action}
          hitSlop={Spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={message.actionLabel}
        >
          <ThemedText style={[styles.actionText, { color: colors.primaryContainer }]}>{message.actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    minHeight: ButtonSize.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: { ...Type.body, flex: 1, paddingVertical: Spacing.md },
  action: { minHeight: ButtonSize.touch, minWidth: ButtonSize.touch, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  actionText: { ...Type.headline },
});
