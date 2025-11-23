# Map Loading Issue Fix

## Problem
The learning path map was stuck on "Loading..." indefinitely because:
1. The database was empty for new users
2. `getAllLevels()` returned an empty array `[]`
3. The map had no data to display

## Root Cause
The application never initialized the lesson/quiz records in the database. The syllabus existed in code (`content/units.ts`), but the database `levels` table was empty.

## Solution
Automatically initialize all levels from the syllabus when the database is first created.

### Implementation

**File: `services/database.ts`**

1. **Import syllabus**:
```typescript
import { UNITS } from '@/content/units';
```

2. **Added `initializeLevelsFromSyllabus()` function**:
```typescript
const initializeLevelsFromSyllabus = async () => {
  try {
    const database = db;
    if (!database) return;

    // Check if levels already exist
    const existingLevels = await database.getFirstAsync('SELECT COUNT(*) as count FROM levels');
    if (existingLevels && (existingLevels as any).count > 0) {
      console.log('Levels already initialized, skipping...');
      return;
    }

    console.log('Initializing levels from syllabus...');

    // Insert all lessons and quizzes from the syllabus
    for (const unit of UNITS) {
      // Insert lessons
      for (let i = 0; i < unit.lessonIds.length; i++) {
        const lessonId = unit.lessonIds[i];
        const isFirstLesson = i === 0 && unit.order === 1; // First lesson of first unit
        
        await database.runAsync(
          `INSERT OR IGNORE INTO levels (id, unit_id, type, status, xp_earned, stars, attempts) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [lessonId, unit.id, 'lesson', isFirstLesson ? 'current' : 'locked', 0, 0, 0]
        );
      }

      // Insert quizzes
      for (const quizId of unit.quizIds) {
        await database.runAsync(
          `INSERT OR IGNORE INTO levels (id, unit_id, type, status, xp_earned, stars, attempts) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [quizId, unit.id, 'quiz', 'locked', 0, 0, 0]
        );
      }
    }

    console.log('Levels initialized from syllabus');
  } catch (error) {
    console.error('Error initializing levels:', error);
  }
};
```

3. **Call during database initialization**:
```typescript
export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync('atomiq.db');
    
    // Create tables
    await db.execAsync(`...`);
    
    // Initialize levels from syllabus if database is empty
    await initializeLevelsFromSyllabus();
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};
```

## How It Works

### First Launch (New User)
1. Database is created with empty tables
2. `initializeLevelsFromSyllabus()` is called
3. Checks if levels exist (count = 0)
4. Iterates through all units in the syllabus
5. Inserts all lessons and quizzes into the `levels` table
6. First lesson of Unit 1 is set to `status: 'current'`
7. All other levels are set to `status: 'locked'`
8. Map loads with all levels visible

### Subsequent Launches
1. Database already has levels
2. `initializeLevelsFromSyllabus()` checks count
3. Count > 0, so it skips initialization
4. Existing progress is preserved
5. Map loads with current progress

## Initial State

For a new user, the database will have:

### Unit 1: The Atomic Playground
- `meet-the-atom` → **status: 'current'** ✅ (can start immediately)
- `what-is-isotope` → status: 'locked'
- `background-radiation` → status: 'locked'
- `atomic-basics-quiz` → status: 'locked'

### Unit 2-5
- All lessons → status: 'locked'
- All quizzes → status: 'locked'

## Benefits

1. **No Empty State**: Map always has data to display
2. **Immediate Start**: First lesson is unlocked and ready
3. **Progress Tracking**: All levels exist in database from the start
4. **Idempotent**: Safe to call multiple times (uses `INSERT OR IGNORE`)
5. **Automatic**: No manual setup required

## User Experience

### Before Fix
- Map shows "Loading..." forever
- No lessons visible
- User confused, can't start learning

### After Fix
- Map loads immediately
- All units visible with proper lock states
- First lesson shows "START" label
- User can begin learning right away

## Database Schema

The `levels` table stores:
- `id`: Lesson/quiz ID (e.g., 'meet-the-atom')
- `unit_id`: Parent unit (e.g., 'atomic-playground')
- `type`: 'lesson' or 'quiz'
- `status`: 'locked', 'current', 'in_progress', or 'completed'
- `xp_earned`: XP earned from this level
- `stars`: Stars earned (0-3)
- `attempts`: Number of attempts
- `completed_at`: Timestamp when completed

## Testing Checklist

- [x] First launch initializes all levels
- [x] First lesson is unlocked
- [x] Map displays all units
- [x] Progress tracking works
- [x] Subsequent launches preserve progress
- [x] No duplicate levels created
- [x] Console logs confirm initialization

## Related Fixes

This fix also resolved:
- Empty home dashboard (no current unit to display)
- Missing progress data
- Inability to start first lesson

## Files Modified

1. **`services/database.ts`**
   - Added `UNITS` import
   - Added `initializeLevelsFromSyllabus()` function
   - Called during `initDatabase()`

## Conclusion

The map now loads successfully because:
1. ✅ Database is initialized with all levels
2. ✅ First lesson is unlocked
3. ✅ `useAllLevels()` returns data
4. ✅ Map renders with proper state
5. ✅ User can start learning immediately

