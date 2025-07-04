import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { addProduct } from '@/api';

export default function AddProductScreen() {
  const [product, setProduct] = useState({
    name: '',
    brand: '',
    size: '',
    store: '',
    price: '',
  });

  const handleChange = (key, value) => {
    setProduct((prev) => ({ ...prev, [key]: value }));
  };

  const allFilled = Object.values(product).every((v) => v.trim().length > 0);

  const submit = () => {
    addProduct(product).catch(() => {});
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-xl font-bold mb-4" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
        Add Product
      </Text>
      <TextInput
        className="bg-blue-50 rounded-md p-3 mb-3"
        placeholder="Product Name"
        value={product.name}
        onChangeText={(v) => handleChange('name', v)}
      />
      <TextInput
        className="bg-blue-50 rounded-md p-3 mb-3"
        placeholder="Brand"
        value={product.brand}
        onChangeText={(v) => handleChange('brand', v)}
      />
      <TextInput
        className="bg-blue-50 rounded-md p-3 mb-3"
        placeholder="Size"
        value={product.size}
        onChangeText={(v) => handleChange('size', v)}
      />
      <TextInput
        className="bg-blue-50 rounded-md p-3 mb-3"
        placeholder="Store"
        value={product.store}
        onChangeText={(v) => handleChange('store', v)}
      />
      <TextInput
        className="bg-blue-50 rounded-md p-3 mb-3"
        placeholder="Price"
        keyboardType="decimal-pad"
        value={product.price}
        onChangeText={(v) => handleChange('price', v)}
      />
      <Pressable
        className="mt-4 rounded-full bg-blue-500 py-3"
        disabled={!allFilled}
        onPress={submit}
        style={!allFilled && { opacity: 0.5 }}
      >
        <Text className="text-center text-white font-semibold" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
          Add Product
        </Text>
      </Pressable>
    </View>
  );
}
