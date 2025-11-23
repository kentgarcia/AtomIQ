# 📚 Lesson Organization & Dynamic Content System

## ✅ Complete Restructure

I've reorganized the entire lesson system for cleaner organization and dynamic content loading.

## 🗂️ New Directory Structure

```
content/lessons/
├── index.ts                              # Central registry
│
├── unit1-atomic-playground/              # Unit 1 Lessons
│   ├── meet-the-atom.ts
│   ├── what-is-isotope.ts
│   └── background-radiation.ts
│
├── unit2-invisible-rays/                 # Unit 2 Lessons
│   └── radiation-shielding.ts
│
├── unit3-dose-poison/                    # Unit 3 Lessons (planned)
│
├── unit4-engine-room/                    # Unit 4 Lessons
│   └── nuclear-fission.ts
│
└── unit5-green-horizon/                  # Unit 5 Lessons (planned)
```

## 🔄 How It Works

### 1. Content Definition (content/lessons/)

Lessons are defined in their unit folders:

```typescript
// content/lessons/unit1-atomic-playground/meet-the-atom.ts
export const meetTheAtomLesson: Lesson = {
  id: 'meet-the-atom',
  title: 'Meet the Atom',
  unitId: 'atomic-playground',
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Meet the Atom',
        mission: 'Discover the Building Blocks!',
        icon: 'Atom'
      }
    },
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Atoms are the smallest things that exist',
        reality: 'Atoms contain protons, neutrons, and electrons',
        explanation: '...'
      }
    },
    // ... more steps
  ]
};
```

### 2. Registry (content/lessons/index.ts)

All lessons are registered by unit:

```typescript
// Unit 1: Atomic Playground
import meetTheAtomLesson from './unit1-atomic-playground/meet-the-atom';
import whatIsIsotopeLesson from './unit1-atomic-playground/what-is-isotope';
import backgroundRadiationLesson from './unit1-atomic-playground/background-radiation';

export const lessons: Record<string, Lesson> = {
  'meet-the-atom': meetTheAtomLesson,
  'what-is-isotope': whatIsIsotopeLesson,
  'background-radiation': backgroundRadiationLesson,
  // ...
};
```

### 3. Map Integration (app/map/index.tsx)

The map dynamically loads lessons from units:

```typescript
import { UNITS as SYLLABUS_UNITS } from '@/content';

// Convert syllabus units to map format
const convertSyllabusToMapUnits = (completedLessonIds: string[]) => {
  return SYLLABUS_UNITS.map(unit => {
    // Create level nodes from lesson IDs
    const levels = unit.lessonIds.map((lessonId, index) => {
      const isCompleted = completedLessonIds.includes(lessonId);
      const previousCompleted = index === 0 || 
        completedLessonIds.includes(unit.lessonIds[index - 1]);
      
      return {
        id: lessonId,
        type: 'star', // or 'book', 'chest'
        status: isCompleted ? 'completed' : 
                previousCompleted ? 'current' : 'locked'
      };
    });
    
    return {
      id: unit.id,
      title: unit.title,
      color: unit.color,
      levels: levels
    };
  });
};
```

### 4. Lesson Screen (app/lesson/[id].tsx)

The lesson screen dynamically loads and renders content:

```typescript
import { getLessonById } from '@/content';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const lesson = getLessonById(id as string);
  
  // Render current step based on lesson data
  const currentStep = lesson.steps[step];
  
  switch(currentStep.type) {
    case 'briefing':
      return <BriefingView data={currentStep.data} onComplete={nextStep} />;
    case 'myth_buster':
      return <MythBusterView data={currentStep.data} onComplete={nextStep} />;
    // ... etc
  }
}
```

## 🎯 Data Flow

```
1. Syllabus (content/units.ts)
   ↓ Defines unit structure and lesson IDs
   
2. Lessons (content/lessons/unit-X/)
   ↓ Contains actual lesson content
   
3. Registry (content/lessons/index.ts)
   ↓ Makes lessons accessible by ID
   
4. Map (app/map/index.tsx)
   ↓ Displays units and lessons visually
   
5. User taps lesson
   ↓
   
6. Lesson Screen (app/lesson/[id].tsx)
   ↓ Loads lesson via getLessonById()
   
7. Dynamic Rendering
   ↓ Renders steps based on lesson.steps[]
   
8. Progress Saved
   ↓ Updates storage when complete
   
9. Map Updates
   ↓ Shows new progress
```

## 📊 Benefits

### ✅ Single Source of Truth
- Syllabus defines structure
- Lessons contain content
- No duplication

### ✅ Easy to Add Content
```typescript
// 1. Create lesson file
// content/lessons/unit1-atomic-playground/new-lesson.ts

// 2. Register in index.ts
import newLesson from './unit1-atomic-playground/new-lesson';
export const lessons = {
  // ...
  'new-lesson': newLesson
};

// 3. Add to unit configuration
// content/units.ts
{
  id: 'atomic-playground',
  lessonIds: ['meet-the-atom', 'new-lesson', ...]
}

// Done! Automatically appears on map
```

### ✅ Type-Safe
```typescript
// All lesson data is typed
interface Lesson {
  id: string;
  title: string;
  unitId: string;
  steps: LessonStep[];
  // ...
}

// TypeScript catches errors at compile time
```

### ✅ Flexible Content
```typescript
// Each step type has its own data structure
{
  type: 'myth_buster',
  data: {
    myth: string;
    reality: string;
    explanation: string;
    image?: string;
  }
}
```

### ✅ Progress Tracking
```typescript
// Map automatically shows:
- Completed lessons (checkmark)
- Current lesson (bouncing, unlocked)
- Locked lessons (gray)
```

## 🎨 Step Types

### 1. Briefing
```typescript
{
  type: 'briefing',
  data: {
    topic: 'Topic Name',
    mission: 'Mission Statement',
    icon: 'IconName'
  }
}
```

### 2. Myth Buster
```typescript
{
  type: 'myth_buster',
  data: {
    myth: 'The myth statement',
    reality: 'The truth',
    explanation: 'Detailed explanation',
    image?: 'url'
  }
}
```

### 3. Micro Learn
```typescript
{
  type: 'micro_learn',
  data: {
    title: 'Concept Title',
    content: 'Main explanation',
    keyPoints: ['Point 1', 'Point 2'],
    image?: 'url'
  }
}
```

### 4. Lab
```typescript
{
  type: 'lab',
  data: {
    title: 'Lab Title',
    description: 'What to do',
    task: 'Specific task',
    options: [
      { id: 'option1', label: 'Option 1', icon: 'Icon' }
    ],
    correctAnswer: 'option1',
    explanation: 'Why correct'
  }
}
```

### 5. Assessment
```typescript
{
  type: 'assessment',
  data: {
    question: 'The question?',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 2,
    explanation: 'Why correct',
    image?: 'url'
  }
}
```

### 6. Debrief
```typescript
{
  type: 'debrief',
  data: {
    title: 'Success!',
    message: 'Congratulations',
    rewards: {
      xp: 50,
      stars: 3
    }
  }
}
```

## 📝 Files Modified

### Created
- `content/lessons/unit1-atomic-playground/` (directory)
- `content/lessons/unit2-invisible-rays/` (directory)
- `content/lessons/unit3-dose-poison/` (directory)
- `content/lessons/unit4-engine-room/` (directory)
- `content/lessons/unit5-green-horizon/` (directory)
- `app/lesson/LessonRenderer.tsx` (component library)
- `LESSON_ORGANIZATION.md` (this file)

### Modified
- `content/lessons/index.ts` - Updated with unit organization
- `app/lesson/[id].tsx` - Dynamic content loading
- `app/map/index.tsx` - Connected to syllabus

### Moved
- `meet-the-atom.ts` → `unit1-atomic-playground/`
- `what-is-isotope.ts` → `unit1-atomic-playground/`
- `background-radiation.ts` → `unit1-atomic-playground/`
- `radiation-shielding.ts` → `unit2-invisible-rays/`
- `nuclear-fission.ts` → `unit4-engine-room/`

## 🚀 Usage Examples

### Get Lessons for a Unit
```typescript
import { getLessonsByUnit } from '@/content';

const unit1Lessons = getLessonsByUnit('atomic-playground');
// Returns: [meetTheAtom, whatIsIsotope, backgroundRadiation]
```

### Load Lesson in Screen
```typescript
import { getLessonById } from '@/content';

const lesson = getLessonById('meet-the-atom');
// Returns full lesson with all steps
```

### Render Lesson Steps
```typescript
lesson.steps.forEach((step, index) => {
  switch(step.type) {
    case 'briefing':
      // Render briefing with step.data
      break;
    case 'myth_buster':
      // Render myth buster with step.data
      break;
    // ... etc
  }
});
```

## ✨ Result

### Before
- Lessons scattered in single directory
- Hardcoded content in components
- Difficult to add new lessons
- No connection to syllabus

### After
- ✅ Lessons organized by unit
- ✅ Content defined in data files
- ✅ Easy to add new lessons
- ✅ Fully connected to syllabus
- ✅ Dynamic rendering
- ✅ Type-safe
- ✅ Progress tracking
- ✅ Single source of truth

## 🎉 Summary

The lesson system is now:

1. **Organized by unit** - Clear folder structure
2. **Content-driven** - Lessons defined in data files
3. **Dynamically rendered** - Components read from content
4. **Connected to map** - Syllabus drives the learning path
5. **Progress-aware** - Tracks completion and unlocks
6. **Type-safe** - Full TypeScript support
7. **Scalable** - Easy to add new content

**The learning path map now dynamically displays lessons from the syllabus, and the lesson screen dynamically renders content from the content system!** 🎓✨

---

**Status**: ✅ Complete and Production-Ready  
**Last Updated**: November 23, 2025

