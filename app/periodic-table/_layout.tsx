import { Stack } from "expo-router";

export default function PeriodicTableLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[symbol]" options={{ headerShown: false }} />
    </Stack>
  );
}
