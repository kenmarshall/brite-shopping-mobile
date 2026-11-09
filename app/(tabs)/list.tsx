import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { type ReactNode, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListItemRow } from '@/components/list/ListItemRow';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Snackbar } from '@/components/ui/Snackbar';
import { StateView } from '@/components/ui/StateView';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useSnackbar } from '@/hooks/useSnackbar';
import {
  type ShoppingList,
  type ShoppingListItem,
  calculateTotal,
  clearChecked,
  clearList,
  restoreList,
  setChecked,
  updateQuantity,
} from '@/services/shoppingList';
import { formatPrice } from '@/utils/format';

const S = Strings.list;

export default function ShoppingListScreen() {
  const list = useShoppingList();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The tab bar floats over content only on iOS (see the tabs layout).
  const tabBarHeight = useBottomTabBarHeight();
  const barInset = Platform.OS === 'ios' ? tabBarHeight : 0;
  const colors = useColors();
  const snackbar = useSnackbar();
  const busy = useRef(false);

  /** Runs one list change at a time; a failed change shows an error instead of throwing. */
  const run = async (change: () => Promise<unknown>): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    try {
      await change();
    } catch {
      snackbar.show(S.error);
    } finally {
      busy.current = false;
    }
  };

  /** A change that can be undone by putting the current list back. */
  const runUndoable = (text: string, change: () => Promise<unknown>) => {
    const snapshot: ShoppingList = list ?? [];
    run(async () => {
      await change();
      snackbar.show(text, { label: S.undo, onPress: () => run(() => restoreList(snapshot)) });
    });
  };

  const onQuantity = (item: ShoppingListItem, quantity: number) => {
    if (quantity <= 0) runUndoable(S.removed(item.name), () => updateQuantity(item.productId, 0));
    else run(() => updateQuantity(item.productId, quantity));
  };
  const onToggle = (item: ShoppingListItem) => run(() => setChecked(item.productId, !item.checked));
  const onOpen = (item: ShoppingListItem) => router.push({ pathname: '/product/[id]', params: { id: item.productId } });

  if (list === null) return <StateView />;
  if (list.length === 0) {
    return (
      <>
        <StateView title={S.emptyTitle} body={S.emptyBody} action={{ label: S.findProducts, onPress: () => router.push('/') }} />
        <Snackbar message={snackbar.message} onDismiss={snackbar.dismiss} bottom={barInset + Spacing.sm} />
      </>
    );
  }

  const toGet = list.filter((i) => !i.checked);
  const inCart = list.filter((i) => i.checked);
  const footerHeight = ButtonSize.large + Spacing.lg * 2;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.sm, paddingBottom: barInset + footerHeight + Spacing.lg }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText style={styles.title} accessibilityRole="header">{S.title}</ThemedText>
            <ThemedText style={[styles.summary, { color: colors.textSecondary }]}>{S.summary(list.length, inCart.length)}</ThemedText>
          </View>
          <Pressable
            onPress={() => runUndoable(S.cleared, clearList)}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={S.clearAll}
          >
            <IconSymbol name="trash" size={20} color={colors.text} />
          </Pressable>
        </View>

        {toGet.length > 0 ? (
          <Card>
            {toGet.map((item, i) => (
              <View key={item.productId}>
                {i > 0 ? <Divider /> : null}
                <ListItemRow item={item} onToggle={onToggle} onQuantity={onQuantity} onOpen={onOpen} />
              </View>
            ))}
          </Card>
        ) : (
          <View style={[styles.done, { backgroundColor: colors.positiveContainer }]}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.positive} />
            <ThemedText style={[styles.doneText, { color: colors.positive }]}>{S.allInCart}</ThemedText>
          </View>
        )}

        {inCart.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.caption, { color: colors.textSecondary }]}>{S.inCart(inCart.length).toUpperCase()}</ThemedText>
              <Pressable
                onPress={() => runUndoable(S.clearedChecked, clearChecked)}
                hitSlop={Spacing.sm}
                style={styles.textButton}
                accessibilityRole="button"
                accessibilityLabel={S.clearChecked}
              >
                <ThemedText style={[styles.textButtonLabel, { color: colors.primaryStrong }]}>{S.clearChecked}</ThemedText>
              </Pressable>
            </View>
            <Card>
              {inCart.map((item, i) => (
                <View key={item.productId}>
                  {i > 0 ? <Divider /> : null}
                  <ListItemRow item={item} onToggle={onToggle} onQuantity={onQuantity} onOpen={onOpen} />
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { bottom: barInset, backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View>
          <ThemedText style={[styles.footerLabel, { color: colors.textSecondary }]}>{S.stillToGet}</ThemedText>
          <ThemedText style={styles.footerAmount}>{formatPrice(calculateTotal(toGet))}</ThemedText>
        </View>
        <View style={styles.footerRight}>
          <ThemedText style={[styles.footerLabel, { color: colors.textSecondary }]}>{S.estimatedTotal}</ThemedText>
          <ThemedText style={styles.footerTotal}>{formatPrice(calculateTotal(list))}</ThemedText>
        </View>
      </View>

      <Snackbar message={snackbar.message} onDismiss={snackbar.dismiss} bottom={barInset + footerHeight + Spacing.sm} />
    </View>
  );
}

interface CardProps {
  children: ReactNode;
}

function Card({ children }: CardProps) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  headerText: { flex: 1 },
  title: { ...Type.display },
  summary: { ...Type.body },
  iconButton: { width: ButtonSize.touch, height: ButtonSize.touch, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: Spacing.lg, borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: ButtonSize.touch + Spacing.xs },
  done: { marginHorizontal: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  doneText: { ...Type.headline },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: -Spacing.sm },
  caption: { ...Type.caption },
  textButton: { minHeight: ButtonSize.touch, justifyContent: 'center' },
  textButtonLabel: { ...Type.callout, fontFamily: Fonts.semibold },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: ButtonSize.large + Spacing.lg * 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRight: { alignItems: 'flex-end' },
  footerLabel: { ...Type.callout },
  footerAmount: { ...Type.section, fontVariant: ['tabular-nums'] },
  footerTotal: { ...Type.headline, fontFamily: Fonts.displayBold, fontVariant: ['tabular-nums'] },
});
