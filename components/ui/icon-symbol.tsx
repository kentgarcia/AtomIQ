// Fallback for using Iconsax on Android and web.

import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';
import { Icon } from './icon';

type IconMapping = Record<SymbolViewProps['name'], string>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Iconsax mappings here.
 * - see Iconsax icons in the [Iconsax Directory](https://iconsax-react-native.vercel.app/).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'Home',
  'paperplane.fill': 'Send',
  'chevron.left.forwardslash.chevron.right': 'Code',
  'chevron.right': 'ArrowRight',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Iconsax on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Iconsax.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <Icon name={MAPPING[name] as any} size={size} color={color as string} style={style} />;
}
