import { useCallback, useEffect, useState } from "react";
import { useStorage } from "@/services/StorageContext";
import {
  claimDailyMission,
  DAILY_MISSIONS,
  getDailyMissionsState,
  recordMissionEvent,
  type DailyMission,
  type MissionsState,
} from "@/services/missions";

export type MissionView = DailyMission & {
  progress: number;
  isComplete: boolean;
  isClaimed: boolean;
};

export const useDailyMissions = () => {
  const { addXP } = useStorage();
  const [state, setState] = useState<MissionsState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await getDailyMissionsState();
      setState(s);
    } catch (error) {
      console.error("Error loading daily missions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const claim = useCallback(
    async (mission: DailyMission) => {
      if (!state || state.claimed.includes(mission.id)) return;
      const current = state.progress[mission.type] || 0;
      if (current < mission.target) return;

      await addXP(mission.reward);
      await claimDailyMission(mission.id);
      await refresh();
    },
    [state, addXP, refresh],
  );

  const markFactRead = useCallback(async () => {
    const mission = DAILY_MISSIONS.find((m) => m.type === "fact");
    if (!mission || !state || state.claimed.includes(mission.id)) return;

    await recordMissionEvent("fact", 1);
    await addXP(mission.reward);
    await claimDailyMission(mission.id);
    await refresh();
  }, [state, addXP, refresh]);

  const missions: MissionView[] = DAILY_MISSIONS.map((mission) => {
    const progress = Math.min(state?.progress[mission.type] || 0, mission.target);
    const isComplete = progress >= mission.target;
    const isClaimed = state?.claimed.includes(mission.id) || false;
    return { ...mission, progress, isComplete, isClaimed };
  });

  const claimableCount = missions.filter((m) => m.isComplete && !m.isClaimed).length;
  const completedCount = missions.filter((m) => m.isClaimed).length;

  return {
    loading,
    missions,
    claim,
    markFactRead,
    refresh,
    claimableCount,
    completedCount,
  };
};