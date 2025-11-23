import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleSansFlex } from '@/hooks/use-google-sans-flex';
import { usePoppins } from '@/hooks/use-poppins';
import { StorageProvider } from '@/services/StorageContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const poppinsLoaded = usePoppins();
  const googleSansLoaded = useGoogleSansFlex();

  // Wait for fonts to load before rendering
  if (!poppinsLoaded || !googleSansLoaded) {
    return null;
  }

  return (
    <StorageProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="map" options={{ headerShown: false }} />
          <Stack.Screen name="lesson" options={{ headerShown: false }} />
          <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
          <Stack.Screen name="mythbuster" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </StorageProvider>
  );
}
