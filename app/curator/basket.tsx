import { useFocusEffect } from 'expo-router/react-navigation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BasketPriceSheet } from '@/components/curator/BasketPriceSheet';
import { BasketRow } from '@/components/curator/BasketRow';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { ChipRow } from '@/components/ui/ChipRow';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Snackbar } from '@/components/ui/Snackbar';
import { StateView } from '@/components/ui/StateView';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { useSnackbar } from '@/hooks/useSnackbar';
import { type BasketItem, type StoreBasket, getStoreBasket } from '@/services/curator';
import { type BasketFilter, filterBasket } from '@/utils/curator';

const S = Strings.curator;
const FILTERS: BasketFilter[] = ['todo', 'done', 'all'];

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; basket: StoreBasket };

/** The in-store hub: what in the core basket still needs a price here, priced by tap or by scan. */
export default function StoreBasketScreen() {
  const { storeId, storeName } = useLocalSearchParams<{ storeId: string; storeName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const snackbar = useSnackbar();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [filter, setFilter] = useState<BasketFilter>('todo');
  const [selected, setSelected] = useState<BasketItem | null>(null);
  const requestId = useRef(0);

  const fetchBasket = useCallback(async (): Promise<void> => {
    if (!storeId) return setLoad({ status: 'error' });
    const id = ++requestId.current;
    try {
      const basket = await getStoreBasket(storeId);
      if (id === requestId.current) setLoad({ status: 'ready', basket });
    } catch {
      if (id === requestId.current) setLoad({ status: 'error' });
    }
  }, [storeId]);

  // Reload on focus so prices scanned on the camera screen tick off here.
  useFocusEffect(
    useCallback(() => {
      fetchBasket();
    }, [fetchBasket]),
  );

  const sections = useMemo(
    () => (load.status === 'ready' ? filterBasket(load.basket.groups, filter).map((g) => ({ title: g.group, data: g.items })) : []),
    [load, filter],
  );

  const onSaved = (name: string) => {
    setSelected(null);
    snackbar.show(S.savedBasket(name));
    fetchBasket();
  };

  if (load.status === 'loading') return <StateView />;
  if (load.status === 'error') {
    return <StateView title={storeName ?? ''} body={S.basketLoadError} action={{ label: S.retry, onPress: () => { setLoad({ status: 'loading' }); fetchBasket(); } }} />;
  }

  const { summary } = load.basket;
  const todo = summary.needed + summary.outdated;
  const scan = () => router.push({ pathname: '/curator/scan', params: { storeId, storeName } });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.slot}
        renderItem={({ item }) => <BasketRow item={item} onPress={setSelected} />}
        renderSectionHeader={({ section }) => (
          <ThemedText style={[styles.section, { color: colors.textSecondary, backgroundColor: colors.background }]}>
            {section.title.toUpperCase()}
          </ThemedText>
        )}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.back} accessibilityRole="button" accessibilityLabel={S.back}>
              <IconSymbol name="chevron.left" size={22} color={colors.primary} />
            </Pressable>
            <ThemedText style={styles.title} accessibilityRole="header">{load.basket.store_name}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {S.basketSubtitle} · {S.basketSummary(todo, summary.done, summary.total)}
            </ThemedText>
            <View style={styles.scanRow}>
              <Button label={S.scanBarcodes} icon="barcode.viewfinder" onPress={scan} />
            </View>
            <View style={styles.filters}>
              <ChipRow
                options={FILTERS.map((f) => ({ key: f, label: S.basketFilters[f], accessibilityLabel: S.basketFilters[f] }))}
                selected={filter}
                onSelect={(key) => setFilter(key as BasketFilter)}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <ThemedText style={[styles.empty, { color: colors.textSecondary }]}>
            {filter === 'done' ? S.basketNoneDone : S.basketAllDone}
          </ThemedText>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
      />
      {selected ? (
        <BasketPriceSheet key={selected.slot} item={selected} storeId={storeId ?? ''} onClose={() => setSelected(null)} onSaved={onSaved} />
      ) : null}
      <Snackbar message={snackbar.message} onDismiss={snackbar.dismiss} bottom={insets.bottom + Spacing.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: Spacing.sm, paddingBottom: Spacing.md },
  back: { width: ButtonSize.touch, height: ButtonSize.touch, justifyContent: 'center', marginLeft: Spacing.sm },
  title: { ...Type.title, paddingHorizontal: Spacing.lg },
  subtitle: { ...Type.callout, paddingHorizontal: Spacing.lg },
  scanRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginTop: Spacing.xs },
  filters: { marginTop: Spacing.xs },
  section: { ...Type.caption, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  empty: { ...Type.body, textAlign: 'center', padding: Spacing.xxl },
});
