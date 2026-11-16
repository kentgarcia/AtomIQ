import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
export const STORAGE_KEYS = {
  // App State
  ONBOARDING_COMPLETED: '@atomiq:onboarding_completed',
  FIRST_LAUNCH: '@atomiq:first_launch',
  APP_VERSION: '@atomiq:app_version',
  BETA_NOTICE_SEEN: '@atomiq:beta_notice_seen',
  
  // User Preferences
  THEME: '@atomiq:theme',
  NOTIFICATIONS_ENABLED: '@atomiq:notifications_enabled',
  SOUND_ENABLED: '@atomiq:sound_enabled',
  MUSIC_ENABLED: '@atomiq:music_enabled',
  READ_ALOUD_ENABLED: '@atomiq:read_aloud_enabled',
  HAPTICS_ENABLED: '@atomiq:haptics_enabled',
  TEACHER_LINES_ENABLED: '@atomiq:teacher_lines_enabled',
  /** Ids of the teachers the learner has been introduced to (JSON array). */
  MET_TEACHERS: '@atomiq:met_teachers',
  
  // Session Data
  LAST_ACTIVE_DATE: '@atomiq:last_active_date',
  CURRENT_UNIT: '@atomiq:current_unit',
  CURRENT_LEVEL: '@atomiq:current_level',
  
  // Cache
  LEADERBOARD_CACHE: '@atomiq:leaderboard_cache',
  FEED_CACHE: '@atomiq:feed_cache',

  // Achievements
  ACHIEVEMENT_UNLOCKS: '@atomiq:achievement_unlocks',

  // Discovery Hub
  READ_ARTICLES: '@atomiq:read_articles',
} as const;

// Generic Storage Operations
export const setItem = async (key: string, value: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
    throw error;
  }
};

export const getItem = async <T = any>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
};

export const removeItem = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item ${key}:`, error);
    throw error;
  }
};

export const clearAll = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
};

// Specific Storage Operations

// Onboarding
export const setOnboardingCompleted = async (completed: boolean): Promise<void> => {
  await setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed);
};

export const getOnboardingCompleted = async (): Promise<boolean> => {
  const value = await getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED);
  return value ?? false;
};

// First Launch
export const setFirstLaunch = async (isFirst: boolean): Promise<void> => {
  await setItem(STORAGE_KEYS.FIRST_LAUNCH, isFirst);
};

export const getFirstLaunch = async (): Promise<boolean> => {
  const value = await getItem<boolean>(STORAGE_KEYS.FIRST_LAUNCH);
  return value ?? true; // Default to true if not set
};

// Public Beta
export const setBetaNoticeSeen = async (noticeId: string): Promise<void> => {
  await setItem(STORAGE_KEYS.BETA_NOTICE_SEEN, noticeId);
};

export const getBetaNoticeSeen = async (): Promise<string | null> => {
  return await getItem<string>(STORAGE_KEYS.BETA_NOTICE_SEEN);
};

// User Preferences
export const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  await setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, enabled);
};

export const getNotificationsEnabled = async (): Promise<boolean> => {
  const value = await getItem<boolean>(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
  return value ?? true;
};

export const setSoundEnabled = async (enabled: boolean): Promise<void> => {
  await setItem(STORAGE_KEYS.SOUND_ENABLED, enabled);
};

export const getSoundEnabled = async (): Promise<boolean> => {
  const value = await getItem<boolean>(STORAGE_KEYS.SOUND_ENABLED);
  return value ?? true;
};

export const setMusicEnabled = async (enabled: boolean): Promise<void> => {
  await setItem(STORAGE_KEYS.MUSIC_ENABLED, enabled);
};

export const getMusicEnabled = async (): Promise<boolean> => {
  const value = await getItem<boolean>(STORAGE_KEYS.MUSIC_ENABLED);
  return value ?? true;
};

export const setReadAloudEnabled = async (enabled: boolean): Promise<void> => {
  await setItem(STORAGE_KEYS.READ_ALOUD_ENABLED, enabled);
};

export const getReadAloudEnabled = async (): Promise<boolean> => {
  const value = await getItem<boolean>(STORAGE_KEYS.READ_ALOUD_ENABLED);
  return value ?? true;
};

export const setTheme = async (theme: 'light' | 'dark'): Promise<void> => {
  await setItem(STORAGE_KEYS.THEME, theme);
};

export const getTheme = async (): Promise<'light' | 'dark' | null> => {
  const value = await getItem<'light' | 'dark'>(STORAGE_KEYS.THEME);
  return value ?? null;
};

export const setHapticsEnabled = async (enabled: boolean): Promise<void> => {
  await setItem(STORAGE_KEYS.HAPTICS_ENABLED, enabled);
};

export const getHapticsEnabled = async (): Promise<boolean> => {
  const value = await getItem<boolean>(STORAGE_KEYS.HAPTICS_ENABLED);
  return value ?? true;
};

// Teacher lines (NPC speech bubbles and chips). On by default.
export const setTeacherLinesEnabled = async (enabled: boolean): Promise<void> => {
  await setItem(STORAGE_KEYS.TEACHER_LINES_ENABLED, enabled);
};

export const getTeacherLinesEnabled = async (): Promise<boolean> => {
  const value = await getItem<boolean>(STORAGE_KEYS.TEACHER_LINES_ENABLED);
  return value ?? true;
};

// Teachers the learner has met (the introduction page shows once per teacher)
export const getMetTeachers = async (): Promise<string[]> => {
  const value = await getItem<string[]>(STORAGE_KEYS.MET_TEACHERS);
  return Array.isArray(value) ? value : [];
};

export const markTeacherMet = async (npcId: string): Promise<void> => {
  const met = await getMetTeachers();
  if (!met.includes(npcId)) await setItem(STORAGE_KEYS.MET_TEACHERS, [...met, npcId]);
};

// Session Data
export const setLastActiveDate = async (date: string): Promise<void> => {
  await setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, date);
};

export const getLastActiveDate = async (): Promise<string | null> => {
  return await getItem<string>(STORAGE_KEYS.LAST_ACTIVE_DATE);
};

export const setCurrentLevel = async (levelId: string): Promise<void> => {
  await setItem(STORAGE_KEYS.CURRENT_LEVEL, levelId);
};

export const getCurrentLevel = async (): Promise<string | null> => {
  return await getItem<string>(STORAGE_KEYS.CURRENT_LEVEL);
};

// Cache with TTL
export const setCacheWithTTL = async (key: string, data: any, ttlMinutes: number = 60): Promise<void> => {
  const cacheData = {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000, // Convert to milliseconds
  };
  await setItem(key, cacheData);
};

export const getCacheWithTTL = async <T = any>(key: string): Promise<T | null> => {
  const cached = await getItem<{ data: T; timestamp: number; ttl: number }>(key);
  
  if (!cached) return null;
  
  const now = Date.now();
  const isExpired = now - cached.timestamp > cached.ttl;
  
  if (isExpired) {
    await removeItem(key);
    return null;
  }
  
  return cached.data;
};

// Achievement unlocks
export const getUnlockedAchievementIds = async (): Promise<number[] | null> => {
  return await getItem<number[]>(STORAGE_KEYS.ACHIEVEMENT_UNLOCKS);
};

export const setUnlockedAchievementIds = async (ids: number[]): Promise<void> => {
  await setItem(STORAGE_KEYS.ACHIEVEMENT_UNLOCKS, ids);
};

// Batch Operations
export const setMultiple = async (items: [string, any][]): Promise<void> => {
  try {
    const pairs = items.map(([key, value]) => [key, JSON.stringify(value)] as [string, string]);
    await AsyncStorage.multiSet(pairs);
  } catch (error) {
    console.error('Error setting multiple items:', error);
    throw error;
  }
};

export const getMultiple = async (keys: string[]): Promise<Record<string, any>> => {
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const result: Record<string, any> = {};
    
    pairs.forEach(([key, value]) => {
      if (value) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error getting multiple items:', error);
    return {};
  }
};

export default {
  setItem,
  getItem,
  removeItem,
  clearAll,
  setOnboardingCompleted,
  getOnboardingCompleted,
  setFirstLaunch,
  getFirstLaunch,
  setNotificationsEnabled,
  getNotificationsEnabled,
  setSoundEnabled,
  getSoundEnabled,
  setHapticsEnabled,
  getHapticsEnabled,
  setLastActiveDate,
  getLastActiveDate,
  setCurrentLevel,
  getCurrentLevel,
  setCacheWithTTL,
  getCacheWithTTL,
  setMultiple,
  getMultiple,
  getUnlockedAchievementIds,
  setUnlockedAchievementIds,
};

