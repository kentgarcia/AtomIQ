import { Colors } from '@/constants/theme';
import { useColorScheme } from './use-color-scheme.tsx';

/**
 * Hook to get theme colors based on current color scheme
 * Usage: const colors = useThemeColors();
 * Then: colors.background, colors.text, etc.
 */
export function useThemeColors() {
  const colorScheme = useColorScheme();
  return Colors[colorScheme];
}
