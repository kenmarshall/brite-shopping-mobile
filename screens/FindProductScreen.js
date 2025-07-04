import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const dummyProducts = [
  { id: '1', name: 'Milk', brand: 'Brand A', size: '1L', price: '3.99' },
  { id: '2', name: 'Bread', brand: 'Brand B', size: '500g', price: '2.49' },
  { id: '3', name: 'Cheese', brand: 'Brand C', size: '200g', price: '4.50' },
];

export default function FindProductScreen() {
  const [query, setQuery] = useState('');

  const results = dummyProducts.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-xl font-bold mb-4" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
        Find Product
      </Text>
      <View className="flex-row items-center bg-gray-100 rounded-full px-3 py-2 mb-4">
        <Ionicons name="search" size={20} color="gray" />
        <TextInput
          className="flex-1 ml-2"
          placeholder="Search for a product"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {results.length === 0 ? (
          <Text className="text-center text-gray-500">No results found</Text>
        ) : (
          results.map((p) => (
            <View key={p.id} className="mb-3 p-4 rounded-lg bg-gray-50">
              <Text className="font-bold" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
                {p.name}
              </Text>
              <Text>{p.brand}</Text>
              <Text>{p.size}</Text>
              {p.price && <Text>${p.price}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
