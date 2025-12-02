import { useStorage } from '@/services/StorageContext';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isLoading, onboardingCompleted } = useStorage();

  // Show loading while checking onboarding status
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F7' }}>
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
