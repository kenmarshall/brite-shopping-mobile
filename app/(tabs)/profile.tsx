import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { FontSize, Radius, Spacing } from '@/constants/Theme';
import { ThemePreference, useThemePreference } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getProfileId } from '@/services/shoppingList';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { preference, setPreference } = useThemePreference();
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    getProfileId().then(setDeviceId);
  }, []);

  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Profile</ThemedText>
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.cardTitle}>Device Info</ThemedText>

          <View style={styles.row}>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Device ID</ThemedText>
            <ThemedText style={styles.value} numberOfLines={1}>
              {deviceId || 'Loading...'}
            </ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>App Version</ThemedText>
            <ThemedText style={styles.value}>{appVersion}</ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Shopping List</ThemedText>
            <ThemedText style={styles.value}>Stored locally + server sync</ThemedText>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.cardTitle}>Account</ThemedText>
          <ThemedText style={[styles.placeholder, { color: colors.textSecondary }]}>
            Sign up and subscription features coming soon. Your shopping list is currently tied to this device.
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.cardTitle}>Settings</ThemedText>

          <View style={styles.row}>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Appearance</ThemedText>
            <View style={[styles.segmented, { backgroundColor: colors.background }]}>
              {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setPreference(option)}
                  style={[
                    styles.segment,
                    preference === option && [styles.segmentActive, { backgroundColor: colors.card }],
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.segmentText,
                      { color: colors.textSecondary },
                      preference === option && { color: colors.text, fontWeight: '600' },
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.cardTitle}>About</ThemedText>
          <ThemedText style={[styles.placeholder, { color: colors.textSecondary }]}>
            Brite Shopping helps you find products, compare prices across stores, and shop economically.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.headerTop,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  value: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    flexShrink: 1,
    maxWidth: '60%',
    textAlign: 'right',
  },
  placeholder: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    padding: 2,
  },
  segment: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm - 1,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
