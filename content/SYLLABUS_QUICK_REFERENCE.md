# 🚀 Syllabus Quick Reference

## Import Units

```typescript
import { 
  UNITS, 
  getUnitById, 
  getUnitProgress,
  isUnitUnlocked,
  getCurriculumStats 
} from '@/content';
```

## Get Unit Info

```typescript
// Get specific unit
const unit = getUnitById('atomic-playground');

// Get all units in order
const allUnits = getUnitsInOrder();

// Get next/previous unit
const nextUnit = getNextUnit('atomic-playground');
const prevUnit = getPreviousUnit('invisible-rays');
```

## Check Progress

```typescript
// Check if unit is unlocked
const unlocked = isUnitUnlocked('invisible-rays', userXP);

// Get unit progress
const progress = getUnitProgress('atomic-playground', completedLessonIds);
// Returns: { completed: 2, total: 3, percentage: 67 }

// Get overall stats
const stats = getCurriculumStats();
// Returns: { totalUnits: 5, totalLessons: 15, totalXP: 890, ... }
```

## Unit Structure

```typescript
{
  id: 'atomic-playground',
  order: 1,
  title: 'The Atomic Playground',
  subtitle: 'Basics',
  description: 'Master the fundamentals...',
  goal: 'Establish the vocabulary...',
  color: '#FFB74D',
  icon: 'Atom',
  lessonIds: ['meet-the-atom', 'what-is-isotope', ...],
  mythIds: ['all-radiation-manmade'],
  quizIds: ['atomic-basics-quiz'],
  estimatedMinutes: 21,
  totalXP: 180,
  isLocked: false,
  requiredXP: 0
}
```

## All 5 Units

| ID | Title | Lessons | XP | Status |
|----|-------|---------|-----|--------|
| `atomic-playground` | The Atomic Playground | 3 | 180 | ✅ Complete |
| `invisible-rays` | The Invisible Rays | 3 | 180 | ⚠️ Partial |
| `dose-poison` | The Dose Makes the Poison | 3 | 190 | ⏳ Planned |
| `engine-room` | The Engine Room | 3 | 190 | ⚠️ Partial |
| `green-horizon` | The Green Horizon | 2 | 150 | ⚠️ Partial |

## Unit 1 Lessons (Complete ✅)

```typescript
'meet-the-atom'          // 6 min, 50 XP
'what-is-isotope'        // 7 min, 60 XP
'background-radiation'   // 8 min, 70 XP
```

## Quick Stats

```typescript
const stats = getCurriculumStats();

console.log(stats.totalUnits);    // 5
console.log(stats.totalLessons);  // 15
console.log(stats.totalXP);       // 890
console.log(stats.estimatedHours); // 1.8
```

## Usage in Components

### Map View
```typescript
UNITS.forEach(unit => {
  unit.lessonIds.forEach(lessonId => {
    const lesson = getLessonById(lessonId);
    // Render lesson node
  });
});
```

### Progress Display
```typescript
const progress = getUnitProgress(unitId, completedLessonIds);
return <Text>{progress.completed}/{progress.total}</Text>;
```

### Lock Check
```typescript
const unlocked = isUnitUnlocked(unitId, userXP);
return unlocked ? <UnlockedIcon /> : <LockedIcon />;
```

## Files

- **`content/units.ts`** - Unit configuration
- **`content/SYLLABUS.md`** - Full documentation
- **`SYLLABUS_IMPLEMENTATION.md`** - Implementation details
- **`content/SYLLABUS_QUICK_REFERENCE.md`** - This file

---

**Pro Tip**: Use `UNITS` array to dynamically render the entire learning path!

