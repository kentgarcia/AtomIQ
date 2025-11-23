# AtomIQ Local Storage Implementation Guide

## Overview

The AtomIQ app uses a hybrid storage approach combining **SQLite** for structured data and **AsyncStorage** for simple key-value pairs. This provides the best of both worlds: powerful querying capabilities for complex data and fast access for simple preferences.

## Architecture

```
services/
├── database.ts          # SQLite operations
├── storage.ts           # AsyncStorage operations
├── StorageContext.tsx   # React Context for global state
├── examples.ts          # Usage examples
└── README.md           # Documentation

hooks/
└── use-storage.ts      # Custom hooks for data access
```

## Quick Start

### 1. Installation

The required packages are already installed:
- `expo-sqlite` - For SQLite database
- `@react-native-async-storage/async-storage` - For key-value storage

### 2. Basic Usage

The `StorageProvider` is already wrapped around your app in `app/_layout.tsx`. You can now use the storage system anywhere in your app.

```typescript
import { useStorage } from '@/services/StorageContext';

function MyComponent() {
  const { userProfile, addXP, updateUserProfile } = useStorage();
  
  // Display user data
  console.log(userProfile?.username);
  console.log(userProfile?.total_xp);
  
  // Add XP
  await addXP(10);
  
  // Update profile
  await updateUserProfile({ username: 'NewName' });
}
```

## Core Features

### 1. User Profile Management

The user profile is automatically loaded when the app starts and is available globally through the `useStorage` hook.

```typescript
const { userProfile, updateUserProfile, addXP, incrementStreak } = useStorage();

// User profile contains:
// - username
// - avatar_url
// - total_xp
// - current_streak
// - longest_streak
// - myths_busted
// - lessons_completed
```

### 2. Level Progress Tracking

Track user progress through lessons and units:

```typescript
import { updateLevelProgress, getLevelProgress } from '@/services/database';

// Mark level as in progress
await updateLevelProgress('1-1', {
  status: 'in_progress'
});

// Complete a level
await updateLevelProgress('1-1', {
  status: 'completed',
  xp_earned: 50,
  stars: 3,
  completed_at: new Date().toISOString()
});

// Get level data
const level = await getLevelProgress('1-1');
```

### 3. Daily Activity Logging

Track daily activity for charts and analytics:

```typescript
import { logDailyActivity, getDailyActivity } from '@/services/database';

// Log activity for today
const today = new Date().toISOString().split('T')[0];
await logDailyActivity(today, {
  xp_earned: 50,
  lessons_completed: 1,
  myths_busted: 2,
  time_spent_minutes: 15
});

// Get last 7 days
const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const endDate = new Date().toISOString().split('T')[0];
const weeklyActivity = await getDailyActivity(startDate, endDate);
```

### 4. User Preferences

Store simple preferences with AsyncStorage:

```typescript
import { 
  setSoundEnabled, 
  getSoundEnabled,
  setNotificationsEnabled,
  getNotificationsEnabled 
} from '@/services/storage';

// Save preferences
await setSoundEnabled(true);
await setNotificationsEnabled(false);

// Load preferences
const soundEnabled = await getSoundEnabled();
const notificationsEnabled = await getNotificationsEnabled();
```

### 5. Caching with TTL

Cache API responses to reduce network calls:

```typescript
import { setCacheWithTTL, getCacheWithTTL } from '@/services/storage';

// Cache data for 30 minutes
await setCacheWithTTL('leaderboard', leaderboardData, 30);

// Get cached data (returns null if expired)
const cached = await getCacheWithTTL('leaderboard');
if (cached) {
  // Use cached data
} else {
  // Fetch fresh data
}
```

## Custom Hooks

Use the provided hooks for easier data access:

```typescript
import { 
  useLevelProgress, 
  useAllLevels, 
  useWeeklyActivity,
  useCachedData 
} from '@/hooks/use-storage';

// Get level progress
const { progress, loading } = useLevelProgress('1-1');

// Get all levels
const { levels, loading, refresh } = useAllLevels();

// Get weekly activity
const { activity, totalXP, totalLessons } = useWeeklyActivity();

// Use cached data with automatic refresh
const { data, loading, error, refresh } = useCachedData(
  'leaderboard',
  fetchLeaderboardFromAPI,
  30 // TTL in minutes
);
```

## Integration Examples

### Example 1: Lesson Completion

The lesson screen (`app/lesson/[id].tsx`) has been updated to automatically:
1. Mark the level as "in_progress" when starting
2. Save progress when completing (XP, stars, completion time)
3. Update user profile (total XP, lessons completed)
4. Log daily activity

### Example 2: Dashboard Data

```typescript
import { useStorage } from '@/services/StorageContext';
import { useWeeklyActivity } from '@/hooks/use-storage';

function Dashboard() {
  const { userProfile } = useStorage();
  const { activity, totalXP, totalLessons } = useWeeklyActivity();
  
  return (
    <View>
      <Text>Total XP: {userProfile?.total_xp}</Text>
      <Text>Current Streak: {userProfile?.current_streak} days</Text>
      <Text>This Week: {totalXP} XP, {totalLessons} lessons</Text>
    </View>
  );
}
```

### Example 3: Map View with Progress

```typescript
import { useAllLevels } from '@/hooks/use-storage';

function MapView() {
  const { levels, loading } = useAllLevels();
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <ScrollView>
      {UNITS.map(unit => (
        <View key={unit.id}>
          {unit.levels.map(level => {
            const progress = levels.find(l => l.id === level.id);
            const status = progress?.status || 'locked';
            const stars = progress?.stars || 0;
            
            return (
              <LevelNode 
                key={level.id}
                level={level}
                status={status}
                stars={stars}
              />
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
```

## Database Schema

### Tables

1. **user_profile** - Single row with user stats
2. **units** - Unit metadata and completion status
3. **levels** - Individual level progress
4. **lesson_steps** - Step-by-step completion tracking
5. **daily_activity** - Daily XP and activity logs
6. **achievements** - Unlocked badges
7. **leaderboard** - Cached leaderboard data

See `services/database.ts` for full schema details.

## Best Practices

1. **Always use the Context** for user profile operations
2. **Use SQLite** for data that needs querying/relationships
3. **Use AsyncStorage** for simple flags and preferences
4. **Cache API responses** with TTL to reduce network calls
5. **Log daily activity** for progress charts and analytics
6. **Use custom hooks** for cleaner component code
7. **Handle errors gracefully** - all storage operations can fail

## Testing & Development

### Reset All Data

```typescript
import { clearAllData } from '@/services/database';
import { clearAll } from '@/services/storage';

// Clear database
await clearAllData();

// Clear AsyncStorage
await clearAll();
```

### Check Database State

```typescript
import { getUserProfile, getAllLevels } from '@/services/database';

const profile = await getUserProfile();
console.log('User Profile:', profile);

const levels = await getAllLevels();
console.log('All Levels:', levels);
```

## Performance Considerations

1. **Database is initialized once** on app start
2. **User profile is cached** in React Context
3. **Queries are optimized** with indexes
4. **Cache with TTL** reduces API calls
5. **Batch operations** available for multiple updates

## Future Enhancements

Consider adding:
- Offline sync with backend
- Data export/import
- Backup to cloud storage
- Analytics tracking
- Achievement system
- Social features (friends, challenges)

## Troubleshooting

### Database not initialized
```typescript
// Make sure StorageProvider wraps your app
<StorageProvider>
  <App />
</StorageProvider>
```

### Data not persisting
```typescript
// Check if database is initialized
import { getDatabase } from '@/services/database';
const db = getDatabase(); // Will throw if not initialized
```

### Cache not working
```typescript
// Verify TTL hasn't expired
const cached = await getCacheWithTTL('key');
if (!cached) {
  // Cache expired or doesn't exist
}
```

## Support

For issues or questions, check:
- `services/examples.ts` - Usage examples
- `services/README.md` - Quick reference
- Database schema in `services/database.ts`

