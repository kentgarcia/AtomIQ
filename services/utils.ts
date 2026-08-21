/**
 * Common storage utilities and helper functions
 */

import { getLastActiveDate } from './storage';

/**
 * Local timezone ISO date (YYYY-MM-DD). Day boundaries follow the device
 * clock so "today" is always the local day — required for streaks and
 * daily activity to match what users actually see.
 */
export const toLocalIsoDate = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

/**
 * Whole days between two stored dates, using local midnight. Handles
 * legacy full-timestamp values and DST shifts of ±1h between days.
 */
const wholeDaysBetween = (fromIso: string, toIso: string): number | null => {
  const from = new Date(`${String(fromIso).slice(0, 10)}T00:00:00`);
  const to = new Date(`${String(toIso).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return null;
  }

  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

/**
 * Check and update daily streak
 */
export const checkDailyStreak = async (
  incrementStreak: () => Promise<void>,
  updateUserProfile: (updates: any) => Promise<void>,
  userProfile: any
) => {
  try {
    const lastActive = await getLastActiveDate();
    const today = toLocalIsoDate();

    if (!lastActive) {
      // First day using the app — today counts as day 1 of the streak
      await incrementStreak();
      return { streakIncremented: true, streakBroken: false };
    }

    const diffDays = wholeDaysBetween(lastActive, today);

    if (diffDays === null) {
      // Unreadable stored date — restart the streak from today
      await incrementStreak();
      return { streakIncremented: true, streakBroken: false };
    }

    if (diffDays === 1) {
      // Consecutive day - increment streak
      await incrementStreak();
      return { streakIncremented: true, streakBroken: false };
    } else if (diffDays > 1) {
      // Streak broken - reset
      if (userProfile?.current_streak > 0) {
        await updateUserProfile({ current_streak: 0 });
      }
      return { streakIncremented: false, streakBroken: true };
    }

    // Same day - do nothing
    return { streakIncremented: false, streakBroken: false };
  } catch (error) {
    console.error('Error checking daily streak:', error);
    return { streakIncremented: false, streakBroken: false, error };
  }
};

export default {
  checkDailyStreak,
  toLocalIsoDate
};