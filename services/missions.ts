import { getAllFacts } from "@/content/facts";
import { getAllMyths } from "@/content/myths";
import { getItem, setItem } from "@/services/storage";

export type MissionType = "login" | "mythbuster" | "fact";

export interface DailyMission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  icon: string;
  target: number;
  reward: number;
}

export interface MissionsState {
  date: string;
  progress: Record<MissionType, number>;
  claimed: string[];
}

export type DailyFact = {
  kind: "myth" | "fact";
  title: string;
  statement: string;
  explanation: string;
};

export const DAILY_MISSIONS: DailyMission[] = [
  {
    id: "daily_login",
    type: "login",
    title: "Log In Today",
    description: "Open the app to check in",
    icon: "CalendarTick",
    target: 1,
    reward: 30,
  },
  {
    id: "daily_mythbuster",
    type: "mythbuster",
    title: "Play Myth Buster",
    description: "Play one round — any difficulty",
    icon: "Game",
    target: 1,
    reward: 40,
  },
  {
    id: "daily_fact",
    type: "fact",
    title: "Read Daily Fact",
    description: "Read today's myth or fact card",
    icon: "Book",
    target: 1,
    reward: 50,
  },
];

const MISSIONS_STORAGE_KEY = "@atomiq:daily_missions";

const toIsoDate = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const emptyProgress = (): Record<MissionType, number> => ({
  login: 0,
  mythbuster: 0,
  fact: 0,
});

export const getDailyMissionsState = async (): Promise<MissionsState> => {
  const today = toIsoDate();
  const stored = await getItem<MissionsState>(MISSIONS_STORAGE_KEY);

  if (stored && stored.date === today) {
    return {
      date: today,
      progress: { ...emptyProgress(), ...stored.progress },
      claimed: Array.isArray(stored.claimed) ? stored.claimed : [],
    };
  }

  const fresh: MissionsState = {
    date: today,
    progress: emptyProgress(),
    claimed: [],
  };
  await setItem(MISSIONS_STORAGE_KEY, fresh);
  return fresh;
};

export const recordMissionEvent = async (
  type: MissionType,
  amount: number,
): Promise<void> => {
  try {
    const state = await getDailyMissionsState();
    state.progress[type] = (state.progress[type] || 0) + Math.max(0, amount);
    await setItem(MISSIONS_STORAGE_KEY, state);
  } catch (error) {
    console.error("Error recording mission event:", error);
  }
};

export const claimDailyMission = async (missionId: string): Promise<void> => {
  try {
    const state = await getDailyMissionsState();
    if (!state.claimed.includes(missionId)) {
      state.claimed.push(missionId);
      await setItem(MISSIONS_STORAGE_KEY, state);
    }
  } catch (error) {
    console.error("Error claiming mission:", error);
  }
};

/* ------------------------------------------------------------------ */
/* Daily fact — one myth or fact, deterministically picked per day.    */
/* ------------------------------------------------------------------ */

const FALLBACK_FACT: DailyFact = {
  kind: "fact",
  title: "Nuclear powers the stars",
  statement:
    "Nuclear fusion in the Sun's core releases the energy that lights our sky.",
  explanation:
    "In the Sun's core, hydrogen nuclei fuse into helium. This fusion releases an enormous amount of energy — the same process that powers a hydrogen bomb, but in a controlled, natural chain.",
};

const dayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
};

export const getDailyFact = async (): Promise<DailyFact> => {
  try {
    const [myths, facts] = await Promise.all([getAllMyths(), getAllFacts()]);

    const items: DailyFact[] = [
      ...myths.map((myth) => ({
        kind: "myth" as const,
        title: myth.title,
        statement: myth.mythStatement,
        explanation: myth.explanation,
      })),
      ...facts.map((fact) => ({
        kind: "fact" as const,
        title: fact.title,
        statement: fact.statement,
        explanation: fact.explanation,
      })),
    ];

    if (items.length === 0) {
      return FALLBACK_FACT;
    }

    return items[dayOfYear(new Date()) % items.length];
  } catch (error) {
    console.error("Error loading daily fact:", error);
    return FALLBACK_FACT;
  }
};