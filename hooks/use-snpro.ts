import { useFonts } from 'expo-font';

/**
 * Hook to load the SNPro font family from local assets.
 * Loads every static weight so any weight can be used across the design.
 */
export function useSnPro() {
  const [fontsLoaded, error] = useFonts({
    'SNPro-Thin': require('../assets/fonts/SNPro-Thin.ttf'),
    'SNPro-Light': require('../assets/fonts/SNPro-Light.ttf'),
    'SNPro-Book': require('../assets/fonts/SNPro-Book.ttf'),
    'SNPro-Regular': require('../assets/fonts/SNPro-Regular.ttf'),
    'SNPro-Medium': require('../assets/fonts/SNPro-Medium.ttf'),
    'SNPro-Semibold': require('../assets/fonts/SNPro-Semibold.ttf'),
    'SNPro-Bold': require('../assets/fonts/SNPro-Bold.ttf'),
    'SNPro-Heavy': require('../assets/fonts/SNPro-Heavy.ttf'),
    'SNPro-Black': require('../assets/fonts/SNPro-Black.ttf'),
  });

  if (error) {
    console.warn('SNPro font not loaded:', error);
  }

  return fontsLoaded;
}