import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { addStore } from '@/api';

export default function AddStoreScreen() {
  const [name, setName] = useState('');
  const submit = () => {
    // TODO: integrate Google Places autocomplete
    addStore({ name }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Store Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      {/* Google Places autocomplete component to be added here */}
      <Button title="Add Store" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
  },
});
