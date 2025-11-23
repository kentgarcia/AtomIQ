# 🔄 Migration Guide: Integrating Storage into Existing Screens

This guide shows you how to add storage functionality to your existing screens.

## Table of Contents
1. [Home Dashboard](#home-dashboard)
2. [Map View](#map-view)
3. [Profile Screen](#profile-screen)
4. [Leaderboard](#leaderboard)
5. [Wiki/Community](#wikicommunity)

---

## Home Dashboard

### Current: `app/(tabs)/index.tsx`

**Add these imports:**
```typescript
import { useStorage } from '@/services/StorageContext';
import { useWeeklyActivity, useCurrentLevel } from '@/hooks/use-storage';
```

**Use the hooks:**
```typescript
export default function HomeScreen() {
  const router = useRouter();
  const { userProfile } = useStorage();
  const { activity, totalXP, totalLessons } = useWeeklyActivity();
  const { currentLevel } = useCurrentLevel();
  
  // Use userProfile data
  const displayXP = userProfile?.total_xp || 0;
  const displayStreak = userProfile?.current_streak || 0;
  
  // Resume button should use currentLevel
  const handleResume = () => {
    if (currentLevel) {
      router.push(`/lesson/${currentLevel}`);
    } else {
      router.push('/map');
    }
  };
  
  return (
    <View>
      {/* Display stats */}
      <Text>{displayXP} XP</Text>
      <Text>{displayStreak} day streak</Text>
      
      {/* Resume button */}
      <TouchableOpacity onPress={handleResume}>
        <Text>Resume</Text>
      </TouchableOpacity>
      
      {/* Weekly chart using activity data */}
      {activity.map(day => (
        <View key={day.date}>
          <Text>{day.xp_earned} XP</Text>
        </View>
      ))}
    </View>
  );
}
```

---

## Map View

### Current: `app/map/index.tsx`

**Add these imports:**
```typescript
import { useAllLevels } from '@/hooks/use-storage';
import { startLessonFlow } from '@/services/utils';
```

**Use the hook:**
```typescript
export default function MapScreen() {
  const router = useRouter();
  const { levels, loading, refresh } = useAllLevels();
  
  const handleLevelPress = async (levelId: string) => {
    // Mark as in progress
    await startLessonFlow(levelId);
    
    // Navigate to lesson
    router.push(`/lesson/${levelId}`);
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <ScrollView>
      {UNITS.map(unit => (
        <View key={unit.id}>
          {unit.levels.map(level => {
            // Find progress from database
            const progress = levels.find(l => l.id === level.id);
            const status = progress?.status || 'locked';
            const stars = progress?.stars || 0;
            const xpEarned = progress?.xp_earned || 0;
            
            return (
              <LevelNode
                key={level.id}
                level={level}
                status={status}
                stars={stars}
                xpEarned={xpEarned}
                onPress={() => handleLevelPress(level.id)}
              />
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
```

**Update LevelNode component:**
```typescript
const LevelNode = ({ level, status, stars, xpEarned, onPress }: {
  level: any;
  status: string;
  stars: number;
  xpEarned: number;
  onPress: () => void;
}) => {
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const isCurrent = status === 'in_progress';
  
  return (
    <TouchableOpacity onPress={isLocked ? undefined : onPress}>
      <View>
        {/* Show stars if completed */}
        {isCompleted && (
          <View>
            {Array.from({ length: stars }).map((_, i) => (
              <Icon key={i} name="Star1" size={16} color="#FFC107" variant="Bold" />
            ))}
          </View>
        )}
        
        {/* Show XP earned */}
        {xpEarned > 0 && <Text>+{xpEarned} XP</Text>}
        
        {/* Visual indicator */}
        <Icon 
          name={isCurrent ? 'Play' : isCompleted ? 'TickCircle' : 'Lock'}
          size={24}
          color={isLocked ? '#999' : '#FF6B00'}
        />
      </View>
    </TouchableOpacity>
  );
};
```

---

## Profile Screen

### Current: `app/(tabs)/profile.tsx`

**Add these imports:**
```typescript
import { useStorage } from '@/services/StorageContext';
import { getFormattedStats, getXPForNextRank } from '@/services/utils';
import { useState, useEffect } from 'react';
```

**Use the storage:**
```typescript
export default function ProfileScreen() {
  const { userProfile, updateUserProfile } = useStorage();
  const [stats, setStats] = useState<any>(null);
  const [rankInfo, setRankInfo] = useState<any>(null);
  
  useEffect(() => {
    loadStats();
  }, [userProfile]);
  
  const loadStats = async () => {
    const formattedStats = await getFormattedStats();
    setStats(formattedStats);
    
    if (userProfile) {
      const nextRank = getXPForNextRank(userProfile.total_xp);
      setRankInfo(nextRank);
    }
  };
  
  const handleUpdateUsername = async (newName: string) => {
    await updateUserProfile({ username: newName });
  };
  
  return (
    <View>
      {/* Profile Header */}
      <Text>{userProfile?.username}</Text>
      <Text>{stats?.rank}</Text>
      
      {/* Stats */}
      <View>
        <Text>Total XP: {stats?.totalXP}</Text>
        <Text>Current Streak: {stats?.currentStreak} days</Text>
        <Text>Longest Streak: {stats?.longestStreak} days</Text>
        <Text>Myths Busted: {stats?.mythsBusted}</Text>
        <Text>Lessons Completed: {stats?.lessonsCompleted}</Text>
      </View>
      
      {/* Rank Progress */}
      {rankInfo && (
        <View>
          <Text>Next Rank: {rankInfo.nextRank}</Text>
          <Text>{rankInfo.xpNeeded} XP needed</Text>
          <ProgressBar progress={rankInfo.progress} />
        </View>
      )}
    </View>
  );
}
```

---

## Leaderboard

### Current: `app/(tabs)/leaderboard.tsx`

**Add these imports:**
```typescript
import { useStorage } from '@/services/StorageContext';
import { useCachedData } from '@/hooks/use-storage';
```

**Use cached leaderboard:**
```typescript
export default function LeaderboardScreen() {
  const { userProfile } = useStorage();
  
  // Cache leaderboard data for 30 minutes
  const { data: leaderboard, loading, refresh } = useCachedData(
    'leaderboard',
    fetchLeaderboardFromAPI, // Your API call
    30
  );
  
  // Find user's rank
  const userRank = leaderboard?.findIndex(
    (user: any) => user.id === userProfile?.id
  ) + 1 || 0;
  
  return (
    <View>
      {/* Top 3 */}
      <View>
        {leaderboard?.slice(0, 3).map((user: any, index: number) => (
          <View key={user.id}>
            <Text>#{index + 1}</Text>
            <Text>{user.username}</Text>
            <Text>{user.xp} XP</Text>
          </View>
        ))}
      </View>
      
      {/* Rest of list */}
      <ScrollView>
        {leaderboard?.slice(3).map((user: any, index: number) => (
          <View key={user.id}>
            <Text>#{index + 4}</Text>
            <Text>{user.username}</Text>
            <Text>{user.xp} XP</Text>
          </View>
        ))}
      </ScrollView>
      
      {/* User's position */}
      <View>
        <Text>Your Rank: #{userRank}</Text>
        <Text>{userProfile?.total_xp} XP</Text>
      </View>
      
      {/* Pull to refresh */}
      <TouchableOpacity onPress={refresh}>
        <Text>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Wiki/Community

### Current: `app/(tabs)/wiki.tsx`

**Add these imports:**
```typescript
import { useStorage } from '@/services/StorageContext';
import { bustMythFlow } from '@/services/utils';
```

**Track myth busting:**
```typescript
export default function WikiScreen() {
  const { updateUserProfile, userProfile } = useStorage();
  
  const handleMythBusted = async () => {
    // Record myth busting
    await bustMythFlow(updateUserProfile, userProfile);
    
    // Show success feedback
    alert('Myth busted! +1 to your count');
  };
  
  return (
    <View>
      {/* Feed items */}
      {FEED_ITEMS.map(item => (
        <View key={item.id}>
          <Text>{item.title}</Text>
          
          {item.type === 'myth' && (
            <TouchableOpacity onPress={handleMythBusted}>
              <Text>Mark as Busted</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      
      {/* User's myth count */}
      <View>
        <Text>Myths Busted: {userProfile?.myths_busted}</Text>
      </View>
    </View>
  );
}
```

---

## Common Patterns

### Pattern 1: Loading State

```typescript
const { userProfile } = useStorage();

if (!userProfile) {
  return <LoadingSpinner />;
}

return <YourComponent profile={userProfile} />;
```

### Pattern 2: Updating Data

```typescript
const { updateUserProfile, addXP } = useStorage();

const handleAction = async () => {
  // Add XP
  await addXP(10);
  
  // Update other fields
  await updateUserProfile({
    myths_busted: (userProfile?.myths_busted || 0) + 1
  });
};
```

### Pattern 3: Caching API Data

```typescript
const { data, loading, refresh } = useCachedData(
  'cache_key',
  async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  },
  30 // Cache for 30 minutes
);
```

### Pattern 4: Daily Activity

```typescript
import { logDailyActivity } from '@/services/database';

const handleActivity = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  await logDailyActivity(today, {
    xp_earned: 10,
    lessons_completed: 1,
    time_spent_minutes: 5
  });
};
```

---

## Testing Your Integration

After integrating storage into a screen:

1. **Check Console Logs**
   - Look for "Database initialized successfully"
   - Look for any error messages

2. **Verify Data Persistence**
   - Make changes (complete lesson, add XP)
   - Close and reopen the app
   - Check if data persists

3. **Test Error Handling**
   - Try with no internet (if using API)
   - Check if cached data loads

4. **Performance Check**
   - Monitor loading times
   - Check if UI is responsive

---

## Troubleshooting

### Issue: Data not updating
**Solution:** Make sure you're using the `useStorage` hook and calling the update functions

### Issue: Loading forever
**Solution:** Check if database is initialized in `app/_layout.tsx`

### Issue: Cache not working
**Solution:** Verify TTL hasn't expired and cache key is consistent

### Issue: Streak not incrementing
**Solution:** Call `checkDailyStreak()` on app launch

---

## Need Help?

1. Check `STORAGE_GUIDE.md` for detailed documentation
2. See `services/examples.ts` for more usage examples
3. Look at `app/lesson/[id].tsx` for a complete integration example
4. Run `quickTest()` from `services/tests.ts` to verify setup

---

**Pro Tip:** Start with one screen at a time, test thoroughly, then move to the next!

