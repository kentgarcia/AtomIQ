# Content Directory

This directory contains all educational content for the AtomIQ app, organized into four main categories:

## 📁 Directory Structure

```
content/
├── types.ts              # TypeScript type definitions
├── index.ts              # Main export file
├── README.md            # This file
│
├── lessons/             # Interactive lessons
│   ├── index.ts
│   ├── radiation-shielding.ts
│   ├── nuclear-fission.ts
│   └── ...
│
├── quizzes/             # Assessment quizzes
│   ├── index.ts
│   ├── radiation-safety-quiz.ts
│   └── ...
│
├── myths/               # Common myths and misconceptions
│   ├── index.ts
│   ├── nuclear-waste-forever.ts
│   ├── nuclear-not-clean.ts
│   └── ...
│
└── facts/               # Nuclear energy facts
    ├── index.ts
    ├── nuclear-waste-volume.ts
    ├── carbon-emissions.ts
    └── ...
```

## 📚 Content Types

### 1. Lessons (`lessons/`)

Interactive multi-step learning experiences that include:
- **Briefing**: Introduction to the topic
- **Myth Buster**: Debunk a common myth
- **Micro Learn**: Core concept explanation
- **Lab**: Interactive simulation/activity
- **Assessment**: Knowledge check
- **Debrief**: Summary and rewards

**Example:**
```typescript
import { Lesson } from '../types';

export const myLesson: Lesson = {
  id: 'my-lesson',
  title: 'Lesson Title',
  description: 'Brief description',
  unitId: 'unit-id',
  difficulty: 'beginner',
  estimatedMinutes: 5,
  xpReward: 50,
  tags: ['tag1', 'tag2'],
  steps: [
    // Step definitions
  ]
};
```

### 2. Quizzes (`quizzes/`)

Assessment quizzes with multiple question types:
- Multiple choice
- True/False
- Matching
- Fill in the blank

**Example:**
```typescript
import { Quiz } from '../types';

export const myQuiz: Quiz = {
  id: 'my-quiz',
  title: 'Quiz Title',
  description: 'Brief description',
  category: 'safety',
  difficulty: 'easy',
  passingScore: 70,
  xpReward: 30,
  questions: [
    // Question definitions
  ]
};
```

### 3. Myths (`myths/`)

Common misconceptions about nuclear energy with:
- Myth statement
- Reality/truth
- Detailed explanation
- Sources and references
- Related content links

**Example:**
```typescript
import { Myth } from '../types';

export const myMyth: Myth = {
  id: 'my-myth',
  title: 'Myth Title',
  mythStatement: 'The false belief',
  reality: 'The actual truth',
  explanation: 'Detailed explanation...',
  category: 'waste',
  difficulty: 'medium',
  popularity: 8,
  sources: [
    // Source references
  ]
};
```

### 4. Facts (`facts/`)

Verified facts about nuclear energy with:
- Fact statement
- Detailed explanation
- Sources and references
- Importance level
- Related content links

**Example:**
```typescript
import { Fact } from '../types';

export const myFact: Fact = {
  id: 'my-fact',
  title: 'Fact Title',
  statement: 'The fact statement',
  explanation: 'Detailed explanation...',
  category: 'environment',
  importance: 'high',
  sources: [
    // Source references
  ],
  dateAdded: '2025-01-15',
  lastUpdated: '2025-01-15'
};
```

## 🔧 Usage

### Import Individual Content

```typescript
import { radiationShieldingLesson } from '@/content/lessons/radiation-shielding';
import { nuclearWasteForeverMyth } from '@/content/myths/nuclear-waste-forever';
```

### Import All Content of a Type

```typescript
import { getAllLessons, getAllMyths } from '@/content';

const lessons = getAllLessons();
const myths = getAllMyths();
```

### Get Content by ID

```typescript
import { getLessonById, getMythById } from '@/content';

const lesson = getLessonById('radiation-shielding');
const myth = getMythById('nuclear-waste-forever');
```

### Filter Content

```typescript
import { 
  getLessonsByTag, 
  getMythsByCategory,
  getFactsByImportance 
} from '@/content';

const safetyLessons = getLessonsByTag('safety');
const wasteMyths = getMythsByCategory('waste');
const criticalFacts = getFactsByImportance('critical');
```

### Search Content

```typescript
import { searchContent } from '@/content';

const results = searchContent('radiation');
// Returns: { lessons: [], quizzes: [], myths: [], facts: [], total: number }
```

### Get Metadata

```typescript
import { getContentMetadata } from '@/content';

const metadata = getContentMetadata();
// Returns: { totalLessons, totalQuizzes, totalMyths, totalFacts, categories, lastUpdated }
```

## ➕ Adding New Content

### 1. Create the Content File

Create a new TypeScript file in the appropriate directory:

```typescript
// content/lessons/my-new-lesson.ts
import { Lesson } from '../types';

export const myNewLesson: Lesson = {
  // ... lesson definition
};

export default myNewLesson;
```

### 2. Register in Index File

Add to the appropriate index file:

```typescript
// content/lessons/index.ts
import myNewLesson from './my-new-lesson';

export const lessons: Record<string, Lesson> = {
  // ... existing lessons
  'my-new-lesson': myNewLesson,
};
```

### 3. Use in Your App

```typescript
import { getLessonById } from '@/content';

const lesson = getLessonById('my-new-lesson');
```

## 📊 Content Categories

All content is organized by these categories:

- **Safety**: Nuclear safety and radiation protection
- **Waste**: Nuclear waste handling and storage
- **Environment**: Environmental impact and benefits
- **Energy**: How nuclear energy is generated
- **History**: Nuclear energy history and development
- **Future**: Next-generation nuclear technology

## 🏷️ Tags

Use tags to cross-reference content:

- `safety`, `radiation`, `shielding`, `protection`
- `waste`, `storage`, `disposal`, `recycling`
- `environment`, `climate`, `emissions`, `clean-energy`
- `fission`, `fusion`, `reactor`, `fuel`
- `history`, `accidents`, `regulations`
- `future`, `smr`, `generation-iv`

## 📝 Best Practices

1. **Always include sources** for myths and facts
2. **Use clear, simple language** for explanations
3. **Add relevant images** when available
4. **Cross-reference related content** using IDs
5. **Keep lessons short** (5-10 minutes)
6. **Tag appropriately** for discoverability
7. **Update lastUpdated** when modifying facts
8. **Test content** in the app before committing

## 🔍 Content Guidelines

### Lessons
- 5-10 minutes completion time
- 5-6 steps maximum
- Clear learning objectives
- Interactive elements
- Immediate feedback

### Quizzes
- 5-10 questions
- Mix of difficulties
- Clear explanations for answers
- Time limits optional
- Passing score 70%+

### Myths
- Common misconceptions only
- Evidence-based rebuttals
- Multiple credible sources
- Respectful tone
- Related content links

### Facts
- Verified information only
- Multiple credible sources
- Regular updates
- Importance ratings
- Context and explanation

## 📚 Resources

- [World Nuclear Association](https://world-nuclear.org/)
- [IAEA](https://www.iaea.org/)
- [U.S. Department of Energy](https://www.energy.gov/)
- [Nuclear Energy Institute](https://www.nei.org/)
- [IPCC Reports](https://www.ipcc.ch/)

## 🤝 Contributing

When adding new content:

1. Follow the type definitions in `types.ts`
2. Add to the appropriate directory
3. Register in the index file
4. Include proper metadata
5. Add sources and references
6. Test in the app
7. Update this README if needed

---

**Last Updated:** November 23, 2025

