import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
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
import { checkDailyStreak } from "./utils";

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

      // Daily streak tracking
      if (activeProfile) {
        await checkDailyStreak(
          incrementStreak,
          updateUserProfile,
          activeProfile,
        );
      }

      // Update last active date
      const today = new Date().toISOString().split("T")[0];
      await setLastActiveDate(today);

      // A successful app launch today counts as a daily login
      await recordMissionEvent("login", 1);

      setIsInitialized(true);
    } catch (error) {
      console.error("Error initializing storage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
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
  };

  const addXP = async (amount: number) => {
    if (!userProfile) return;

    const newTotalXP = userProfile.total_xp + amount;
    await updateUserProfile({ total_xp: newTotalXP });
  };

  const incrementStreak = async () => {
    if (!userProfile) return;

    const newStreak = userProfile.current_streak + 1;
    const newLongest = Math.max(newStreak, userProfile.longest_streak);

    await updateUserProfile({
      current_streak: newStreak,
      longest_streak: newLongest,
    });
  };

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
