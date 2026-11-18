import { Stack } from "expo-router";

import { ButtonDesignProvider } from "@/components/ui/button";

export default function PracticeLayout() {
  return (
    <ButtonDesignProvider design="standard">
      <Stack>
        <Stack.Screen name="[id]" options={{ headerShown: false, animation: "fade" }} />
      </Stack>
    </ButtonDesignProvider>
  );
}
