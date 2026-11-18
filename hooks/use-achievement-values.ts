import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getQuestsClaimed, subscribeQuestsClaimed } from "@/services/quest-stats";
import { useStorage } from "@/services/StorageContext";

/** The numbers the achievement tracks read: the profile plus the quests-claimed counter. */
export function useAchievementValues(): Record<string, unknown> | null {
  const { userProfile } = useStorage();
  const [questsClaimed, setQuestsClaimed] = useState(0);

  const load = useCallback(() => {
    getQuestsClaimed()
      .then(setQuestsClaimed)
      .catch(() => undefined);
  }, []);
  useFocusEffect(load);
  useEffect(() => subscribeQuestsClaimed(setQuestsClaimed), []);

  return useMemo(
    () => (userProfile ? { ...(userProfile as unknown as Record<string, unknown>), quests_claimed: questsClaimed } : null),
    [userProfile, questsClaimed],
  );
}
