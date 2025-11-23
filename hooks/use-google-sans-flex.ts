import { useFonts } from 'expo-font';

/**
 * Hook to load Google Sans Flex variable font
 * Variable fonts contain all weights in a single file
 */
export function useGoogleSansFlex() {
  const [fontsLoaded, error] = useFonts({
    'GoogleSansFlex': require('../assets/fonts/GoogleSansFlex-VariableFont.ttf'),
  });

  if (error) {
    console.warn('Google Sans Flex font not loaded:', error);
  }

  return fontsLoaded;
}

