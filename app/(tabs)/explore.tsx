import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ButtonSize, CardShadow, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  type ShoppingList,
  type ShoppingListItem,
  calculateTotal,
  clearList,
  getShoppingList,
  removeFromList,
  updateQuantity,
} from '@/services/shoppingList';
import { formatPrice } from '@/utils/format';

export default function ShoppingListScreen() {
  const [list, setList] = useState<ShoppingList>([]);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const loadList = useCallback(async () => {
    const items = await getShoppingList();
    setList(items);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Reload when screen gains focus (coming back from product detail)
  useEffect(() => {
    const interval = setInterval(loadList, 2000);
    return () => clearInterval(interval);
  }, [loadList]);

  const handleIncrement = async (productId: string, current: number) => {
    const updated = await updateQuantity(productId, current + 1);
    setList(updated);
  };

  const handleDecrement = async (productId: string, current: number) => {
    if (current <= 1) {
      const updated = await removeFromList(productId);
      setList(updated);
    } else {
      const updated = await updateQuantity(productId, current - 1);
      setList(updated);
    }
  };

  const handleClear = () => {
    Alert.alert('Clear List', 'Remove all items from your shopping list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const updated = await clearList();
          setList(updated);
        },
      },
    ]);
  };

  const total = calculateTotal(list);
  const itemCount = list.reduce((sum, i) => sum + i.quantity, 0);

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() =>
        router.push({ pathname: '/product/[id]', params: { id: item.productId } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatPrice(item.estimatedPrice)}, quantity ${item.quantity}`}
    >
      {item.imageUrl && !item.imageUrl.startsWith('data:image/svg') ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
      ) : (
        <View style={[styles.itemImage, { backgroundColor: colors.placeholder }]}>
          <ThemedText style={{ fontSize: FontSize.xs, color: colors.placeholderText }}>
            No Image
          </ThemedText>
        </View>
      )}
      <View style={styles.itemContent}>
        <ThemedText style={styles.itemName} numberOfLines={2}>{item.name}</ThemedText>
        <ThemedText style={[styles.itemPrice, { color: colors.tint }]}>
          {formatPrice(item.estimatedPrice)}
          {item.quantity > 1 ? ` x ${item.quantity}` : ''}
        </ThemedText>
      </View>
      <View style={styles.quantityControls}>
        <Pressable
          style={[styles.qtyButton, { backgroundColor: colors.tint }]}
          onPress={() => handleDecrement(item.productId, item.quantity)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Decrease quantity of ${item.name}`}
        >
          <ThemedText style={styles.qtyButtonText}>-</ThemedText>
        </Pressable>
        <ThemedText style={styles.qtyValue}>{item.quantity}</ThemedText>
        <Pressable
          style={[styles.qtyButton, { backgroundColor: colors.tint }]}
          onPress={() => handleIncrement(item.productId, item.quantity)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Increase quantity of ${item.name}`}
        >
          <ThemedText style={styles.qtyButtonText}>+</ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Shopping List</ThemedText>
        {list.length > 0 && (
          <Pressable
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Clear all items from shopping list"
          >
            <ThemedText style={[styles.clearText, { color: colors.error }]}>Clear All</ThemedText>
          </Pressable>
        )}
      </View>

      {list.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyIcon}>🛒</ThemedText>
          <ThemedText style={styles.emptyTitle}>Your list is empty</ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add products from the search tab to start building your shopping list
          </ThemedText>
        </View>
      ) : (
        <>
          <FlatList
            data={list}
            renderItem={renderItem}
            keyExtractor={(item) => item.productId}
            contentContainerStyle={styles.list}
          />
          <View
            style={[
              styles.totalBar,
              { backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            <View>
              <ThemedText style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Estimated Total ({itemCount} item{itemCount !== 1 ? 's' : ''})
              </ThemedText>
              <ThemedText style={[styles.totalAmount, { color: colors.tint }]}>
                ${total.toFixed(2)}
              </ThemedText>
            </View>
          </View>
        </>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  headerTitle: {
    flex: 1,
  },
  clearText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...CardShadow,
    alignItems: 'center',
  },
  itemImage: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    padding: Spacing.md,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemBrand: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.md,
    gap: Spacing.sm,
  },
  qtyButton: {
    width: ButtonSize.small,
    height: ButtonSize.small,
    borderRadius: ButtonSize.small / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
    lineHeight: 20,
  },
  qtyValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  totalBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: 34,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  totalLabel: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
});
