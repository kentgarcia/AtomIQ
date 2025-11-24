import { Stack } from 'expo-router';

export default function ExplorerLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="journey" options={{ headerShown: false }} />
      <Stack.Screen name="journey-node" options={{ headerShown: false }} />
      <Stack.Screen name="encyclopedia" options={{ headerShown: false }} />
      <Stack.Screen name="encyclopedia-entry" options={{ headerShown: false }} />
      <Stack.Screen name="atom-maze" options={{ headerShown: false }} />
    </Stack>
  );
}

