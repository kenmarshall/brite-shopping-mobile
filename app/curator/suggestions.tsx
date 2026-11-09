import { useFocusEffect } from 'expo-router/react-navigation';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuggestionCard } from '@/components/curator/SuggestionCard';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Snackbar } from '@/components/ui/Snackbar';
import { StateView } from '@/components/ui/StateView';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { useSnackbar } from '@/hooks/useSnackbar';
import { type Suggestion, type SuggestionAction, listSuggestions, reviewSuggestion } from '@/services/curator';

const S = Strings.curator;

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; suggestions: Suggestion[] };

/** Curator review queue for shopper suggestions. Nothing changes in the catalog until it's applied here. */
export default function SuggestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const snackbar = useSnackbar();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchSuggestions = useCallback(async (): Promise<void> => {
    const id = ++requestId.current;
    try {
      const suggestions = await listSuggestions();
      if (id === requestId.current) setLoad({ status: 'ready', suggestions });
    } catch {
      if (id === requestId.current) setLoad({ status: 'error' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSuggestions();
    }, [fetchSuggestions]),
  );

  const review = async (suggestion: Suggestion, action: SuggestionAction): Promise<void> => {
    if (busyId) return;
    setBusyId(suggestion._id);
    try {
      await reviewSuggestion(suggestion._id, action);
      setLoad((l) => (l.status === 'ready' ? { status: 'ready', suggestions: l.suggestions.filter((s) => s._id !== suggestion._id) } : l));
      snackbar.show(action === 'apply' ? S.applied : S.dismissed);
    } catch {
      snackbar.show(S.reviewError);
    } finally {
      setBusyId(null);
    }
  };

  if (load.status === 'loading') return <StateView />;
  if (load.status === 'error') {
    return <StateView title={S.suggestionsTitle} body={S.suggestionsLoadError} action={{ label: S.retry, onPress: () => { setLoad({ status: 'loading' }); fetchSuggestions(); } }} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={load.suggestions}
        keyExtractor={(s) => s._id}
        renderItem={({ item }) => (
          <View style={styles.padded}>
            <SuggestionCard suggestion={item} busy={busyId === item._id} onReview={review} />
          </View>
        )}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.back} accessibilityRole="button" accessibilityLabel={S.back}>
              <IconSymbol name="chevron.left" size={22} color={colors.primary} />
            </Pressable>
            <ThemedText style={[styles.title, styles.padded]} accessibilityRole="header">{S.suggestionsTitle}</ThemedText>
            <ThemedText style={[styles.subtitle, styles.padded, { color: colors.textSecondary }]}>
              {S.suggestionsSubtitle(load.suggestions.length)}
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={styles.emptyTitle}>{S.noSuggestionsTitle}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>{S.noSuggestionsBody}</ThemedText>
          </View>
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
      />
      <Snackbar message={snackbar.message} onDismiss={snackbar.dismiss} bottom={insets.bottom + Spacing.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: Spacing.md },
  header: { gap: Spacing.xs, paddingBottom: Spacing.sm },
  back: { width: ButtonSize.touch, height: ButtonSize.touch, justifyContent: 'center', marginLeft: Spacing.sm },
  padded: { paddingHorizontal: Spacing.lg },
  title: { ...Type.title },
  subtitle: { ...Type.callout },
  empty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { ...Type.headline },
});
