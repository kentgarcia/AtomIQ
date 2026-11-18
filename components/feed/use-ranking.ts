/**
 * This week's ranking for the Ranks entry card and the Ranks screen. It does not change by itself
 * while a screen is open (XP changes when a lesson ends), so screens call `reload()` when they gain
 * focus and on pull to refresh.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { getWeeklyRanking, type WeeklyRanking } from "@/services/feed";

export function useWeeklyRanking(): { ranking: WeeklyRanking | null; reload: () => Promise<void> } {
  const [ranking, setRanking] = useState<WeeklyRanking | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const reload = useCallback(async () => {
    try {
      const next = await getWeeklyRanking();
      if (alive.current) setRanking(next);
    } catch (error) {
      console.warn("[feed] ranking", error);
    }
  }, []);
  return { ranking, reload };
}
