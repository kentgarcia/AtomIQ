# 🚀 AtomIQ Storage - Quick Reference

## Import Statements

```typescript
// Context (most common)
import { useStorage } from '@/services/StorageContext';

// Database operations
import { 
  updateLevelProgress, 
  getLevelProgress,
  logDailyActivity,
  getDailyActivity 
} from '@/services/database';

// AsyncStorage operations
import { 
  setItem, 
  getItem,
  setCacheWithTTL,
  getCacheWithTTL 
} from '@/services/storage';

// Custom hooks
import { 
  useLevelProgress,
  useAllLevels,
  useWeeklyActivity 
} from '@/hooks/use-storage';

// Utility functions
import { 
  completeLessonFlow,
  startLessonFlow,
  getFormattedStats 
} from '@/services/utils';
```

## Common Operations

### Get User Data
```typescript
const { userProfile } = useStorage();
// userProfile.total_xp, .current_streak, .lessons_completed, etc.
```

### Add XP
```typescript
const { addXP } = useStorage();
await addXP(50);
```

### Update Profile
```typescript
const { updateUserProfile } = useStorage();
await updateUserProfile({ username: 'NewName' });
```

### Complete Lesson
```typescript
await updateLevelProgress('1-1', {
  status: 'completed',
  xp_earned: 50,
  stars: 3
});
```

### Log Activity
```typescript
const today = new Date().toISOString().split('T')[0];
await logDailyActivity(today, {
  xp_earned: 50,
  lessons_completed: 1
});
```

### Cache Data
```typescript
// Save with 30min TTL
await setCacheWithTTL('key', data, 30);

// Get cached
const cached = await getCacheWithTTL('key');
```

### Get Weekly Stats
```typescript
const { activity, totalXP, totalLessons } = useWeeklyActivity();
```

## User Profile Fields

```typescript
{
  id: number;
  username: string;
  avatar_url: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  myths_busted: number;
  lessons_completed: number;
}
```

## Level Status Values

- `'locked'` - Not available yet
- `'in_progress'` - Currently active
- `'completed'` - Finished

## Rank System

| XP Range | Rank |
|----------|------|
| 0-99 | Beginner |
| 100-499 | Student |
| 500-999 | Lab Assistant |
| 1000-1999 | Nuclear Technician |
| 2000-4999 | Reactor Operator |
| 5000+ | Nuclear Expert |

## Storage Keys (AsyncStorage)

```typescript
'@atomiq:onboarding_completed'
'@atomiq:notifications_enabled'
'@atomiq:sound_enabled'
'@atomiq:haptics_enabled'
'@atomiq:last_active_date'
'@atomiq:current_level'
```

## Helper Functions

```typescript
// Complete lesson with all updates
await completeLessonFlow(levelId, xp, stars, updateUserProfile, addXP, userProfile);

// Start lesson
await startLessonFlow(levelId);

// Get formatted stats
const stats = await getFormattedStats();
// Returns: { totalXP, currentStreak, rank, etc. }

// Get XP for next rank
const { nextRank, xpNeeded, progress } = getXPForNextRank(currentXP);
```

## Database Tables

- `user_profile` - User data (single row)
- `levels` - Level progress
- `daily_activity` - Daily logs
- `units` - Unit metadata
- `achievements` - Badges
- `leaderboard` - Cache

## Testing Commands

```typescript
// Reset everything
import { clearAllData } from '@/services/database';
import { clearAll } from '@/services/storage';
await clearAllData();
await clearAll();

// Check data
const profile = await getUserProfile();
console.log(profile);
```

## File Locations

```
services/
├── database.ts       # SQLite operations
├── storage.ts        # AsyncStorage operations
├── StorageContext.tsx # React Context
├── utils.ts          # Helper functions
└── examples.ts       # Usage examples

hooks/
└── use-storage.ts    # Custom hooks

Docs:
├── STORAGE_GUIDE.md    # Full guide
├── STORAGE_SUMMARY.md  # Implementation summary
└── QUICK_REFERENCE.md  # This file
```

## Need Help?

1. Check `STORAGE_GUIDE.md` for detailed docs
2. See `services/examples.ts` for usage examples
3. Look at `app/lesson/[id].tsx` for integration example
4. All functions have JSDoc comments

---

**Pro Tip:** Use the custom hooks (`use-storage.ts`) for cleaner component code!

