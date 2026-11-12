import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { Strings } from '@/constants/Strings';
import { ButtonSize, FontSize, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { addGooglePlace, searchGooglePlaces, type CuratorStore, type GooglePlace } from '@/services/curator';

const S = Strings.curator;

interface Props {
  /** The search already run against our stores (debounced by the screen). */
  query: string;
  position: { lat: number; lng: number } | null;
  /** Called with our store once the listing is added (or found already added). */
  onAdded: (store: CuratorStore) => void;
}

/** Google Maps listings for a search, for stores our list doesn't have yet. */
export function GooglePlacesSection({ query, position, onAdded }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState(false);

  const [attempt, setAttempt] = useState(0);

  // The screen remounts this section (key) for each search, so state starts fresh.
  useEffect(() => {
    let current = true;
    searchGooglePlaces({ q: query, lat: position?.lat, lng: position?.lng })
      .then((found) => current && setPlaces(found))
      .catch(() => current && setError(true))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [query, position, attempt]);

  const retry = (): void => {
    setLoading(true);
    setError(false);
    setAttempt((n) => n + 1);
  };

  const add = async (place: GooglePlace): Promise<void> => {
    if (adding) return;
    setAdding(place.place_id);
    setAddError(false);
    try {
      onAdded(await addGooglePlace(place));
    } catch {
      setAddError(true);
    } finally {
      setAdding(null);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: colors.textSecondary }]}>{S.fromGoogle.toUpperCase()}</ThemedText>
        <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>{S.fromGoogleHint}</ThemedText>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.status} color={colors.tint} />
      ) : error ? (
        <View style={styles.status}>
          <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>{S.googleError}</ThemedText>
          <Pressable onPress={retry} style={styles.retry} accessibilityRole="button" accessibilityLabel={S.retry}>
            <ThemedText style={[styles.retryText, { color: colors.tint }]}>{S.retry}</ThemedText>
          </Pressable>
        </View>
      ) : places.length === 0 ? (
        <ThemedText style={[styles.hint, styles.status, { color: colors.textSecondary }]}>{S.googleEmpty}</ThemedText>
      ) : (
        places.map((place) => {
          const busy = adding === place.place_id;
          const disabled = adding !== null;
          return (
            <Pressable
              key={place.place_id}
              onPress={() => add(place)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.backgroundSecondary },
                disabled && !busy && styles.dimmed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled, busy }}
              accessibilityLabel={S.addPlaceLabel(place.name, place.address)}
            >
              <View style={styles.text}>
                <ThemedText style={styles.name} numberOfLines={1}>{place.name}</ThemedText>
                <ThemedText style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={1}>{place.address}</ThemedText>
              </View>
              {place.distance_km != null ? (
                <ThemedText style={[styles.distance, { color: colors.textSecondary }]}>{S.distance(place.distance_km)}</ThemedText>
              ) : null}
              {busy ? <ActivityIndicator color={colors.tint} /> : <IconSymbol name="plus.circle.fill" size={22} color={colors.tint} />}
            </Pressable>
          );
        })
      )}

      {addError ? <ThemedText style={[styles.hint, styles.status, { color: colors.error }]}>{S.addPlaceError}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: Spacing.lg },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.xs },
  title: { fontSize: FontSize.xs, fontWeight: '600', letterSpacing: 0.6 },
  hint: { fontSize: FontSize.sm },
  status: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  retry: { minHeight: ButtonSize.touch, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  retryText: { fontSize: FontSize.md, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: ButtonSize.touch + Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, minWidth: 0 },
  name: { fontSize: FontSize.md, fontWeight: '600' },
  distance: { fontSize: FontSize.sm, fontVariant: ['tabular-nums'] },
  dimmed: { opacity: 0.5 },
});
