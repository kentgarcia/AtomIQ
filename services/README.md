# Local Storage Implementation

This app uses a hybrid storage approach combining SQLite for structured data and AsyncStorage for simple key-value pairs.

## Storage Architecture

### 1. SQLite Database (`services/database.ts`)
Used for structured, relational data:
- **User Profile**: XP, streaks, stats
- **Units & Levels**: Progress tracking
- **Lesson Steps**: Individual step completion
- **Daily Activity**: Time-series data for charts
- **Achievements**: Unlocked badges
- **Leaderboard Cache**: Offline leaderboard data

### 2. AsyncStorage (`services/storage.ts`)
Used for simple preferences and session data:
- Onboarding completion status
- User preferences (sound, haptics, notifications)
- Last active date
- Current level/unit
- Cache with TTL support

### 3. Storage Context (`services/StorageContext.tsx`)
React Context provider for global state management:
- Initializes database on app start
- Provides user profile state
- Helper methods: `addXP()`, `incrementStreak()`, `updateUserProfile()`

## Usage Examples

### Using the Storage Context
```typescript
import { useStorage } from '@/services/StorageContext';

function MyComponent() {
  const { userProfile, addXP, updateUserProfile } = useStorage();
  
  // Add XP
  await addXP(10);
  
  // Update profile
  await updateUserProfile({ username: 'NewName' });
}
```

### Direct Database Access
```typescript
import { getLevelProgress, updateLevelProgress } from '@/services/database';

// Get level data
const level = await getLevelProgress('1-1');

// Update level
await updateLevelProgress('1-1', {
  status: 'completed',
  xp_earned: 50,
  stars: 3
});
```

### AsyncStorage Operations
```typescript
import { setItem, getItem, setCacheWithTTL } from '@/services/storage';

// Simple storage
await setItem('my_key', { data: 'value' });
const data = await getItem('my_key');

// Cache with expiration
await setCacheWithTTL('leaderboard', data, 60); // 60 minutes TTL
const cached = await getCacheWithTTL('leaderboard');
```

## Database Schema

See `services/database.ts` for full schema. Key tables:
- `user_profile`: Single row with user stats
- `levels`: Progress for each level node
- `daily_activity`: Daily XP/activity logs
- `achievements`: Unlocked badges

## Best Practices

1. **Always use the Context** for user profile operations
2. **Use SQLite** for data that needs querying/relationships
3. **Use AsyncStorage** for simple flags and preferences
4. **Cache API responses** with TTL to reduce network calls
5. **Log daily activity** for progress charts

