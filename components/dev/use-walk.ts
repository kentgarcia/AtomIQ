/**
 * `useWalk()`: what the Auto-walk buttons call. The walk can only open the tabs when the learner is past onboarding (the tabs send anyone
 * else back to it) and past Shrodi's tour (it locks every tab but Home), so a fresh install, or one still in onboarding, gets both done
 * first: a throwaway profile named "Perf walk" with the first starting avatar, onboarding marked done, the tour skipped (no diamonds).
 * That is what a tester measuring a new phone wants; it only exists in builds that have the probe, and Delete Account in Settings resets it.
 */
import { useRouter } from "expo-router";
import { useCallback } from "react";

import { runWalk } from "./perf-walk";
import { getPerfSnapshot } from "./perf-store";
import { STARTER_AVATARS, serializeAvatar } from "@/components/avatar/avatar-core";
import { useStorage } from "@/services/StorageContext";
import { getTutorialSnapshot, loadTutorial, refreshTutorialProgress, skipTour } from "@/services/tutorial";
import { tabsFree } from "@/services/tutorial-core";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let preparing = false;

export function useWalk(): () => Promise<void> {
  const router = useRouter();
  const { onboardingCompleted, userProfile, updateUserProfile, setOnboardingDone } = useStorage();
  return useCallback(async () => {
    if (preparing || getPerfSnapshot().walk.running) return;
    preparing = true;
    try {
      if (!onboardingCompleted) {
        const userId = userProfile?.user_id || `user_perf_${Date.now()}`;
        await updateUserProfile({ user_id: userId, username: "Perf walk", display_name: "Perf walk", avatar_url: serializeAvatar(STARTER_AVATARS[0].config) });
        await setOnboardingDone(true);
        router.replace("/(tabs)");
        await sleep(1500);
      }
      await loadTutorial();
      await refreshTutorialProgress(true);
      const s = getTutorialSnapshot();
      if (!tabsFree(s.steps, s.progress, s.enabled)) {
        await skipTour();
        await sleep(300);
      }
    } catch (error) {
      console.warn("[perf-walk] could not get the app ready", error);
    } finally {
      preparing = false;
    }
    await runWalk(router);
  }, [onboardingCompleted, userProfile, updateUserProfile, setOnboardingDone, router]);
}
