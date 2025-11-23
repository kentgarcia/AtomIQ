/**
 * Common storage utilities and helper functions
 */

import { updateLevelProgress, logDailyActivity, getUserProfile } from './database';
import { setCurrentLevel, getLastActiveDate } from './storage';

/**
 * Complete a lesson and update all related data
 */
export const completeLessonFlow = async (
  levelId: string,
  xpEarned: number,
  stars: number,
  updateUserProfile: (updates: any) => Promise<void>,
  addXP: (amount: number) => Promise<void>,
  userProfile: any
) => {
  try {
    // 1. Update level progress
    await updateLevelProgress(levelId, {
      status: 'completed',
      xp_earned: xpEarned,
      stars: stars,
      completed_at: new Date().toISOString()
    });

    // 2. Add XP to user
    await addXP(xpEarned);

    // 3. Increment lessons completed
    if (userProfile) {
      await updateUserProfile({
        lessons_completed: userProfile.lessons_completed + 1
      });
    }

    // 4. Log daily activity
    const today = new Date().toISOString().split('T')[0];
    await logDailyActivity(today, {
      xp_earned: xpEarned,
      lessons_completed: 1,
      time_spent_minutes: 5 // Can be tracked more accurately
    });

    return { success: true };
  } catch (error) {
    console.error('Error completing lesson:', error);
    return { success: false, error };
  }
};

/**
 * Start a lesson and mark as in progress
 */
export const startLessonFlow = async (levelId: string) => {
  try {
    // Save current level for Resume functionality
    await setCurrentLevel(levelId);

    // Update level status
    await updateLevelProgress(levelId, {
      status: 'in_progress'
    });

    return { success: true };
  } catch (error) {
    console.error('Error starting lesson:', error);
    return { success: false, error };
  }
};

/**
 * Record a myth being busted
 */
export const bustMythFlow = async (
  updateUserProfile: (updates: any) => Promise<void>,
  userProfile: any
) => {
  try {
    if (userProfile) {
      await updateUserProfile({
        myths_busted: userProfile.myths_busted + 1
      });

      const today = new Date().toISOString().split('T')[0];
      await logDailyActivity(today, {
        myths_busted: 1
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error busting myth:', error);
    return { success: false, error };
  }
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
    const today = new Date().toISOString().split('T')[0];

    if (!lastActive) {
      // First time user
      await incrementStreak();
      return { streakIncremented: true, streakBroken: false };
    }

    const lastDate = new Date(lastActive);
    const todayDate = new Date(today);
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      // Consecutive day - increment streak
      await incrementStreak();
      return { streakIncremented: true, streakBroken: false };
    } else if (diffDays > 1) {
      // Streak broken - reset
      if (userProfile) {
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

/**
 * Get formatted stats for display
 */
export const getFormattedStats = async () => {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return {
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        mythsBusted: 0,
        lessonsCompleted: 0,
        rank: 'Beginner'
      };
    }

    // Determine rank based on XP
    let rank = 'Beginner';
    const xp = (profile as any).total_xp || 0;
    
    if (xp >= 5000) rank = 'Nuclear Expert';
    else if (xp >= 2000) rank = 'Reactor Operator';
    else if (xp >= 1000) rank = 'Nuclear Technician';
    else if (xp >= 500) rank = 'Lab Assistant';
    else if (xp >= 100) rank = 'Student';

    return {
      totalXP: (profile as any).total_xp || 0,
      currentStreak: (profile as any).current_streak || 0,
      longestStreak: (profile as any).longest_streak || 0,
      mythsBusted: (profile as any).myths_busted || 0,
      lessonsCompleted: (profile as any).lessons_completed || 0,
      rank
    };
  } catch (error) {
    console.error('Error getting formatted stats:', error);
    return {
      totalXP: 0,
      currentStreak: 0,
      longestStreak: 0,
      mythsBusted: 0,
      lessonsCompleted: 0,
      rank: 'Beginner'
    };
  }
};

/**
 * Calculate XP needed for next rank
 */
export const getXPForNextRank = (currentXP: number) => {
  const ranks = [
    { name: 'Beginner', xp: 0 },
    { name: 'Student', xp: 100 },
    { name: 'Lab Assistant', xp: 500 },
    { name: 'Nuclear Technician', xp: 1000 },
    { name: 'Reactor Operator', xp: 2000 },
    { name: 'Nuclear Expert', xp: 5000 },
  ];

  for (let i = 0; i < ranks.length; i++) {
    if (currentXP < ranks[i].xp) {
      return {
        nextRank: ranks[i].name,
        xpNeeded: ranks[i].xp - currentXP,
        progress: i > 0 ? (currentXP - ranks[i - 1].xp) / (ranks[i].xp - ranks[i - 1].xp) : 0
      };
    }
  }

  return {
    nextRank: 'Max Rank',
    xpNeeded: 0,
    progress: 1
  };
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Get achievement progress
 */
export const getAchievementProgress = (userProfile: any) => {
  const achievements = [
    {
      id: 'first_lesson',
      title: 'First Steps',
      description: 'Complete your first lesson',
      icon: 'Book',
      unlocked: (userProfile?.lessons_completed || 0) >= 1
    },
    {
      id: 'myth_buster',
      title: 'Myth Buster',
      description: 'Bust 10 myths',
      icon: 'ShieldTick',
      unlocked: (userProfile?.myths_busted || 0) >= 10
    },
    {
      id: 'week_streak',
      title: 'Dedicated Learner',
      description: 'Maintain a 7-day streak',
      icon: 'Flash',
      unlocked: (userProfile?.current_streak || 0) >= 7
    },
    {
      id: 'xp_master',
      title: 'XP Master',
      description: 'Earn 1000 XP',
      icon: 'Crown1',
      unlocked: (userProfile?.total_xp || 0) >= 1000
    },
    {
      id: 'completionist',
      title: 'Completionist',
      description: 'Complete 50 lessons',
      icon: 'Cup',
      unlocked: (userProfile?.lessons_completed || 0) >= 50
    }
  ];

  return achievements;
};

export default {
  completeLessonFlow,
  startLessonFlow,
  bustMythFlow,
  checkDailyStreak,
  getFormattedStats,
  getXPForNextRank,
  formatDate,
  getAchievementProgress
};

