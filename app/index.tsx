import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStorage } from '@/services/StorageContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isLoading, onboardingCompleted } = useStorage();
  const colorScheme = useColorScheme();
  const bgColor = colorScheme === 'dark' ? '#172B4D' : '#F7F7F7';

  // Show loading while checking onboarding status
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  // Redirect based on onboarding status
  if (onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
