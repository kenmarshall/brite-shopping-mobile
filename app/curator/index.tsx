import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GooglePlacesSection } from '@/components/curator/GooglePlacesSection';
import { StoreRow } from '@/components/curator/StoreRow';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { Strings } from '@/constants/Strings';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { listCuratorStores, type CuratorStore } from '@/services/curator';

const S = Strings.curator;
const SEARCH_DEBOUNCE_MS = 400;

type Position = { lat: number; lng: number } | null;
// Shorter searches are too broad to send to Google.
const MIN_GOOGLE_QUERY = 2;

export default function PickStoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const [position, setPosition] = useState<Position | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<CuratorStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve location once; a denial still lets the curator browse and search.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return setPosition(null);
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        setPosition(null);
      }
    })();
  }, []);

  const load = useCallback(async (q: string, pos: Position): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      setStores(await listCuratorStores({ lat: pos?.lat, lng: pos?.lng, q }));
      setSearched(q.trim());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (position === undefined) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(query, position), query ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, position, load]);

  const openStore = (store: CuratorStore) =>
    router.push({ pathname: '/curator/basket', params: { storeId: store.store_id, storeName: store.store_name } });
  const searchingGoogle = searched.length >= MIN_GOOGLE_QUERY;

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.back} accessibilityRole="button" accessibilityLabel={S.back}>
          <IconSymbol name="chevron.left" size={22} color={colors.tint} />
        </Pressable>
        <ThemedText style={styles.title} accessibilityRole="header">{S.pickStoreTitle}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>{S.pickStoreSubtitle}</ThemedText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={S.searchStores}
          placeholderTextColor={colors.placeholderText}
          accessibilityLabel={S.searchStores}
          returnKeyType="search"
          style={[styles.search, { color: colors.text, backgroundColor: colors.backgroundSecondary }]}
        />
        {position === null ? (
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>{S.locationOff}</ThemedText>
        ) : null}
      </View>

      <Pressable
        onPress={() => router.push('/curator/new-store')}
        style={({ pressed }) => [styles.addRow, { borderColor: colors.border }, pressed && { backgroundColor: colors.backgroundSecondary }]}
        accessibilityRole="button"
        accessibilityLabel={S.addStore}
      >
        <IconSymbol name="mappin.and.ellipse" size={22} color={colors.tint} />
        <View style={styles.addText}>
          <ThemedText style={[styles.addTitle, { color: colors.tint }]}>{S.addStore}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>{S.addStoreHint}</ThemedText>
        </View>
      </Pressable>

      {loading || position === undefined ? (
        <ActivityIndicator style={styles.center} size="large" color={colors.tint} />
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.subtitle}>{S.loadError}</ThemedText>
          <Pressable onPress={() => load(query, position)} style={[styles.retry, { backgroundColor: colors.tint }]} accessibilityRole="button">
            <ThemedText style={[styles.retryText, { color: colors.onTint }]}>{S.retry}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(s) => s.store_id}
          renderItem={({ item }) => <StoreRow store={item} onPress={openStore} />}
          ListHeaderComponent={
            <ThemedText style={[styles.section, { color: colors.textSecondary }]}>
              {(position ? S.nearYou : S.allStores).toUpperCase()}
            </ThemedText>
          }
          ListEmptyComponent={<ThemedText style={[styles.empty, { color: colors.textSecondary }]}>{S.noStores}</ThemedText>}
          ListFooterComponent={
            searchingGoogle && position !== undefined ? (
              <GooglePlacesSection key={searched} query={searched} position={position} onAdded={openStore} />
            ) : undefined
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  back: { width: ButtonSize.touch, height: ButtonSize.touch, justifyContent: 'center', marginLeft: -Spacing.sm },
  title: { fontSize: FontSize.hero, fontWeight: '800', lineHeight: FontSize.hero + Spacing.sm },
  subtitle: { fontSize: FontSize.sm },
  search: { minHeight: ButtonSize.touch, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: FontSize.md, marginTop: Spacing.xs },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
  },
  addText: { flex: 1 },
  addTitle: { fontSize: FontSize.md, fontWeight: '700' },
  section: { fontSize: FontSize.xs, fontWeight: '600', letterSpacing: 0.6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  retry: { minHeight: ButtonSize.touch, paddingHorizontal: Spacing.xl, borderRadius: Radius.md, justifyContent: 'center' },
  retryText: { fontSize: FontSize.md, fontWeight: '700' },
  empty: { textAlign: 'center', padding: Spacing.xl, fontSize: FontSize.md },
});
