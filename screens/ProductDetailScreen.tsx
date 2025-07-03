import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchProductById } from '@/api';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    // TODO: Replace with real API call
    fetchProductById(String(id))
      .then((res) => setProduct(res.data))
      .catch(() =>
        setProduct({
          id,
          name: 'Sample Product',
          brand: 'Brand X',
          size: '1L',
          prices: [
            { store: 'Store A', price: 3.99 },
            { store: 'Store B', price: 4.29 },
          ],
        })
      );
  }, [id]);

  if (!product) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{product.name}</Text>
      <Text>{product.brand}</Text>
      <Text>{product.size}</Text>
      <View style={styles.prices}>
        {product.prices?.map((p: any, index: number) => (
          <Text key={index}>{`${p.store}: $${p.price}`}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  prices: {
    marginTop: 12,
  },
});
