import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { createOrUpdateUserProfile, getUserProfile, initDatabase } from './database';
import { getOnboardingCompleted, setLastActiveDate } from './storage';
import { checkDailyStreak } from './utils';

interface UserProfile {
  id?: number;
  user_id: string; // Unique identifier for Supabase sync
  username: string;
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
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingCompleted, setOnboardingCompletedState] = useState(false);

  useEffect(() => {
    initializeStorage();
  }, []);

  const initializeStorage = async () => {
    try {
      setIsLoading(true);
      
      // Initialize database first
      await initDatabase();
      setIsDatabaseReady(true); // Mark database as ready immediately after init
      console.log('Database ready for use');
      
      // Load user profile
      const profile = await getUserProfile();
      if (profile) {
        setUserProfile(profile as UserProfile);
      } else {
        // Create default profile with unique user_id
        const defaultProfile: UserProfile = {
          user_id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          username: 'Scientist',
          avatar_url: 'https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg?auto=compress&cs=tinysrgb&w=200',
          total_xp: 0,
          current_streak: 0,
          longest_streak: 0,
          myths_busted: 0,
          lessons_completed: 0,
        };
        await createOrUpdateUserProfile(defaultProfile);
        setUserProfile(defaultProfile);
      }
      
      // Check onboarding status
      const completed = await getOnboardingCompleted();
      setOnboardingCompletedState(completed);

      // Daily streak tracking
      if (profile) {
        await checkDailyStreak(incrementStreak, updateUserProfile, profile);
      }

      // Update last active date
      const today = new Date().toISOString().split('T')[0];
      await setLastActiveDate(today);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    try {
      await createOrUpdateUserProfile(updates);
      const updatedProfile = await getUserProfile();
      setUserProfile(updatedProfile as UserProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
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
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};

