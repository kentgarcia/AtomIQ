import { useStorage } from '@/services/StorageContext';
import { useTheme } from '@/theme';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isLoading, onboardingCompleted } = useStorage();
  const { theme } = useTheme();

  // Show loading while checking onboarding status
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Redirect based on onboarding status
  if (onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
