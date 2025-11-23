import { useState, useEffect, useCallback, useContext } from 'react';
import { getLevelProgress, getAllLevels, getDailyActivity } from '@/services/database';
import { getCurrentLevel, getCacheWithTTL } from '@/services/storage';
import { useStorage as useStorageContext } from '@/services/StorageContext';

/**
 * Hook to get level progress
 */
export const useLevelProgress = (levelId: string) => {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const data = await getLevelProgress(levelId);
        setProgress(data);
      } catch (error) {
        console.error('Error loading level progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [levelId]);

  return { progress, loading };
};

/**
 * Hook to get all levels progress
 */
export const useAllLevels = () => {
  const { isDatabaseReady } = useStorageContext();
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If database is not ready yet, keep loading state true
    if (!isDatabaseReady) {
      console.log('Waiting for database to be ready...');
      return;
    }

    console.log('Database ready, loading levels...');
    const loadLevels = async () => {
      try {
        const data = await getAllLevels();
        console.log('Loaded levels:', data.length);
        setLevels(data);
      } catch (error) {
        console.error('Error loading levels:', error);
        // Set empty array on error so UI can still render
        setLevels([]);
      } finally {
        setLoading(false);
      }
    };

    loadLevels();
  }, [isDatabaseReady]);

  const refresh = useCallback(async () => {
    if (!isDatabaseReady) {
      console.warn('Cannot refresh: database not ready');
      return;
    }

    try {
      setLoading(true);
      const data = await getAllLevels();
      setLevels(data);
    } catch (error) {
      console.error('Error refreshing levels:', error);
      setLevels([]);
    } finally {
      setLoading(false);
    }
  }, [isDatabaseReady]);

  return { levels, loading, refresh };
};

/**
 * Hook to get current level (for Resume functionality)
 */
export const useCurrentLevel = () => {
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentLevel = async () => {
      try {
        const level = await getCurrentLevel();
        setCurrentLevel(level);
      } catch (error) {
        console.error('Error loading current level:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentLevel();
  }, []);

  return { currentLevel, loading };
};

/**
 * Hook to get weekly activity for charts
 */
export const useWeeklyActivity = () => {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        const data = await getDailyActivity(startDate, endDate);
        setActivity(data);
      } catch (error) {
        console.error('Error loading weekly activity:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, []);

  const totalXP = activity.reduce((sum, day: any) => sum + (day.xp_earned || 0), 0);
  const totalLessons = activity.reduce((sum, day: any) => sum + (day.lessons_completed || 0), 0);
  const totalMyths = activity.reduce((sum, day: any) => sum + (day.myths_busted || 0), 0);

  return { activity, loading, totalXP, totalLessons, totalMyths };
};

/**
 * Hook to get cached data with automatic refresh
 */
export const useCachedData = <T = any>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlMinutes: number = 60
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!forceRefresh) {
        // Try cache first
        const cached = await getCacheWithTTL<T>(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const fresh = await fetchFn();
      setData(fresh);

      // Cache it
      const { setCacheWithTTL } = await import('@/services/storage');
      await setCacheWithTTL(cacheKey, fresh, ttlMinutes);
    } catch (err) {
      setError(err as Error);
      console.error(`Error loading cached data for ${cacheKey}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cacheKey]);

  const refresh = () => loadData(true);

  return { data, loading, error, refresh };
};

