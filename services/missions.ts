import { getAllMyths } from "@/content/myths";
import {
  CHEST_ID,
  CHEST_REWARD,
  chestStatus,
  periodKey,
  resolveState,
  toIsoDate,
  type MissionPeriod,
  type MissionType,
  type MissionsState,
} from "@/services/missions-core";
import { emitFeedEvent } from "@/services/feed";
import { recordQuestClaimed } from "@/services/quest-stats";
import { getItem, setItem } from "@/services/storage";
import { addDiamonds } from "@/services/wallet";

export type { MissionPeriod, MissionType, MissionsState } from "@/services/missions-core";

export interface DailyMission {
  id: string;
  type: MissionType;
  period: MissionPeriod;
  title: string;
  description: string;
  icon: string;
  target: number;
  reward: number;
}

export type DailyFact = {
  /** The myth id the fact comes from (`daily-fallback` for the built-in one). */
  id: string;
  kind: "myth";
  title: string;
  statement: string;
  /** One-line "Did you know?" version for a quick read. */
  short: string;
  /** Full story (rich text: **bold** and "- " list lines). */
  explanation: string;
};

export const DAILY_MISSIONS: DailyMission[] = [
  {
    id: "daily_login",
    period: "daily",
    type: "login",
    title: "Log In Today",
    description: "Open the app to check in",
    icon: "CalendarTick",
    target: 1,
    reward: 30,
  },
  {
    id: "daily_mythbuster",
    period: "daily",
    type: "mythbuster",
    title: "Play Myth Buster",
    description: "Play one round — any difficulty",
    icon: "Game",
    target: 1,
    reward: 40,
  },
  {
    id: "daily_fact",
    period: "daily",
    type: "fact",
    title: "Read Daily Fact",
    description: "Read today's myth or fact card",
    icon: "Book",
    target: 1,
    reward: 50,
  },
];

export const WEEKLY_MISSIONS: DailyMission[] = [
  {
    id: "weekly_login",
    type: "login",
    period: "weekly",
    title: "Log in on 5 days",
    description: "Come back on five different days this week",
    icon: "CalendarTick",
    target: 5,
    reward: 100,
  },
  {
    id: "weekly_lessons",
    type: "lesson",
    period: "weekly",
    title: "Finish 5 lessons",
    description: "Complete five lessons this week",
    icon: "Book1",
    target: 5,
    reward: 200,
  },
  {
    id: "weekly_mythbuster",
    type: "mythbuster",
    period: "weekly",
    title: "Play Myth Buster 5 times",
    description: "Play five rounds this week",
    icon: "Game",
    target: 5,
    reward: 150,
  },
  {
    id: "weekly_fact",
    type: "fact",
    period: "weekly",
    title: "Read 5 daily facts",
    description: "Read the daily fact on five days this week",
    icon: "Book",
    target: 5,
    reward: 120,
  },
];

export const MISSIONS_BY_PERIOD: Record<MissionPeriod, DailyMission[]> = {
  daily: DAILY_MISSIONS,
  weekly: WEEKLY_MISSIONS,
};

const STORAGE_KEYS: Record<MissionPeriod, string> = {
  daily: "@atomiq:daily_missions",
  weekly: "@atomiq:weekly_missions",
};

/** The saved counters of a period: reset when the period has rolled over. */
export const getMissionsState = async (period: MissionPeriod): Promise<MissionsState> => {
  const stored = await getItem<MissionsState>(STORAGE_KEYS[period]);
  const { state, fresh } = resolveState(stored, periodKey(period));
  if (fresh) await setItem(STORAGE_KEYS[period], state);
  return state;
};

export const getDailyMissionsState = (): Promise<MissionsState> => getMissionsState("daily");

/** Something happened (a log-in, a Myth Buster round, a daily fact, a lesson): count it for today and this week. */
export const recordMissionEvent = async (type: MissionType, amount: number): Promise<void> => {
  for (const period of ["daily", "weekly"] as const) {
    try {
      const state = await getMissionsState(period);
      state.progress[type] = (state.progress[type] || 0) + Math.max(0, amount);
      await setItem(STORAGE_KEYS[period], state);
    } catch (error) {
      console.error(`Error recording ${period} mission event:`, error);
    }
  }
};

export const claimMission = async (period: MissionPeriod, missionId: string): Promise<void> => {
  try {
    const state = await getMissionsState(period);
    if (!state.claimed.includes(missionId)) {
      state.claimed.push(missionId);
      await setItem(STORAGE_KEYS[period], state);
      await recordQuestClaimed();
      // Every daily quest claimed: the NPC feed may post about it (fire-and-forget).
      if (period === "daily" && DAILY_MISSIONS.every((m) => state.claimed.includes(m.id))) {
        emitFeedEvent({ type: "daily_quests_done" });
      }
    }
  } catch (error) {
    console.error(`Error claiming ${period} mission:`, error);
  }
};

const chestBusy = new Set<MissionPeriod>();

/**
 * Open the chest of a period: allowed once every quest of it is claimed, and only once. Pays the
 * diamonds and returns how many (0 when it was not allowed). The chest is marked opened first, so a
 * double tap cannot pay twice; if paying fails the mark is taken back.
 */
export const openChest = async (period: MissionPeriod): Promise<number> => {
  if (chestBusy.has(period)) return 0;
  chestBusy.add(period);
  try {
    const state = await getMissionsState(period);
    const ids = MISSIONS_BY_PERIOD[period].map((m) => m.id);
    if (chestStatus(ids, state.claimed) !== "ready") return 0;
    state.claimed.push(CHEST_ID);
    await setItem(STORAGE_KEYS[period], state);
    try {
      await addDiamonds(CHEST_REWARD[period]);
    } catch (error) {
      state.claimed = state.claimed.filter((id) => id !== CHEST_ID);
      await setItem(STORAGE_KEYS[period], state);
      throw error;
    }
    emitFeedEvent({ type: "chest_opened", period });
    return CHEST_REWARD[period];
  } catch (error) {
    console.error(`Error opening ${period} chest:`, error);
    return 0;
  } finally {
    chestBusy.delete(period);
  }
};

export const claimDailyMission = (missionId: string): Promise<void> => claimMission("daily", missionId);

/* ------------------------------------------------------------------ */
/* Daily fact — one myth or fact, deterministically picked per day.    */
/* ------------------------------------------------------------------ */

const FALLBACK_FACT: DailyFact = {
  id: "daily-fallback",
  kind: "myth",
  title: "Nuclear powers the stars",
  statement:
    "Nuclear fusion in the Sun's core releases the energy that lights our sky.",
  short:
    "The Sun shines because hydrogen nuclei fuse into helium in its core.",
  explanation:
    "In the Sun's core, hydrogen nuclei fuse into helium. This fusion releases an enormous amount of energy — the same process that powers a hydrogen bomb, but in a controlled, natural chain.",
};

const dayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
};

const loadDailyFact = async (): Promise<{ fact: DailyFact; ok: boolean }> => {
  try {
    const myths = await getAllMyths();

    const items: DailyFact[] = myths.map((myth) => ({
      id: myth.id,
      kind: "myth" as const,
      title: myth.title,
      statement: myth.mythStatement,
      short: myth.reality?.trim() || myth.mythStatement,
      explanation: myth.explanation,
    }));

    if (items.length === 0) {
      return { fact: FALLBACK_FACT, ok: true };
    }

    return { fact: items[dayOfYear(new Date()) % items.length], ok: true };
  } catch (error) {
    console.error("Error loading daily fact:", error);
    return { fact: FALLBACK_FACT, ok: false };
  }
};

/** A fact by id (for reopening one from the read list); `null` when its myth is gone. */
export const getFactById = async (id: string): Promise<DailyFact | null> => {
  try {
    const myth = (await getAllMyths()).find((m) => m.id === id);
    if (!myth) return null;
    return { id: myth.id, kind: "myth", title: myth.title, statement: myth.mythStatement, short: myth.reality?.trim() || myth.mythStatement, explanation: myth.explanation };
  } catch {
    return null;
  }
};

/* Load the daily fact once per day and share the result instead of reading
   every myth from SQLite on each call. A failed load is not cached, so the
   next caller retries. */
let dailyFactCache: { day: string; promise: Promise<DailyFact> } | null = null;

export const getDailyFact = (): Promise<DailyFact> => {
  const day = toIsoDate();
  if (dailyFactCache && dailyFactCache.day === day) return dailyFactCache.promise;

  const promise = loadDailyFact().then(({ fact, ok }) => {
    if (!ok && dailyFactCache?.promise === promise) dailyFactCache = null;
    return fact;
  });
  dailyFactCache = { day, promise };
  return promise;
};
