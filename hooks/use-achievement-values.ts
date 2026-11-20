import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getQuestsClaimed, subscribeQuestsClaimed } from "@/services/quest-stats";
import { getShopStats, subscribeOwned } from "@/services/shop";
import { useStorage } from "@/services/StorageContext";

/** The numbers the achievement tracks read: the profile plus the quests-claimed counter and the shop totals (items got, diamonds spent). */
export function useAchievementValues(): Record<string, unknown> | null {
  const { userProfile } = useStorage();
  const [questsClaimed, setQuestsClaimed] = useState(0);
  const [shop, setShop] = useState({ owned: 0, spent: 0 });

  const load = useCallback(() => {
    getQuestsClaimed()
      .then(setQuestsClaimed)
      .catch(() => undefined);
  }, []);
  const loadShop = useCallback(() => {
    getShopStats()
      .then(setShop)
      .catch(() => undefined);
  }, []);
  useFocusEffect(load);
  useFocusEffect(loadShop);
  useEffect(() => subscribeQuestsClaimed(setQuestsClaimed), []);
  // A buy changes both totals: read them again
  useEffect(() => subscribeOwned(loadShop), [loadShop]);

  return useMemo(
    () => (userProfile ? { ...(userProfile as unknown as Record<string, unknown>), quests_claimed: questsClaimed, cosmetics_owned: shop.owned, diamonds_spent: shop.spent } : null),
    [userProfile, questsClaimed, shop],
  );
}
