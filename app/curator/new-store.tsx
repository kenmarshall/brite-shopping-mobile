import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { Strings } from '@/constants/Strings';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { createCuratorStore, type StoreType } from '@/services/curator';

const S = Strings.curator;
const TYPES = Object.keys(S.storeTypes) as StoreType[];

type Fix = { status: 'locating' } | { status: 'denied' } | { status: 'ready'; lat: number; lng: number };

export default function NewStoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const [fix, setFix] = useState<Fix>({ status: 'locating' });
  const [name, setName] = useState('');
  const [type, setType] = useState<StoreType>('stall');
  const [area, setArea] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return setFix({ status: 'denied' });
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setFix({ status: 'ready', lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        setFix({ status: 'denied' });
      }
    })();
  }, []);

  const canSave = fix.status === 'ready' && name.trim().length > 1 && !saving;

  const save = async (): Promise<void> => {
    if (!canSave || fix.status !== 'ready') return;
    setSaving(true);
    setError(null);
    try {
      const store = await createCuratorStore({
        store_name: name.trim(),
        type,
        latitude: fix.lat,
        longitude: fix.lng,
        area: area.trim() || undefined,
      });
      router.replace({ pathname: '/curator/scan', params: { storeId: store.store_id, storeName: store.store_name } });
    } catch {
      setError(S.saveStoreError);
    } finally {
      setSaving(false);
    }
  };

  const input = [styles.input, { color: colors.text, backgroundColor: colors.backgroundSecondary }];

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + Spacing.sm }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.back} accessibilityRole="button" accessibilityLabel={S.back}>
            <IconSymbol name="chevron.left" size={22} color={colors.tint} />
          </Pressable>
          <ThemedText style={styles.title} accessibilityRole="header">{S.newStoreTitle}</ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.label}>{S.storeName}</ThemedText>
            <TextInput value={name} onChangeText={setName} placeholder={S.storeNamePlaceholder} placeholderTextColor={colors.placeholderText}
              accessibilityLabel={S.storeName} style={input} autoFocus />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>{S.storeType}</ThemedText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {TYPES.map((t) => (
                <Pressable key={t} onPress={() => setType(t)} accessibilityRole="radio" accessibilityState={{ checked: t === type }}
                  style={[styles.chip, { borderColor: t === type ? colors.tint : colors.border }, t === type && { backgroundColor: colors.tint }]}>
                  <ThemedText style={[styles.chipText, { color: t === type ? colors.onTint : colors.text }]}>{S.storeTypes[t]}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>{S.area}</ThemedText>
            <TextInput value={area} onChangeText={setArea} placeholder={S.areaPlaceholder} placeholderTextColor={colors.placeholderText}
              accessibilityLabel={S.area} style={input} />
          </View>

          <View style={styles.pin}>
            {fix.status === 'locating' ? <ActivityIndicator color={colors.tint} /> : (
              <IconSymbol name="location.fill" size={18} color={fix.status === 'ready' ? colors.tint : colors.error} />
            )}
            <ThemedText style={[styles.pinText, { color: fix.status === 'denied' ? colors.error : colors.textSecondary }]}>
              {fix.status === 'locating' ? S.gettingLocation : fix.status === 'denied' ? S.locationNeeded : S.pinNote}
            </ThemedText>
          </View>

          {error ? <ThemedText style={[styles.pinText, { color: colors.error }]}>{error}</ThemedText> : null}

          <Pressable onPress={save} disabled={!canSave} accessibilityRole="button" accessibilityState={{ disabled: !canSave, busy: saving }}
            style={[styles.primary, { backgroundColor: colors.tint }, !canSave && styles.dimmed]}>
            {saving ? <ActivityIndicator color={colors.onTint} /> : (
              <ThemedText style={[styles.primaryText, { color: colors.onTint }]}>{S.saveStore}</ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  back: { width: ButtonSize.touch, height: ButtonSize.touch, justifyContent: 'center', marginLeft: -Spacing.sm },
  title: { fontSize: FontSize.hero, fontWeight: '800', lineHeight: FontSize.hero + Spacing.sm },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '600' },
  input: { minHeight: ButtonSize.touch, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: FontSize.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { minHeight: ButtonSize.touch, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: FontSize.sm, fontWeight: '600' },
  pin: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pinText: { fontSize: FontSize.sm, flex: 1 },
  primary: { minHeight: ButtonSize.touch + Spacing.xs, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: FontSize.md, fontWeight: '700' },
  dimmed: { opacity: 0.6 },
});
