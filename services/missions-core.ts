/**
 * Daily and weekly quests, the framework-free part: which period a state belongs to, how a stored
 * state rolls over, and how long until the next reset. No storage and no React, so
 * `scripts/test-missions.mjs` runs it under Node. `services/missions.ts` adds the storage.
 *
 * Both periods count the same events (a log-in, a Myth Buster round, a daily fact, a finished
 * lesson or a passed practice or checkpoint (both are "lesson" events), a cleared Atom Maze level); a period only differs in its target, its reward and when its counters start again.
 */

export type MissionType = "login" | "mythbuster" | "fact" | "lesson" | "maze";
export type MissionPeriod = "daily" | "weekly";

export const MISSION_TYPES: readonly MissionType[] = ["login", "mythbuster", "fact", "lesson", "maze"];

export interface MissionsState {
  /** The period this state belongs to: today's date (daily) or the date of the week's Monday (weekly). */
  date: string;
  progress: Record<MissionType, number>;
  claimed: string[];
}

export const emptyProgress = (): Record<MissionType, number> => ({ login: 0, mythbuster: 0, fact: 0, lesson: 0, maze: 0 });

export const toIsoDate = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** The Monday on or before `date`, at local midnight. Weeks run Monday to Sunday. */
export function weekStart(date: Date = new Date()): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
}

/** The key a state is stored under for `period`: it changes exactly when the counters must start again. */
export function periodKey(period: MissionPeriod, date: Date = new Date()): string {
  return period === "daily" ? toIsoDate(date) : toIsoDate(weekStart(date));
}

/** The next reset: local midnight tonight (daily) or local midnight starting next Monday (weekly). */
export function nextReset(period: MissionPeriod, now: Date = new Date()): Date {
  if (period === "daily") return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = weekStart(now);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
}

export interface ResetIn {
  amount: number;
  unit: "HOUR" | "DAY";
}

/** "5 HOURS" or "3 DAYS" until the reset: whole units rounded up, at least 1. Days only when more than a day is left. */
export function timeUntilReset(period: MissionPeriod, now: Date = new Date()): ResetIn {
  const ms = Math.max(0, nextReset(period, now).getTime() - now.getTime());
  const hours = Math.max(1, Math.ceil(ms / 3_600_000));
  if (period === "weekly" && hours > 24) return { amount: Math.ceil(ms / 86_400_000), unit: "DAY" };
  return { amount: hours, unit: "HOUR" };
}

/**
 * The state to use for `key`: the stored one when it belongs to that period (with any counter it
 * lacks filled in), otherwise a fresh one. `fresh` says the caller should save it.
 */
export function resolveState(stored: unknown, key: string): { state: MissionsState; fresh: boolean } {
  const s = stored as Partial<MissionsState> | null | undefined;
  if (s && typeof s === "object" && s.date === key) {
    const progress = emptyProgress();
    for (const type of MISSION_TYPES) {
      const v = (s.progress as Record<string, unknown> | undefined)?.[type];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) progress[type] = v;
    }
    return {
      state: { date: key, progress, claimed: Array.isArray(s.claimed) ? s.claimed.filter((c) => typeof c === "string") : [] },
      fresh: false,
    };
  }
  return { state: { date: key, progress: emptyProgress(), claimed: [] }, fresh: true };
}

/* ---- the chest -------------------------------------------------------------------------------- */

/** Stored in a period's `claimed` list once its chest is opened (a mission id never has this name). */
export const CHEST_ID = "chest";

/** Diamonds in the chest of each period. */
export const CHEST_REWARD: Record<MissionPeriod, number> = { daily: 5, weekly: 25 };

/**
 * How many quests of a period must be claimed to unlock its chest. Daily: every one. Weekly: any 3 of them
 * (the week has more quests than most weeks have time for, so the chest does not wait for all).
 */
export const CHEST_QUESTS_NEEDED: Partial<Record<MissionPeriod, number>> = { weekly: 3 };

/** `needed` for `chestStatus`: the period's rule, never more than the quests there are. */
export const chestNeeded = (period: MissionPeriod, questCount: number): number =>
  Math.min(questCount, CHEST_QUESTS_NEEDED[period] ?? questCount);

export type ChestStatus = "locked" | "ready" | "opened";

/** Locked until `needed` quests (default: every one) are claimed, then ready until it is opened. */
export function chestStatus(missionIds: readonly string[], claimed: readonly string[], needed: number = missionIds.length): ChestStatus {
  if (claimed.includes(CHEST_ID)) return "opened";
  if (missionIds.length === 0 || needed < 1) return "locked";
  return missionIds.filter((id) => claimed.includes(id)).length >= needed ? "ready" : "locked";
}
