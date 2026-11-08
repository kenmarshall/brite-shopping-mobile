// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SFSymbol, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { type ColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SFSymbol, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'magnifyingglass': 'search',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.left': 'arrow-back-ios',
  'chevron.right': 'chevron-right',
  'cart.fill': 'shopping-cart',
  'cart.badge.plus': 'add-shopping-cart',
  'circle.lefthalf.filled': 'contrast',
  'envelope': 'email',
  'lock.shield': 'privacy-tip',
  'storefront': 'storefront',
  'info.circle': 'info-outline',
  'person.crop.circle.fill': 'account-circle',
  'plus.circle.fill': 'add-circle',
  'person.circle': 'account-circle',
  'line.3.horizontal.decrease': 'filter-list',
  'photo': 'image',
  'barcode.viewfinder': 'qr-code-scanner',
  'xmark': 'close',
  'flashlight.on.fill': 'flash-on',
  'flashlight.off.fill': 'flash-off',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // MaterialIcons accepts only string or native colors, not null or processed numbers.
  const iconColor = color === null || typeof color === 'number' ? undefined : color;
  return <MaterialIcons color={iconColor} size={size} name={MAPPING[name]} style={style} />;
}
