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
    clearStreakCelebration();
    router.push("/daily-streak");
  }, [pendingStreakCelebration, focused, clearStreakCelebration, router]);
};
