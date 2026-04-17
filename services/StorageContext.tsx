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
import { useLocalFirst } from "./local-first/hooks";
import {
    DEFAULT_PROFILE_AVATAR_KEY,
    normalizeProfileAvatarKey,
} from "./profile-avatars";
import { syncProfileToSupabase } from "./profile-sync";
import { getOnboardingCompleted, setLastActiveDate } from "./storage";
import { ensureSupabaseAuthUserId, isSupabaseConfigured } from "./supabase";
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
  syncProfileToSupabase: () => Promise<boolean>;
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncedAt: number | null;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const { syncManager, syncNow, isSyncing, pendingChanges, lastSyncedAt } =
    useLocalFirst();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingCompleted, setOnboardingCompletedState] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const generateLocalUserId = () =>
    `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const shouldAdoptAuthUserId = (
    profile: UserProfile,
    authUserId: string,
  ): boolean => {
    if (!profile.user_id || profile.user_id === authUserId) {
      return Boolean(authUserId);
    }

    // Preserve established identities for progressed accounts.
    const isLegacyGeneratedId = profile.user_id.startsWith("user_");
    const isNpcSeedId = profile.user_id.startsWith("npc_user_");
    const hasNpcFriendCode =
      typeof profile.friend_code === "string" &&
      profile.friend_code.toUpperCase().startsWith("NPC");

    if (isNpcSeedId || hasNpcFriendCode) {
      return Boolean(authUserId);
    }

    const hasProgress =
      (profile.total_xp || 0) > 0 ||
      (profile.lessons_completed || 0) > 0 ||
      (profile.myths_busted || 0) > 0;

    return isLegacyGeneratedId && !hasProgress;
  };

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

  useEffect(() => {
    if (!isDatabaseReady || !lastSyncedAt) {
      return;
    }

    void reloadUserProfile();
  }, [isDatabaseReady, lastSyncedAt, reloadUserProfile]);

  const initializeStorage = async () => {
    try {
      setIsLoading(true);

      // Initialize database first
      await initDatabase();
      setIsDatabaseReady(true); // Mark database as ready immediately after init
      console.log("Database ready for use");

      const authUserId = await ensureSupabaseAuthUserId();

      // Load user profile
      const profile = await getUserProfile();
      let activeProfile: UserProfile | null = null;

      if (profile) {
        activeProfile = profile as UserProfile;

        if (authUserId && shouldAdoptAuthUserId(activeProfile, authUserId)) {
          await createOrUpdateUserProfile({ user_id: authUserId });
          const refreshedProfile = await getUserProfile();
          if (refreshedProfile) {
            activeProfile = refreshedProfile as UserProfile;
          }
        }

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
          user_id: authUserId || generateLocalUserId(),
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

  const syncProfileToSupabaseLocal = async (): Promise<boolean> => {
    if (!userProfile || !isOnline) {
      console.log("Offline or no profile to sync");
      return false;
    }

    try {
      if (syncManager?.isEnabled()) {
        try {
          await syncNow();
        } catch (error) {
          console.error("Sync manager failed during profile sync:", error);
          return false;
        }

        const profileSyncStatus =
          await syncManager.getSyncStatus("user_profiles");
        if (profileSyncStatus?.error) {
          console.warn(
            "Profile sync status indicates failure:",
            profileSyncStatus.error,
          );
          return false;
        }

        await reloadUserProfile();
        return true;
      }

      // Fallback for older flows before local-first sync manager is fully enabled.
      const success = await syncProfileToSupabase({
        user_id: userProfile.user_id,
        username: userProfile.username,
        display_name: userProfile.display_name || userProfile.username,
        friend_code: userProfile.friend_code || null,
        display_name_updated_at: userProfile.display_name_updated_at || null,
        next_display_name_change_at:
          userProfile.next_display_name_change_at || null,
        avatar_url: normalizeProfileAvatarKey(userProfile.avatar_url),
        total_xp: userProfile.total_xp,
        current_streak: userProfile.current_streak,
        longest_streak: userProfile.longest_streak,
        myths_busted: userProfile.myths_busted,
        lessons_completed: userProfile.lessons_completed,
      });

      if (success) {
        await reloadUserProfile();
      }

      return success;
    } catch (error) {
      console.error("Error syncing profile:", error);
      return false;
    }
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
        syncProfileToSupabase: syncProfileToSupabaseLocal,
        isOnline,
        isSyncing,
        pendingChanges,
        lastSyncedAt,
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
