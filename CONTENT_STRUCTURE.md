# 📚 Content Structure Documentation

## Overview

The AtomIQ app now has a dedicated, well-organized content system for all educational materials. All lessons, quizzes, myths, and facts are stored in the `content/` directory with proper TypeScript types and helper functions.

## 📁 Directory Structure

```
content/
├── types.ts                    # TypeScript type definitions
├── index.ts                    # Main export hub
├── README.md                   # Documentation
├── TEMPLATES.md               # Content creation templates
│
├── lessons/                    # Interactive lessons
│   ├── index.ts               # Lesson registry & helpers
│   ├── radiation-shielding.ts # Example lesson
│   ├── nuclear-fission.ts     # Example lesson
│   └── ...
│
├── quizzes/                    # Assessment quizzes
│   ├── index.ts               # Quiz registry & helpers
│   ├── radiation-safety-quiz.ts
│   └── ...
│
├── myths/                      # Common misconceptions
│   ├── index.ts               # Myth registry & helpers
│   ├── nuclear-waste-forever.ts
│   ├── nuclear-not-clean.ts
│   └── ...
│
└── facts/                      # Verified facts
    ├── index.ts               # Fact registry & helpers
    ├── nuclear-waste-volume.ts
    ├── carbon-emissions.ts
    └── ...
```

## 🎯 Content Types

### 1. **Lessons** (Interactive Multi-Step Learning)

**Structure:**
- Briefing (intro)
- Myth Buster (debunk misconception)
- Micro Learn (core concept)
- Lab (interactive activity)
- Assessment (quiz)
- Debrief (summary + rewards)

**Example:**
```typescript
import { getLessonById } from '@/content';

const lesson = getLessonById('radiation-shielding');
// Use in app/lesson/[id].tsx
```

### 2. **Quizzes** (Knowledge Assessment)

**Features:**
- Multiple choice questions
- True/False questions
- Timed or untimed
- Passing score requirements
- XP rewards

**Example:**
```typescript
import { getQuizById } from '@/content';

const quiz = getQuizById('radiation-safety-quiz');
```

### 3. **Myths** (Misconception Debunking)

**Structure:**
- Myth statement
- Reality/truth
- Detailed explanation
- Credible sources
- Related content links

**Example:**
```typescript
import { getMythById, getPopularMyths } from '@/content';

const myth = getMythById('nuclear-waste-forever');
const popular = getPopularMyths(10);
```

### 4. **Facts** (Verified Information)

**Structure:**
- Fact statement
- Detailed explanation
- Credible sources
- Importance rating
- Related content links

**Example:**
```typescript
import { getFactById, getCriticalFacts } from '@/content';

const fact = getFactById('carbon-emissions');
const critical = getCriticalFacts();
```

## 🔧 Helper Functions

### Lessons

```typescript
import {
  getLessonById,
  getLessonsByUnit,
  getLessonsByTag,
  getLessonsByDifficulty,
  getAllLessons
} from '@/content';

// Get specific lesson
const lesson = getLessonById('radiation-shielding');

// Get all lessons in a unit
const unitLessons = getLessonsByUnit('nuclear-safety');

// Get by tag
const safetyLessons = getLessonsByTag('safety');

// Get by difficulty
const beginnerLessons = getLessonsByDifficulty('beginner');

// Get all
const allLessons = getAllLessons();
```

### Quizzes

```typescript
import {
  getQuizById,
  getQuizzesByCategory,
  getQuizzesByTag,
  getQuizzesByDifficulty,
  getAllQuizzes
} from '@/content';
```

### Myths

```typescript
import {
  getMythById,
  getMythsByCategory,
  getMythsByTag,
  getMythsByDifficulty,
  getPopularMyths,
  getAllMyths
} from '@/content';

// Get most popular myths
const popular = getPopularMyths(10);
```

### Facts

```typescript
import {
  getFactById,
  getFactsByCategory,
  getFactsByTag,
  getFactsByImportance,
  getCriticalFacts,
  getRecentFacts,
  getAllFacts
} from '@/content';

// Get critical facts
const critical = getCriticalFacts();

// Get recent facts
const recent = getRecentFacts(5);
```

### Universal Functions

```typescript
import { searchContent, getContentMetadata } from '@/content';

// Search across all content
const results = searchContent('radiation');
// Returns: { lessons: [], quizzes: [], myths: [], facts: [], total: number }

// Get metadata
const metadata = getContentMetadata();
// Returns: { totalLessons, totalQuizzes, totalMyths, totalFacts, categories, lastUpdated }
```

## 📊 Content Categories

All content is organized by these categories:

| Category | Description | Icon | Color |
|----------|-------------|------|-------|
| Safety | Nuclear safety and radiation protection | ShieldTick | #FFB74D |
| Waste | Nuclear waste handling and storage | Trash | #64B5F6 |
| Environment | Environmental impact and benefits | Global | #81C784 |
| Energy | How nuclear energy is generated | Flash | #BA68C8 |
| History | Nuclear energy history and development | Book | #E57373 |
| Future | Next-generation nuclear technology | Rocket | #4DB6AC |

## 🏷️ Common Tags

- `safety`, `radiation`, `shielding`, `protection`
- `waste`, `storage`, `disposal`, `recycling`
- `environment`, `climate`, `emissions`, `clean-energy`
- `fission`, `fusion`, `reactor`, `fuel`
- `history`, `accidents`, `regulations`
- `future`, `smr`, `generation-iv`

## ✅ Current Content

### Lessons (2)
- ✅ Radiation Shielding (beginner, 5 min, 50 XP)
- ✅ Nuclear Fission Basics (beginner, 7 min, 60 XP)

### Quizzes (1)
- ✅ Radiation Safety Basics (easy, 6 questions, 30 XP)

### Myths (2)
- ✅ Nuclear Waste Lasts Forever (medium difficulty, popularity: 9)
- ✅ Nuclear Energy Is Not Clean (easy difficulty, popularity: 10)

### Facts (2)
- ✅ Nuclear Waste Volume is Incredibly Small (high importance)
- ✅ Nuclear Has Lowest Lifecycle Carbon Emissions (critical importance)

## 🎨 Usage in Components

### In Lesson Screen

```typescript
// app/lesson/[id].tsx
import { getLessonById } from '@/content';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const lesson = getLessonById(id as string);
  
  if (!lesson) return <NotFound />;
  
  // Render lesson steps
  return <LessonView lesson={lesson} />;
}
```

### In Wiki/Community

```typescript
// app/(tabs)/wiki.tsx
import { getAllMyths, getAllFacts } from '@/content';

export default function WikiScreen() {
  const myths = getAllMyths();
  const facts = getAllFacts();
  
  return (
    <View>
      {myths.map(myth => <MythCard key={myth.id} myth={myth} />)}
      {facts.map(fact => <FactCard key={fact.id} fact={fact} />)}
    </View>
  );
}
```

### In Home Dashboard

```typescript
// app/(tabs)/index.tsx
import { getPopularMyths, getCriticalFacts } from '@/content';

export default function HomeScreen() {
  const popularMyths = getPopularMyths(3);
  const criticalFacts = getCriticalFacts();
  
  return (
    <View>
      <Section title="Popular Myths">
        {popularMyths.map(myth => <MythPreview key={myth.id} myth={myth} />)}
      </Section>
    </View>
  );
}
```

### In Search

```typescript
import { searchContent } from '@/content';

const handleSearch = (query: string) => {
  const results = searchContent(query);
  
  console.log(`Found ${results.total} results`);
  console.log(`- ${results.lessons.length} lessons`);
  console.log(`- ${results.quizzes.length} quizzes`);
  console.log(`- ${results.myths.length} myths`);
  console.log(`- ${results.facts.length} facts`);
};
```

## ➕ Adding New Content

### Step 1: Create Content File

```typescript
// content/lessons/my-new-lesson.ts
import { Lesson } from '../types';

export const myNewLesson: Lesson = {
  // ... lesson definition (see TEMPLATES.md)
};

export default myNewLesson;
```

### Step 2: Register in Index

```typescript
// content/lessons/index.ts
import myNewLesson from './my-new-lesson';

export const lessons: Record<string, Lesson> = {
  // ... existing lessons
  'my-new-lesson': myNewLesson,
};
```

### Step 3: Use in App

```typescript
import { getLessonById } from '@/content';

const lesson = getLessonById('my-new-lesson');
```

## 📝 Content Templates

See `content/TEMPLATES.md` for complete templates for:
- Lessons
- Quizzes
- Myths
- Facts

Each template includes:
- Full TypeScript structure
- All required fields
- Optional fields
- Examples
- Best practices

## 🔍 Type Definitions

All types are defined in `content/types.ts`:

- `Lesson` - Interactive lesson structure
- `Quiz` - Quiz and question types
- `Myth` - Myth structure
- `Fact` - Fact structure
- `Source` - Source reference
- `ContentCategory` - Category definition
- `Unit` - Unit structure
- `LevelNode` - Map node structure

## 📚 Documentation Files

1. **content/README.md** - Complete guide to content system
2. **content/TEMPLATES.md** - Templates for creating new content
3. **CONTENT_STRUCTURE.md** - This file (overview)

## ✨ Benefits

✅ **Type-Safe**: Full TypeScript support  
✅ **Organized**: Clear directory structure  
✅ **Searchable**: Search across all content  
✅ **Filterable**: Filter by category, tag, difficulty  
✅ **Reusable**: Helper functions for common operations  
✅ **Scalable**: Easy to add new content  
✅ **Documented**: Comprehensive documentation  
✅ **Templated**: Quick content creation  

## 🚀 Next Steps

1. **Add More Content**: Use templates to create more lessons, quizzes, myths, and facts
2. **Integrate with UI**: Update existing screens to use content system
3. **Add Images**: Replace placeholder images with real ones
4. **Verify Sources**: Ensure all sources are credible and accessible
5. **Test Content**: Test all content in the app
6. **User Feedback**: Gather feedback and iterate

---

**Status:** ✅ Complete and Ready to Use  
**Last Updated:** November 23, 2025

