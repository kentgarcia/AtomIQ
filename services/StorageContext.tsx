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
    logDailyActivity,
} from "./database";
import {
    DEFAULT_AVATAR_VALUE,
    normalizeAvatarValue,
} from "@/components/avatar/avatar-core";
import { recordChatAppOpen } from "./chats";
import { checkFeedOnAppOpen, emitRankCheck, emitStreak } from "./feed";
import { getLastActiveDate, getOnboardingCompleted, setLastActiveDate, setOnboardingCompleted } from "./storage";
import { recordMissionEvent } from "./missions";
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
  /** The level the learner was on before the first of the levels not yet celebrated (several level-ups are one celebration). */
  levelUpFrom: number | null;
  dismissLevelUp: () => void;
  /** True once today's streak has gone up and the daily streak screen has not been shown yet. */
  pendingStreakCelebration: boolean;
  clearStreakCelebration: () => void;
  onboardingCompleted: boolean;
  /** Saves whether onboarding is finished and updates what the rest of the app sees (the delete-account flow turns it off again). */
  setOnboardingDone: (done: boolean) => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingCompleted, setOnboardingCompletedState] = useState(false);
  const [pendingStreakCelebration, setPendingStreakCelebration] = useState(false);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);
  const levelUpLevel = levelUp?.to ?? null;
  const levelUpFrom = levelUp?.from ?? null;

  const generateLocalUserId = () =>
    `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const reloadUserProfile = useCallback(async () => {
    const profile = (await getUserProfile()) as UserProfile | null;
    if (!profile) {
      setUserProfile(null);
      return;
    }

    const normalizedAvatar = normalizeAvatarValue(profile.avatar_url);
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

  useEffect(() => {
    initializeStorage();
  }, []);

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
          const normalizedAvatar = normalizeAvatarValue(
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
          avatar_url: DEFAULT_AVATAR_VALUE,
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
            ? { avatar_url: normalizeAvatarValue(updates.avatar_url) }
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
      // Every source of XP (lessons, games, quests, facts, the tour) passes here, so this is the one place
      // that counts it in today's activity, which is what the weekly ranking adds up.
      const gained = newTotalXP - prevTotalXP;
      if (gained > 0) await logDailyActivity(toLocalIsoDate(), { xp_earned: gained }).catch(() => {});
      emitRankCheck(); // the NPC feed may notice a rank change (fire-and-forget)

      // Level-up detection — every 100 XP bumps the displayed level
      const prevLevel = Math.floor(prevTotalXP / 100) + 1;
      const newLevel = Math.floor(newTotalXP / 100) + 1;
      if (newLevel > prevLevel) {
        // A level-up not yet celebrated keeps its starting level, so 1 to 5 is one celebration, not five
        setLevelUp((pending) => ({ from: pending ? pending.from : prevLevel, to: newLevel }));
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
    emitStreak(newStreak); // the NPC feed posts at 3, 7, 14, 30, 60 and 100 days (fire-and-forget)
  }, [updateUserProfile]);

  // Idempotent per-day tracker: runs the streak check, marks the day as
  // active, and credits the daily login mission — exactly once per day.
  // A promise lock serializes concurrent invocations (cold-start init can
  // race AppState "active") so the streak can never double-increment.
  const dailyTrackedDateRef = useRef<string | null>(null);
  // Set while onboarding hands over a brand-new account: the day still counts, but the streak screen is not queued
  // (the welcome moment just played, and a day-1 streak is not news).
  const skipStreakScreenRef = useRef(false);
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
          // No profile: the account was just deleted and onboarding has not made the new one yet.
          // Leave the day unclaimed (the streak would be dropped and the day marked as done); the tracker
          // runs again when onboarding finishes (`setOnboardingDone(true)`).
          if (!profile) return;
          const result = await checkDailyStreak(incrementStreak, updateUserProfile, profile);
          // Today's streak went up: queue the daily streak screen (once per day,
          // since this tracker only runs once per day)
          if (result.streakIncremented && !skipStreakScreenRef.current) setPendingStreakCelebration(true);
        } catch (error) {
          // Keep the day unclaimed so the next foreground retries.
          console.error("Error running daily streak check:", error);
          return;
        }

        // A successful app open today counts as a daily login
        // The tracker's own "already done today" flag lives in memory, so every cold start gets here again.
        // The saved last-active date is what makes a login count once per calendar day.
        const alreadyLoggedToday = (await getLastActiveDate()) === today;
        await setLastActiveDate(today);
        if (!alreadyLoggedToday) await recordMissionEvent("login", 1);
        dailyTrackedDateRef.current = today;
        void checkFeedOnAppOpen(); // comeback post and feed retention; never rejects
        void recordChatAppOpen(); // a teacher may welcome the learner back; never rejects
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
    setLevelUp(null);
  }, []);

  const setOnboardingDone = useCallback(
    async (done: boolean) => {
      await setOnboardingCompleted(done);
      setOnboardingCompletedState(done);
      if (!done) {
        // Delete Account wipes the streak, last-active date and missions, so "today was tracked" is no
        // longer true: forget it, or a new account gets no login, streak or feed check until a restart.
        dailyTrackedDateRef.current = null;
        setPendingStreakCelebration(false);
        return;
      }
      // The new profile exists now. A normal first launch has already been tracked today, so this is a no-op there.
      skipStreakScreenRef.current = true;
      try {
        await ensureDailyTracking();
      } catch (error) {
        console.error("Error running daily tracking after onboarding:", error);
      } finally {
        skipStreakScreenRef.current = false;
      }
    },
    [ensureDailyTracking],
  );

  const clearStreakCelebration = useCallback(() => {
    setPendingStreakCelebration(false);
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
        levelUpFrom,
        dismissLevelUp,
        pendingStreakCelebration,
        clearStreakCelebration,
        onboardingCompleted,
        setOnboardingDone,
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
