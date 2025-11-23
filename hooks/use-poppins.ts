import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

/**
 * Hook to load Poppins font family using expo-google-fonts
 * Loads multiple weights for headings and bold text
 */
export function usePoppins() {
  const [fontsLoaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (error) {
    console.warn('Poppins font not loaded:', error);
    // Return true to allow app to continue with system fonts as fallback
    return true;
  }

  return fontsLoaded;
}

