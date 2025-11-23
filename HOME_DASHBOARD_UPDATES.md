# Home Dashboard Updates

## Summary of Changes

Updated the home dashboard to display dynamic, real-time user data instead of static placeholder content.

---

## 1. Header Redesign

### Before
- "AtomIQ" dropdown selector with atom icon
- XP and streak stats on the right

### After
- **Left Side**: Profile avatar with username
  - Displays user's avatar image
  - Shows username next to avatar
  - Avatar has orange border for branding

- **Right Side**: XP and language selector
  - XP pill with lightning icon showing total XP
  - Language dropdown with flag emoji (🇺🇸) and arrow

### Implementation
```typescript
{/* Profile Section */}
<View style={styles.profileSection}>
  <Image 
    source={{ uri: userProfile?.avatar_url || 'default_url' }} 
    style={styles.profileAvatar} 
  />
  <Text style={styles.profileName}>{userProfile?.username || 'Scientist'}</Text>
</View>

{/* Right Stats */}
<View style={styles.statsRow}>
   <View style={styles.statPill}>
      <Icon name="Flash" size={18} color={THEME.gold} variant="Bold" />
      <Text style={styles.statValue}>{userProfile?.total_xp || 0}</Text>
   </View>
   <TouchableOpacity style={styles.languagePill}>
      <Text style={styles.flagEmoji}>🇺🇸</Text>
      <Icon name="ArrowDown2" size={14} color={THEME.text} />
   </TouchableOpacity>
</View>
```

---

## 2. Dynamic Lessons Card (Main Banner)

### Before
- Static text: "Myth Busting! Unit 3: Radiation Misconceptions"
- Hardcoded 75% progress

### After
- **Dynamic Unit Information**:
  - Fetches the user's current unit from progress data
  - Displays: "Continue Learning"
  - Shows: "Unit [X]: [Unit Title]"
  - Shows: "Lesson [Y] of [Z]"
  
- **Dynamic Progress**:
  - Calculates actual progress percentage
  - Updates progress bar and percentage display
  - Uses unit's color for the gradient background

### Logic
```typescript
const currentProgress = useMemo(() => {
  const completedLessonIds = levels
    .filter(l => l.status === 'completed')
    .map(l => l.id);

  // Find the current unit and lesson
  let currentUnit = UNITS[0];
  let currentLessonIndex = 0;
  let totalLessonsInUnit = currentUnit.lessonIds.length;
  let completedInCurrentUnit = 0;

  for (const unit of UNITS) {
    const completedInUnit = unit.lessonIds.filter(id => 
      completedLessonIds.includes(id)
    ).length;
    const totalInUnit = unit.lessonIds.length;

    if (completedInUnit < totalInUnit) {
      // This is the current unit
      currentUnit = unit;
      currentLessonIndex = completedInUnit;
      totalLessonsInUnit = totalInUnit;
      completedInCurrentUnit = completedInUnit;
      break;
    }
  }

  const progressPercentage = totalLessonsInUnit > 0 
    ? Math.round((completedInCurrentUnit / totalLessonsInUnit) * 100) 
    : 0;

  return {
    unit: currentUnit,
    lessonIndex: currentLessonIndex,
    totalLessons: totalLessonsInUnit,
    progressPercentage,
    completedLessons: completedInCurrentUnit
  };
}, [levels]);
```

### Features
- **Unit Color**: Banner gradient uses the current unit's color
- **Accurate Progress**: Shows exact lesson count and percentage
- **Resume Button**: Navigates to the map to continue learning

---

## 3. Debunking Progress Section

### Before
- Static bar chart showing "Your Activity" vs "Community Avg"
- Hardcoded percentages (60% myths, 25% facts)
- Generic success message

### After
- **Real User Stats**:
  - Displays actual myths busted count
  - Displays actual lessons completed count
  - Shows combined progress bar

- **Visual Improvements**:
  - Two stat cards showing individual counts with icons
  - Single progress bar showing overall activity
  - Dynamic success message based on actual progress

### Logic
```typescript
const debunkingStats = useMemo(() => {
  const totalLessons = userProfile?.lessons_completed || 0;
  const totalMyths = userProfile?.myths_busted || 0;
  const total = totalLessons + totalMyths;
  
  // Calculate percentages for the bar chart
  const mythsPercentage = total > 0 ? (totalMyths / Math.max(total, 50)) : 0;
  const lessonsPercentage = total > 0 ? (totalLessons / Math.max(total, 50)) : 0;

  return {
    totalLessons,
    totalMyths,
    mythsPercentage: Math.min(mythsPercentage, 1),
    lessonsPercentage: Math.min(lessonsPercentage, 1)
  };
}, [userProfile]);
```

### Components
1. **Stats Grid**:
   - Left card: Myths Busted (orange icon)
   - Right card: Lessons Completed (green icon)
   - Large numbers showing counts
   - Labels below

2. **Progress Bar**:
   - Orange segment for myths
   - Green segment for lessons
   - Scales based on activity (max 50 for display)

3. **Success Message**:
   - Only shows if user has completed activities
   - Shows total count: "Keep it up! You've completed [X] activities!"

---

## Data Sources

### User Profile (`useStorage`)
```typescript
interface UserProfile {
  username: string;
  avatar_url: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  myths_busted: number;
  lessons_completed: number;
}
```

### Level Progress (`useAllLevels`)
```typescript
const { levels } = useAllLevels();
// Returns array of all lessons with status: 'completed' | 'in_progress' | 'locked'
```

### Units Configuration (`UNITS`)
```typescript
interface UnitConfig {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  icon: string;
  lessonIds: string[];
  mythIds: string[];
  quizIds: string[];
  // ...
}
```

---

## New Styles Added

```typescript
profileSection: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
profileAvatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  borderWidth: 2,
  borderColor: THEME.primary,
},
profileName: {
  fontWeight: '700',
  fontSize: 16,
  color: THEME.text,
},
languagePill: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFF',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 16,
  gap: 4,
  borderWidth: 2,
  borderColor: '#E5E7EB',
  borderBottomWidth: 4,
},
flagEmoji: {
  fontSize: 18,
},
statsGrid: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 16,
},
statCard: {
  flex: 1,
  backgroundColor: THEME.bg,
  padding: 16,
  borderRadius: 16,
  alignItems: 'center',
  gap: 8,
},
statCardValue: {
  fontSize: 24,
  fontWeight: '800',
  color: THEME.text,
},
statCardLabel: {
  fontSize: 11,
  color: THEME.textMuted,
  fontWeight: '600',
  textAlign: 'center',
},
```

---

## User Experience Improvements

### Personalization
- User sees their own name and avatar
- Progress reflects their actual learning journey
- Stats are meaningful and accurate

### Motivation
- Clear indication of current position in the course
- Visual representation of achievements (myths busted, lessons completed)
- Progress bar shows how close they are to completing the current unit

### Clarity
- Removed confusing "Community Avg" comparison
- Simplified to show personal stats only
- Clear labels and icons for each metric

### Consistency
- All data comes from the same source (local database)
- Updates in real-time as user completes activities
- Matches the progress shown on the map screen

---

## Technical Implementation

### Imports Added
```typescript
import { UNITS } from '@/content/units';
import { useAllLevels } from '@/hooks/use-storage';
import { useStorage } from '@/services/StorageContext';
import { useMemo } from 'react';
```

### Hooks Used
1. **`useStorage()`**: Access user profile data
2. **`useAllLevels()`**: Get all lesson progress
3. **`useMemo()`**: Optimize calculations for current progress and debunking stats

### Performance
- Calculations are memoized to prevent unnecessary re-renders
- Only recalculates when `levels` or `userProfile` changes
- Efficient filtering and mapping operations

---

## Future Enhancements

### Potential Improvements
1. **Language Selector**: Make the language dropdown functional
2. **Avatar Upload**: Allow users to change their avatar
3. **Username Edit**: Allow users to edit their username
4. **Detailed Stats**: Add more granular statistics (daily, weekly, monthly)
5. **Achievements**: Display earned badges or achievements
6. **Streak Display**: Show current streak in the header
7. **Unit Preview**: Show a preview of upcoming units
8. **Activity Feed**: Show recent activities and milestones

### Analytics
- Track which units users spend most time on
- Identify drop-off points
- Monitor completion rates
- Measure engagement with quick actions

---

## Testing Checklist

- [x] Profile avatar displays correctly
- [x] Username displays correctly
- [x] XP count is accurate
- [x] Language selector shows flag
- [x] Current unit is correctly identified
- [x] Lesson progress is accurate
- [x] Progress percentage calculates correctly
- [x] Banner color matches unit color
- [x] Myths busted count is correct
- [x] Lessons completed count is correct
- [x] Progress bar displays proportionally
- [x] Success message shows when appropriate
- [x] All data updates when user completes activities

---

## Files Modified

1. **`app/(tabs)/index.tsx`**
   - Added imports for storage hooks and units
   - Added `useMemo` for current progress calculation
   - Added `useMemo` for debunking stats calculation
   - Updated header to show profile and language selector
   - Updated banner to show dynamic unit and progress
   - Updated debunking progress to show real stats
   - Added new styles for profile, language selector, and stats grid

---

## Conclusion

The home dashboard now provides a personalized, data-driven experience that:
- Reflects the user's actual progress
- Motivates continued learning
- Provides clear, actionable information
- Maintains the orange theme and Duolingo-style design

All changes are seamlessly integrated with the existing storage system and update automatically as the user progresses through the course.

