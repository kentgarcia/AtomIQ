/**
 * Pays the XP a finished game round earned (rules in xp-core.ts): adds it to the learner's total and
 * to today's activity. Never throws: a game's result screen must not fail over XP.
 */

import { logDailyActivity } from "@/services/database";
import { toLocalIsoDate } from "@/services/utils";

export async function awardGameXp(addXP: (amount: number) => Promise<void>, xp: number): Promise<number> {
  if (!(xp > 0)) return 0;
  try {
    await addXP(xp);
    await logDailyActivity(toLocalIsoDate(), { xp_earned: xp });
    return xp;
  } catch (error) {
    console.error("Failed to award game XP:", error);
    return 0;
  }
}
