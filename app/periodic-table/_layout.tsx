import { Stack } from "expo-router";

import { RouteError } from "@/components/ui/route-error";

/** Shows the message and stack of a render error on these routes (the default screen shows only the message). */
export function ErrorBoundary(props: { error: Error; retry: () => Promise<unknown> }) {
  return <RouteError {...props} />;
}

export default function PeriodicTableLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[symbol]" options={{ headerShown: false }} />
    </Stack>
  );
}
