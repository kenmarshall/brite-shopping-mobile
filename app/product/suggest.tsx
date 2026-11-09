import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DuplicatePicker } from '@/components/product/DuplicatePicker';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { ChipRow } from '@/components/ui/ChipRow';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { StateView } from '@/components/ui/StateView';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { type Product, getProduct } from '@/services/api';
import { submitSuggestion } from '@/services/suggestions';
import { correctionFields } from '@/utils/suggestions';

const S = Strings.suggest;
type Kind = keyof typeof S.kinds;
const KINDS: Kind[] = ['correction', 'wrong_price', 'duplicate'];

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; product: Product } | { status: 'sent' };

/** Shoppers suggest a fix; a curator reviews it before the catalog changes. */
export default function SuggestCorrectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [load, setLoad] = useState<Load>(() => (id ? { status: 'loading' } : { status: 'error' }));
  const [kind, setKind] = useState<Kind>('correction');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [note, setNote] = useState('');
  const [other, setOther] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [attempt, setAttempt] = useState(0);

  // Load (and on retry, reload) the product; the form starts from its current name and brand.
  useEffect(() => {
    if (!id) return;
    let active = true;
    getProduct(id)
      .then((product) => {
        if (!active) return;
        setName(product.name);
        setBrand(product.brand ?? '');
        setLoad({ status: 'ready', product });
      })
      .catch(() => active && setLoad({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [id, attempt]);

  if (load.status === 'loading') return <StateView />;
  if (load.status === 'error') return <StateView title={S.title} body={S.loadError} action={{ label: S.retry, onPress: () => { setLoad({ status: 'loading' }); setAttempt((n) => n + 1); } }} />;
  if (load.status === 'sent') {
    return <StateView title={S.sentTitle} body={S.sentBody} action={{ label: S.backToProduct, onPress: () => router.back() }} />;
  }

  const { product } = load;
  const send = async (): Promise<void> => {
    if (sending) return;
    const fields = kind === 'correction' ? correctionFields(product, { name, brand }) : {};
    const trimmedNote = note.trim();
    if (kind === 'correction' && Object.keys(fields).length === 0 && !trimmedNote) return setError(S.nothingChanged);
    if (kind === 'wrong_price' && !trimmedNote) return setError(S.priceNoteRequired);
    if (kind === 'duplicate' && !other) return setError(S.duplicateRequired);
    setError(null);
    setSending(true);
    try {
      await submitSuggestion({ kind, product_id: product._id, fields, note: trimmedNote || undefined, other_product_id: kind === 'duplicate' ? other?._id : undefined });
      setLoad({ status: 'sent' });
    } catch {
      setError(S.sendError);
    } finally {
      setSending(false);
    }
  };

  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }];

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.xxl }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.back} accessibilityRole="button" accessibilityLabel={S.back}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.block}>
          <ThemedText style={styles.title} accessibilityRole="header">{S.title}</ThemedText>
          <ThemedText style={[styles.caption, { color: colors.textSecondary }]} numberOfLines={2}>{product.name}</ThemedText>
          <ThemedText style={[styles.body, { color: colors.textSecondary }]}>{S.intro}</ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText style={[styles.label, styles.padded]}>{S.kindLabel}</ThemedText>
          <ChipRow
            options={KINDS.map((k) => ({ key: k, label: S.kinds[k], accessibilityLabel: S.kinds[k] }))}
            selected={kind}
            onSelect={(k) => {
              setKind(k as Kind);
              setError(null);
            }}
          />
        </View>

        {kind === 'correction' ? (
          <>
            <View style={[styles.field, styles.padded]}>
              <ThemedText style={styles.label} nativeID="suggest-name">{S.nameLabel}</ThemedText>
              <TextInput value={name} onChangeText={setName} accessibilityLabelledBy="suggest-name" style={inputStyle} maxLength={200} />
            </View>
            <View style={[styles.field, styles.padded]}>
              <ThemedText style={styles.label} nativeID="suggest-brand">{S.brandLabel}</ThemedText>
              <TextInput value={brand} onChangeText={setBrand} accessibilityLabelledBy="suggest-brand" style={inputStyle} maxLength={200} />
            </View>
          </>
        ) : null}

        {kind === 'duplicate' ? (
          <View style={[styles.field, styles.padded]}>
            <ThemedText style={styles.label}>{S.duplicateLabel}</ThemedText>
            <DuplicatePicker productId={product._id} initialQuery={product.name} selected={other} onSelect={setOther} />
          </View>
        ) : null}

        <View style={[styles.field, styles.padded]}>
          <ThemedText style={styles.label} nativeID="suggest-note">{kind === 'wrong_price' ? S.priceNoteLabel : S.noteLabel}</ThemedText>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={kind === 'wrong_price' ? S.priceNotePlaceholder : S.notePlaceholder}
            placeholderTextColor={colors.placeholderText}
            accessibilityLabelledBy="suggest-note"
            multiline
            maxLength={500}
            style={[inputStyle, styles.note]}
          />
        </View>

        {error ? <ThemedText style={[styles.body, styles.padded, { color: colors.danger }]}>{error}</ThemedText> : null}
        <View style={[styles.actions, styles.padded]}>
          <Button label={S.send} onPress={send} busy={sending} disabled={sending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: Spacing.lg },
  back: { width: ButtonSize.touch, height: ButtonSize.touch, justifyContent: 'center', marginLeft: Spacing.sm },
  block: { gap: Spacing.xs, paddingHorizontal: Spacing.lg },
  padded: { paddingHorizontal: Spacing.lg },
  title: { ...Type.title },
  caption: { ...Type.callout },
  body: { ...Type.body },
  field: { gap: Spacing.xs },
  label: { ...Type.callout, fontFamily: Fonts.semibold },
  input: { ...Type.body, minHeight: ButtonSize.large, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md },
  note: { minHeight: ButtonSize.large * 2, paddingTop: Spacing.md, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', marginTop: Spacing.sm },
});
