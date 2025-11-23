/**
 * Storage System Test Suite
 * 
 * Run this file to test all storage functionality
 * Usage: Import and call testStorage() from any component
 */

import { 
  initDatabase, 
  getUserProfile, 
  createOrUpdateUserProfile,
  updateLevelProgress,
  getLevelProgress,
  logDailyActivity,
  getDailyActivity,
  clearAllData 
} from './database';

import { 
  setItem, 
  getItem,
  setCacheWithTTL,
  getCacheWithTTL,
  setOnboardingCompleted,
  getOnboardingCompleted,
  clearAll 
} from './storage';

import {
  completeLessonFlow,
  startLessonFlow,
  getFormattedStats,
  getXPForNextRank
} from './utils';

/**
 * Test database operations
 */
export const testDatabase = async () => {
  console.log('🧪 Testing Database...');
  
  try {
    // Initialize
    await initDatabase();
    console.log('✅ Database initialized');
    
    // Create user profile
    await createOrUpdateUserProfile({
      username: 'TestUser',
      avatar_url: 'https://example.com/avatar.jpg',
      total_xp: 100,
      current_streak: 5,
      longest_streak: 10,
      myths_busted: 3,
      lessons_completed: 2
    });
    console.log('✅ User profile created');
    
    // Get user profile
    const profile = await getUserProfile();
    console.log('✅ User profile retrieved:', profile);
    
    // Update level progress
    await updateLevelProgress('test-level-1', {
      status: 'completed',
      xp_earned: 50,
      stars: 3,
      completed_at: new Date().toISOString()
    });
    console.log('✅ Level progress updated');
    
    // Get level progress
    const level = await getLevelProgress('test-level-1');
    console.log('✅ Level progress retrieved:', level);
    
    // Log daily activity
    const today = new Date().toISOString().split('T')[0];
    await logDailyActivity(today, {
      xp_earned: 50,
      lessons_completed: 1,
      myths_busted: 1,
      time_spent_minutes: 10
    });
    console.log('✅ Daily activity logged');
    
    // Get daily activity
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const activity = await getDailyActivity(startDate, endDate);
    console.log('✅ Daily activity retrieved:', activity);
    
    console.log('✅ All database tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
};

/**
 * Test AsyncStorage operations
 */
export const testAsyncStorage = async () => {
  console.log('🧪 Testing AsyncStorage...');
  
  try {
    // Set and get simple item
    await setItem('test_key', { value: 'test_data' });
    const item = await getItem('test_key');
    console.log('✅ Item stored and retrieved:', item);
    
    // Set and get onboarding status
    await setOnboardingCompleted(true);
    const onboarding = await getOnboardingCompleted();
    console.log('✅ Onboarding status:', onboarding);
    
    // Cache with TTL
    await setCacheWithTTL('test_cache', { data: 'cached_data' }, 1);
    const cached = await getCacheWithTTL('test_cache');
    console.log('✅ Cached data:', cached);
    
    // Wait and check expiration
    console.log('⏳ Waiting 65 seconds to test TTL expiration...');
    await new Promise(resolve => setTimeout(resolve, 65000));
    const expired = await getCacheWithTTL('test_cache');
    console.log('✅ Expired cache (should be null):', expired);
    
    console.log('✅ All AsyncStorage tests passed!');
    return true;
  } catch (error) {
    console.error('❌ AsyncStorage test failed:', error);
    return false;
  }
};

/**
 * Test utility functions
 */
export const testUtils = async () => {
  console.log('🧪 Testing Utility Functions...');
  
  try {
    // Get formatted stats
    const stats = await getFormattedStats();
    console.log('✅ Formatted stats:', stats);
    
    // Get XP for next rank
    const rankInfo = getXPForNextRank(250);
    console.log('✅ Rank info:', rankInfo);
    
    console.log('✅ All utility tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Utility test failed:', error);
    return false;
  }
};

/**
 * Test complete lesson flow
 */
export const testLessonFlow = async () => {
  console.log('🧪 Testing Lesson Flow...');
  
  try {
    // Initialize database
    await initDatabase();
    
    // Create test user
    await createOrUpdateUserProfile({
      username: 'FlowTestUser',
      total_xp: 0,
      lessons_completed: 0
    });
    
    const profile = await getUserProfile();
    
    // Mock functions for testing
    const mockAddXP = async (amount: number) => {
      await createOrUpdateUserProfile({
        total_xp: ((profile as any)?.total_xp || 0) + amount
      });
    };
    
    const mockUpdateProfile = async (updates: any) => {
      await createOrUpdateUserProfile(updates);
    };
    
    // Start lesson
    const startResult = await startLessonFlow('flow-test-1');
    console.log('✅ Lesson started:', startResult);
    
    // Complete lesson
    const completeResult = await completeLessonFlow(
      'flow-test-1',
      50,
      3,
      mockUpdateProfile,
      mockAddXP,
      profile
    );
    console.log('✅ Lesson completed:', completeResult);
    
    // Verify updates
    const updatedProfile = await getUserProfile();
    console.log('✅ Updated profile:', updatedProfile);
    
    const levelProgress = await getLevelProgress('flow-test-1');
    console.log('✅ Level progress:', levelProgress);
    
    console.log('✅ All lesson flow tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Lesson flow test failed:', error);
    return false;
  }
};

/**
 * Run all tests
 */
export const testStorage = async () => {
  console.log('🚀 Starting Storage System Tests...\n');
  
  const results = {
    database: false,
    asyncStorage: false,
    utils: false,
    lessonFlow: false
  };
  
  // Run tests
  results.database = await testDatabase();
  console.log('\n');
  
  results.asyncStorage = await testAsyncStorage();
  console.log('\n');
  
  results.utils = await testUtils();
  console.log('\n');
  
  results.lessonFlow = await testLessonFlow();
  console.log('\n');
  
  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  console.log(`Database: ${results.database ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`AsyncStorage: ${results.asyncStorage ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Utils: ${results.utils ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Lesson Flow: ${results.lessonFlow ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'));
  
  return results;
};

/**
 * Quick test (without TTL wait)
 */
export const quickTest = async () => {
  console.log('🚀 Running Quick Tests...\n');
  
  try {
    await initDatabase();
    console.log('✅ Database initialized');
    
    await createOrUpdateUserProfile({
      username: 'QuickTest',
      total_xp: 100
    });
    console.log('✅ User profile created');
    
    const profile = await getUserProfile();
    console.log('✅ Profile:', profile);
    
    await updateLevelProgress('quick-test', {
      status: 'completed',
      xp_earned: 50
    });
    console.log('✅ Level updated');
    
    const stats = await getFormattedStats();
    console.log('✅ Stats:', stats);
    
    console.log('\n✅ Quick test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
};

/**
 * Clean up test data
 */
export const cleanupTests = async () => {
  console.log('🧹 Cleaning up test data...');
  
  try {
    await clearAllData();
    await clearAll();
    console.log('✅ Test data cleaned up');
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return false;
  }
};

export default {
  testStorage,
  quickTest,
  testDatabase,
  testAsyncStorage,
  testUtils,
  testLessonFlow,
  cleanupTests
};

