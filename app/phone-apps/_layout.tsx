import { Stack } from "expo-router";
import { useEffect } from "react";

import { warmSfxGroup } from "@/services/sfx";

/** The phone's own apps (docs/PHONE_SPEC.md). Apps that already had a screen (Shop, Settings, AtomDex, Daily Fact) are opened from the phone's home screen but stay where they were. */
export default function PhoneLayout() {
  // The phone apps' sounds are loaded once the learner is inside one, so the first tap is not the load
  useEffect(() => {
    warmSfxGroup("phone");
  }, []);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chats" />
      <Stack.Screen name="shrodi" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="new-chat" />
      <Stack.Screen name="contacts" />
      <Stack.Screen name="field-notes" />
      <Stack.Screen name="field-note" />
      <Stack.Screen name="library" />
      <Stack.Screen name="scanner" />
    </Stack>
  );
}
