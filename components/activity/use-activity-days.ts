import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { currentDayKey, loadActivityDays, subscribeActivity } from "@/services/activity-log";
import type { DayRecord } from "@/services/activity-core";

/**
 * Loads the on-device activity history. Refreshes when the screen regains
 * focus (so a day change while backgrounded is picked up) and when new events
 * are recorded.
 */
export function useActivityDays() {
  const [days, setDays] = useState<Record<string, DayRecord>>({});
  const [todayKey, setTodayKey] = useState(() => currentDayKey());
  const [loaded, setLoaded] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await loadActivityDays();
      if (!alive.current) return;
      setDays(next);
      setTodayKey(currentDayKey());
      setLoaded(true);
    } catch {
      if (alive.current) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const unsubscribe = subscribeActivity(() => {
      void refresh();
    });
    return () => {
      alive.current = false;
      unsubscribe();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { days, todayKey, loaded };
}
