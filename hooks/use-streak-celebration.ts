import { useIsFocused, useRouter } from "expo-router";
import { useEffect } from "react";

import { useStorage } from "@/services/StorageContext";

/**
 * Shows the daily streak screen once per day, when today's streak has gone up.
 * Call it from the screen the app opens on (Home): the screen only appears
 * while that screen is in front, never over a lesson or game in progress.
 */
export const useStreakCelebration = () => {
  const router = useRouter();
  const focused = useIsFocused();
  const { pendingStreakCelebration, clearStreakCelebration } = useStorage();

  useEffect(() => {
    if (!pendingStreakCelebration || !focused) return;
    // A moment after Home is in front: pushing a full-screen modal while another screen is still
    // replacing itself (onboarding handing over, a lesson closing) can leave an invisible layer over the map.
    const timer = setTimeout(() => {
      clearStreakCelebration();
      router.push("/daily-streak");
    }, 700);
    return () => clearTimeout(timer);
  }, [pendingStreakCelebration, focused, clearStreakCelebration, router]);
};
