import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { addProduct } from '@/api';

export default function AddProductScreen() {
  const [form, setForm] = useState({
    name: '',
    brand: '',
    size: '',
    store: '',
    price: '',
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    // TODO: send to backend
    addProduct(form).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Name"
        value={form.name}
        onChangeText={(v) => handleChange('name', v)}
        style={styles.input}
      />
      <TextInput
        placeholder="Brand"
        value={form.brand}
        onChangeText={(v) => handleChange('brand', v)}
        style={styles.input}
      />
      <TextInput
        placeholder="Size"
        value={form.size}
        onChangeText={(v) => handleChange('size', v)}
        style={styles.input}
      />
      <TextInput
        placeholder="Store"
        value={form.store}
        onChangeText={(v) => handleChange('store', v)}
        style={styles.input}
      />
      <TextInput
        placeholder="Price"
        value={form.price}
        onChangeText={(v) => handleChange('price', v)}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Button title="Add Product" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
  },
});
