import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { PRIVACY_POLICY_URL, Strings, SUPPORT_EMAIL } from '@/constants/Strings';
import { ButtonSize, CardShadow, FontSize, Radius, Spacing } from '@/constants/Theme';
import { ThemePreference, useThemePreference } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { type Store, getStores } from '@/services/api';
import { getProfileId } from '@/services/shoppingList';

const S = Strings.profile;
const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

type StoresState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; stores: Store[] };

async function fetchStoresState(): Promise<StoresState> {
  try {
    return { status: 'success', stores: await getStores() };
  } catch {
    return { status: 'error' };
  }
}

export default function ProfileScreen() {
  const colors = Colors[useColorScheme() ?? 'light'];
  const { preference, setPreference } = useThemePreference();
  const [deviceId, setDeviceId] = useState('');
  const [storesState, setStoresState] = useState<StoresState>({ status: 'loading' });

  const appVersion = Constants.expoConfig?.version ?? '';

  useEffect(() => {
    fetchStoresState().then(setStoresState);
    getProfileId()
      .then(setDeviceId)
      .catch(() => {});
  }, []);

  const retryStores = () => {
    setStoresState({ status: 'loading' });
    fetchStoresState().then(setStoresState);
  };

  const contactSupport = async (): Promise<void> => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    } catch {
      Alert.alert(S.emailUnavailableTitle, S.emailUnavailableBody(SUPPORT_EMAIL));
    }
  };

  const openPrivacyPolicy = async (): Promise<void> => {
    try {
      await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(S.linkErrorTitle, S.linkErrorBody);
    }
  };

  const storesRowValue =
    storesState.status === 'loading'
      ? S.storesLoading
      : storesState.status === 'error'
        ? undefined
        : String(storesState.stores.length);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.title}>
          {S.title}
        </ThemedText>

        <View style={[styles.identityCard, { backgroundColor: colors.card }]}>
          <IconSymbol name="person.crop.circle.fill" size={56} color={colors.tint} />
          <View style={styles.identityText}>
            <ThemedText style={styles.identityName}>{S.guestName}</ThemedText>
            <ThemedText style={[styles.identitySubtitle, { color: colors.textSecondary }]}>
              {S.guestSubtitle}
            </ThemedText>
          </View>
        </View>

        <SettingsSection title={S.preferencesSection}>
          <SettingsRow
            icon="circle.lefthalf.filled"
            label={S.appearance}
            accessory={
              <View
                style={[styles.segmented, { backgroundColor: colors.backgroundSecondary }]}
                accessibilityRole="radiogroup"
                accessibilityLabel={S.appearance}
              >
                {THEME_OPTIONS.map((option) => {
                  const selected = preference === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setPreference(option)}
                      hitSlop={{ top: Spacing.sm, bottom: Spacing.sm }}
                      style={[styles.segment, selected && [styles.segmentActive, { backgroundColor: colors.card }]]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={S.appearanceOptions[option]}
                    >
                      <ThemedText
                        style={[
                          styles.segmentText,
                          { color: selected ? colors.text : colors.textSecondary },
                          selected && styles.segmentTextActive,
                        ]}
                      >
                        {S.appearanceOptions[option]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            }
          />
        </SettingsSection>

        <SettingsSection title={S.supportSection}>
          <SettingsRow icon="envelope" label={S.contactSupport} onPress={contactSupport} />
          <SettingsRow icon="lock.shield" label={S.privacyPolicy} onPress={openPrivacyPolicy} />
        </SettingsSection>

        <SettingsSection title={S.aboutSection}>
          <ThemedText style={[styles.aboutBody, { color: colors.textSecondary }]}>
            {S.aboutBody}
          </ThemedText>
          <SettingsRow
            icon="storefront"
            label={S.storesWeCompare}
            value={storesRowValue}
            onPress={storesState.status === 'error' ? retryStores : undefined}
          />
          {storesState.status === 'error' ? (
            <ThemedText style={[styles.storeNames, { color: colors.error }]}>
              {S.storesError}
            </ThemedText>
          ) : null}
          {storesState.status === 'success' ? (
            <ThemedText style={[styles.storeNames, { color: colors.textSecondary }]}>
              {storesState.stores.length > 0
                ? storesState.stores.map((s) => s.store_name).join(' · ')
                : S.storesEmpty}
            </ThemedText>
          ) : null}
          <SettingsRow icon="info.circle" label={S.version} value={appVersion} />
        </SettingsSection>

        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: colors.textTertiary }]}>
            {S.disclaimer}
          </ThemedText>
          {deviceId ? (
            <ThemedText selectable style={[styles.footerText, { color: colors.textTertiary }]}>
              {S.deviceId(deviceId)}
            </ThemedText>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingTop: Spacing.headerTop,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.xl,
  },
  title: {
    marginBottom: -Spacing.sm,
  },
  identityCard: {
    ...CardShadow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.md,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  identityName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  identitySubtitle: {
    fontSize: FontSize.sm,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    padding: 2,
  },
  segment: {
    minHeight: ButtonSize.small - Spacing.xs,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderRadius: Radius.sm - 2,
  },
  segmentActive: {
    ...CardShadow,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  segmentTextActive: {
    fontWeight: '600',
  },
  aboutBody: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    padding: Spacing.lg,
  },
  storeNames: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  footer: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    textAlign: 'center',
  },
});
