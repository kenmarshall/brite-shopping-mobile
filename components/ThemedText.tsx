import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { Fonts, interForWeight } from '@/constants/Theme';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const tint = useThemeColor({}, 'tint');

  const styleList: StyleProp<TextStyle> = [
    { color },
    type === 'default' ? styles.default : undefined,
    type === 'title' ? styles.title : undefined,
    type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
    type === 'subtitle' ? styles.subtitle : undefined,
    type === 'link' ? [styles.link, { color: tint }] : undefined,
    style,
  ];
  const flat: TextStyle = StyleSheet.flatten(styleList) ?? {};
  // Custom fonts ignore fontWeight, so pick the Inter cut for the weight instead.
  const { fontWeight, ...withoutWeight } = flat;
  const resolved: TextStyle = flat.fontFamily ? flat : { ...withoutWeight, fontFamily: interForWeight(fontWeight) };

  return <Text style={resolved} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
});
