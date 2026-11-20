/**
 * Pays the XP a finished game round earned (rules in xp-core.ts): adds it to the learner's total (which
 * also counts it in today's activity, the weekly ranking's source). Never throws: a game's result screen must not fail over XP.
 */

export async function awardGameXp(addXP: (amount: number) => Promise<void>, xp: number): Promise<number> {
  if (!(xp > 0)) return 0;
  try {
    await addXP(xp); // addXP also adds it to today's activity
    return xp;
  } catch (error) {
    console.error("Failed to award game XP:", error);
    return 0;
  }
}
