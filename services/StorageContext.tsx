import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { AppState } from "react-native";
import {
    createOrUpdateUserProfile,
    getUserProfile,
    initDatabase,
} from "./database";
import {
    DEFAULT_PROFILE_AVATAR_KEY,
    normalizeProfileAvatarKey,
} from "./profile-avatars";
import { getOnboardingCompleted, setLastActiveDate } from "./storage";
import { recordMissionEvent } from "./missions";
import { isSupabaseConfigured } from "./supabase";
import { checkDailyStreak, toLocalIsoDate } from "./utils";

interface UserProfile {
  id?: number;
  user_id: string; // Unique identifier for Supabase sync
  username: string;
  display_name?: string;
  friend_code?: string | null;
  display_name_updated_at?: number | null;
  next_display_name_change_at?: number | null;
  avatar_url: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  myths_busted: number;
  lessons_completed: number;
}

interface StorageContextType {
  isLoading: boolean;
  isInitialized: boolean;
  isDatabaseReady: boolean;
  userProfile: UserProfile | null;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  incrementStreak: () => Promise<void>;
  levelUpLevel: number | null;
  dismissLevelUp: () => void;
  onboardingCompleted: boolean;
  isOnline: boolean;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingCompleted, setOnboardingCompletedState] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  const generateLocalUserId = () =>
    `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const reloadUserProfile = useCallback(async () => {
    const profile = (await getUserProfile()) as UserProfile | null;
    if (!profile) {
      setUserProfile(null);
      return;
    }

    const normalizedAvatar = normalizeProfileAvatarKey(profile.avatar_url);
    if (profile.avatar_url !== normalizedAvatar) {
      await createOrUpdateUserProfile({ avatar_url: normalizedAvatar });
      const refreshedProfile = (await getUserProfile()) as UserProfile | null;
      setUserProfile(
        refreshedProfile || { ...profile, avatar_url: normalizedAvatar },
      );
      return;
    }

    setUserProfile(profile);
  }, []);

  const checkConnectivity = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsOnline(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`,
        {
          method: "HEAD",
          headers: {
            apikey:
              process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
              process.env.EXPO_PUBLIC_SUPABASE_KEY ||
              "",
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      // Any non-5xx response confirms network reachability to Supabase.
      setIsOnline(response.status < 500);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    initializeStorage();
  }, []);

  useEffect(() => {
    void checkConnectivity();

    const intervalId = setInterval(() => {
      void checkConnectivity();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [checkConnectivity]);

  const initializeStorage = async () => {
    try {
      setIsLoading(true);

      // Initialize database first
      await initDatabase();
      setIsDatabaseReady(true); // Mark database as ready immediately after init
      console.log("Database ready for use");

      // Load user profile
      const profile = await getUserProfile();
      let activeProfile: UserProfile | null = null;

      if (profile) {
        activeProfile = profile as UserProfile;

        if (!activeProfile?.friend_code) {
          await createOrUpdateUserProfile({ user_id: activeProfile.user_id });
          const refreshedWithFriendCode = await getUserProfile();
          if (refreshedWithFriendCode) {
            activeProfile = refreshedWithFriendCode as UserProfile;
          }
        }

        if (activeProfile) {
          const normalizedAvatar = normalizeProfileAvatarKey(
            activeProfile.avatar_url,
          );
          if (activeProfile.avatar_url !== normalizedAvatar) {
            await createOrUpdateUserProfile({ avatar_url: normalizedAvatar });
            const refreshedWithAvatar = await getUserProfile();
            if (refreshedWithAvatar) {
              activeProfile = refreshedWithAvatar as UserProfile;
            }
          }
        }

        setUserProfile(activeProfile);
      } else {
        // Create default profile with unique user_id
        const defaultProfile: UserProfile = {
          user_id: generateLocalUserId(),
          username: "Scientist",
          display_name: "Scientist",
          avatar_url: DEFAULT_PROFILE_AVATAR_KEY,
          total_xp: 0,
          current_streak: 0,
          longest_streak: 0,
          myths_busted: 0,
          lessons_completed: 0,
        };
        await createOrUpdateUserProfile(defaultProfile);
        const createdProfile = await getUserProfile();
        activeProfile = (createdProfile as UserProfile) || defaultProfile;
        setUserProfile(activeProfile);
      }

      // Check onboarding status
      const completed = await getOnboardingCompleted();
      setOnboardingCompletedState(completed);

      // Daily streak tracking + daily login mission (idempotent per day;
      // also re-runs whenever the app returns to the foreground)
      await ensureDailyTracking();

      setIsInitialized(true);
    } catch (error) {
      console.error("Error initializing storage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        const normalizedUpdates: Partial<UserProfile> = {
          ...updates,
          ...(updates.avatar_url !== undefined
            ? { avatar_url: normalizeProfileAvatarKey(updates.avatar_url) }
            : {}),
        };

        await createOrUpdateUserProfile(normalizedUpdates);
        await reloadUserProfile();
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
      }
    },
    [reloadUserProfile],
  );

  const addXP = useCallback(
    async (amount: number) => {
      // Read the freshest profile from the DB — React state can lag during
      // rapid, overlapping awards (lesson + mission claim), which would
      // otherwise clobber XP.
      const profile = (await getUserProfile()) as UserProfile | null;
      if (!profile) return;

      const prevTotalXP = profile.total_xp || 0;
      const newTotalXP = prevTotalXP + Math.max(0, Math.round(amount));

      await updateUserProfile({ total_xp: newTotalXP });

      // Level-up detection — every 100 XP bumps the displayed level
      const prevLevel = Math.floor(prevTotalXP / 100) + 1;
      const newLevel = Math.floor(newTotalXP / 100) + 1;
      if (newLevel > prevLevel) {
        setLevelUpLevel(newLevel);
      }
    },
    [updateUserProfile],
  );

  const incrementStreak = useCallback(async () => {
    // Read the freshest profile from the DB directly — during cold-start
    // initialization the React state (`userProfile`) has not flushed yet
    // and would still be null, silently dropping the increment.
    const profile = (await getUserProfile()) as UserProfile | null;
    if (!profile) return;

    const newStreak = (profile.current_streak || 0) + 1;
    const newLongest = Math.max(newStreak, profile.longest_streak || 0);

    await updateUserProfile({
      current_streak: newStreak,
      longest_streak: newLongest,
    });
  }, [updateUserProfile]);

  // Idempotent per-day tracker: runs the streak check, marks the day as
  // active, and credits the daily login mission — exactly once per day.
  // A promise lock serializes concurrent invocations (cold-start init can
  // race AppState "active") so the streak can never double-increment.
  const dailyTrackedDateRef = useRef<string | null>(null);
  const dailyTrackingPromiseRef = useRef<Promise<void> | null>(null);

  const ensureDailyTracking = useCallback((): Promise<void> => {
    const today = toLocalIsoDate();
    if (dailyTrackedDateRef.current === today) {
      return Promise.resolve();
    }

    if (!dailyTrackingPromiseRef.current) {
      dailyTrackingPromiseRef.current = (async () => {
        try {
          const profile = (await getUserProfile()) as UserProfile | null;
          await checkDailyStreak(incrementStreak, updateUserProfile, profile);
        } catch (error) {
          // Keep the day unclaimed so the next foreground retries.
          console.error("Error running daily streak check:", error);
          return;
        }

        // A successful app open today counts as a daily login
        await setLastActiveDate(today);
        await recordMissionEvent("login", 1);
        dailyTrackedDateRef.current = today;
      })().finally(() => {
        dailyTrackingPromiseRef.current = null;
      });
    }

    return dailyTrackingPromiseRef.current;
  }, [incrementStreak, updateUserProfile]);

  // Keep streaks + daily-login mission honest when the app is backgrounded
  // overnight and reopened without a cold start (midnight rollover).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void ensureDailyTracking();
      }
    });
    return () => subscription.remove();
  }, [ensureDailyTracking]);

  const dismissLevelUp = useCallback(() => {
    setLevelUpLevel(null);
  }, []);

  return (
    <StorageContext.Provider
      value={{
        isLoading,
        isInitialized,
        isDatabaseReady,
        userProfile,
        updateUserProfile,
        addXP,
        incrementStreak,
        levelUpLevel,
        dismissLevelUp,
        onboardingCompleted,
        isOnline,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error("useStorage must be used within a StorageProvider");
  }
  return context;
};
