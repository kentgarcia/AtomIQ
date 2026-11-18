import { useCallback, useEffect, useState } from "react";
import { CHEST_REWARD, chestStatus, type ChestStatus } from "@/services/missions-core";
import { useStorage } from "@/services/StorageContext";
import {
  claimMission,
  DAILY_MISSIONS,
  getMissionsState,
  MISSIONS_BY_PERIOD,
  openChest,
  recordMissionEvent,
  type DailyMission,
  type MissionPeriod,
  type MissionsState,
} from "@/services/missions";

export type MissionView = DailyMission & {
  progress: number;
  isComplete: boolean;
  isClaimed: boolean;
};

export interface PeriodMissions {
  missions: MissionView[];
  /** The chest of the period: opens (for diamonds) once every quest is claimed. */
  chest: { status: ChestStatus; reward: number };
  /** Done but not claimed yet, plus the chest when it is ready to open. */
  claimableCount: number;
  /** Claimed. */
  completedCount: number;
}

type States = Record<MissionPeriod, MissionsState | null>;

const viewsFor = (period: MissionPeriod, state: MissionsState | null): PeriodMissions => {
  const missions: MissionView[] = MISSIONS_BY_PERIOD[period].map((mission) => {
    const progress = Math.min(state?.progress[mission.type] || 0, mission.target);
    const isComplete = progress >= mission.target;
    const isClaimed = state?.claimed.includes(mission.id) || false;
    return { ...mission, progress, isComplete, isClaimed };
  });
  const chest = { status: chestStatus(missions.map((m) => m.id), state?.claimed ?? []), reward: CHEST_REWARD[period] };
  return {
    missions,
    chest,
    claimableCount: missions.filter((m) => m.isComplete && !m.isClaimed).length + (chest.status === "ready" ? 1 : 0),
    completedCount: missions.filter((m) => m.isClaimed).length,
  };
};

/** Daily and weekly quests: their progress, claiming a reward, and the daily fact's "read" event. */
export const useMissions = () => {
  const { addXP } = useStorage();
  const [states, setStates] = useState<States>({ daily: null, weekly: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [daily, weekly] = await Promise.all([getMissionsState("daily"), getMissionsState("weekly")]);
      setStates({ daily, weekly });
    } catch (error) {
      console.error("Error loading missions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const claim = useCallback(
    async (mission: DailyMission) => {
      const state = states[mission.period];
      if (!state || state.claimed.includes(mission.id)) return;
      if ((state.progress[mission.type] || 0) < mission.target) return;

      await addXP(mission.reward);
      await claimMission(mission.period, mission.id);
      await refresh();
    },
    [states, addXP, refresh],
  );

  /** Open the period's chest. Returns the diamonds paid (0 when it could not be opened). */
  const openPeriodChest = useCallback(
    async (period: MissionPeriod) => {
      const paid = await openChest(period);
      await refresh();
      return paid;
    },
    [refresh],
  );

  const markFactRead = useCallback(async () => {
    const mission = DAILY_MISSIONS.find((m) => m.type === "fact");
    const state = states.daily;
    if (!mission || !state || state.claimed.includes(mission.id)) return;

    await recordMissionEvent("fact", 1);
    await addXP(mission.reward);
    await claimMission("daily", mission.id);
    await refresh();
  }, [states.daily, addXP, refresh]);

  const daily = viewsFor("daily", states.daily);
  const weekly = viewsFor("weekly", states.weekly);

  return { loading, daily, weekly, claim, openPeriodChest, markFactRead, refresh };
};
