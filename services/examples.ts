// Example: Integrating Storage into the Lesson Completion Flow
// This file demonstrates how to use the storage system

import { useStorage } from '@/services/StorageContext';
import { updateLevelProgress, logDailyActivity } from '@/services/database';
import { setCurrentLevel } from '@/services/storage';

// Example 1: Completing a Lesson
export const handleLessonComplete = async (levelId: string, xpEarned: number, stars: number) => {
  const { addXP, updateUserProfile, userProfile } = useStorage();
  
  try {
    // 1. Update level progress in database
    await updateLevelProgress(levelId, {
      status: 'completed',
      xp_earned: xpEarned,
      stars: stars,
      completed_at: new Date().toISOString()
    });
    
    // 2. Add XP to user profile
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
      time_spent_minutes: 5 // Estimate or track actual time
    });
    
    console.log('Lesson completed successfully!');
  } catch (error) {
    console.error('Error completing lesson:', error);
  }
};

// Example 2: Busting a Myth
export const handleMythBusted = async () => {
  const { updateUserProfile, userProfile } = useStorage();
  
  if (userProfile) {
    await updateUserProfile({
      myths_busted: userProfile.myths_busted + 1
    });
    
    const today = new Date().toISOString().split('T')[0];
    await logDailyActivity(today, {
      myths_busted: 1
    });
  }
};

// Example 3: Starting a Level
export const handleLevelStart = async (levelId: string) => {
  // Save current level for "Resume" functionality
  await setCurrentLevel(levelId);
  
  // Update level status to "in_progress"
  await updateLevelProgress(levelId, {
    status: 'in_progress'
  });
};

// Example 4: Daily Streak Check
export const checkAndUpdateStreak = async () => {
  const { incrementStreak, userProfile } = useStorage();
  const { getLastActiveDate } = await import('@/services/storage');
  
  const lastActive = await getLastActiveDate();
  const today = new Date().toISOString().split('T')[0];
  
  if (!lastActive) {
    // First time user
    await incrementStreak();
    return;
  }
  
  const lastDate = new Date(lastActive);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    // Consecutive day - increment streak
    await incrementStreak();
  } else if (diffDays > 1) {
    // Streak broken - reset
    if (userProfile) {
      await updateUserProfile({ current_streak: 0 });
    }
  }
  // If diffDays === 0, same day - do nothing
};

// Example 5: Loading User Dashboard Data
export const loadDashboardData = async () => {
  const { userProfile } = useStorage();
  const { getDailyActivity } = await import('@/services/database');
  
  // Get last 7 days of activity
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const weeklyActivity = await getDailyActivity(startDate, endDate);
  
  return {
    userProfile,
    weeklyActivity,
    weeklyXP: weeklyActivity.reduce((sum: number, day: any) => sum + day.xp_earned, 0),
    weeklyLessons: weeklyActivity.reduce((sum: number, day: any) => sum + day.lessons_completed, 0)
  };
};

// Example 6: Caching Leaderboard Data
export const cacheLeaderboard = async (leaderboardData: any[]) => {
  const { setCacheWithTTL } = await import('@/services/storage');
  
  // Cache for 30 minutes
  await setCacheWithTTL('leaderboard', leaderboardData, 30);
};

export const getLeaderboard = async () => {
  const { getCacheWithTTL } = await import('@/services/storage');
  
  // Try to get from cache first
  const cached = await getCacheWithTTL('leaderboard');
  
  if (cached) {
    console.log('Using cached leaderboard');
    return cached;
  }
  
  // If not cached, fetch from API
  // const fresh = await fetchLeaderboardFromAPI();
  // await cacheLeaderboard(fresh);
  // return fresh;
  
  return null;
};

