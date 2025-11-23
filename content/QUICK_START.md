# 🚀 Content System Quick Start

## 5-Minute Setup Guide

### 1. Understanding the Structure (30 seconds)

```
content/
├── lessons/     # Interactive multi-step lessons
├── quizzes/     # Assessment quizzes
├── myths/       # Common misconceptions
└── facts/       # Verified information
```

### 2. Using Existing Content (1 minute)

```typescript
// In any component
import { getLessonById, getAllMyths, searchContent } from '@/content';

// Get a lesson
const lesson = getLessonById('radiation-shielding');

// Get all myths
const myths = getAllMyths();

// Search everything
const results = searchContent('nuclear');
```

### 3. Adding New Content (3 minutes)

**Step 1:** Copy template from `TEMPLATES.md`

**Step 2:** Create file
```bash
# Example: New lesson
touch content/lessons/my-lesson.ts
```

**Step 3:** Fill in content
```typescript
import { Lesson } from '../types';

export const myLesson: Lesson = {
  id: 'my-lesson',
  title: 'My Lesson Title',
  description: 'What students will learn',
  unitId: 'unit-id',
  difficulty: 'beginner',
  estimatedMinutes: 5,
  xpReward: 50,
  tags: ['tag1', 'tag2'],
  steps: [
    // Copy from template
  ]
};

export default myLesson;
```

**Step 4:** Register in index
```typescript
// content/lessons/index.ts
import myLesson from './my-lesson';

export const lessons: Record<string, Lesson> = {
  // ... existing lessons
  'my-lesson': myLesson,
};
```

**Step 5:** Use it!
```typescript
const lesson = getLessonById('my-lesson');
```

## 📖 Common Tasks

### Get Content by ID
```typescript
import { getLessonById, getMythById, getFactById } from '@/content';

const lesson = getLessonById('radiation-shielding');
const myth = getMythById('nuclear-waste-forever');
const fact = getFactById('carbon-emissions');
```

### Filter Content
```typescript
import { getLessonsByTag, getMythsByCategory } from '@/content';

const safetyLessons = getLessonsByTag('safety');
const wasteMyths = getMythsByCategory('waste');
```

### Search Everything
```typescript
import { searchContent } from '@/content';

const results = searchContent('radiation');
// Returns: { lessons: [], quizzes: [], myths: [], facts: [], total: number }
```

### Get Popular/Critical Content
```typescript
import { getPopularMyths, getCriticalFacts } from '@/content';

const topMyths = getPopularMyths(5);
const importantFacts = getCriticalFacts();
```

## 🎯 Content Types Cheat Sheet

### Lesson
- 6 steps: Briefing → Myth → Learn → Lab → Quiz → Debrief
- 5-10 minutes
- Interactive activities
- XP rewards

### Quiz
- Multiple choice or True/False
- 5-10 questions
- Timed or untimed
- Passing score

### Myth
- Myth statement
- Reality/truth
- Detailed explanation
- Credible sources

### Fact
- Fact statement
- Explanation
- Sources
- Importance level

## 📚 Documentation Files

| File | Purpose | Read When |
|------|---------|-----------|
| `README.md` | Complete guide | Learning the system |
| `TEMPLATES.md` | Content templates | Creating content |
| `STRUCTURE_DIAGRAM.md` | Visual diagrams | Understanding flow |
| `QUICK_START.md` | This file | Getting started |

## 🔗 Quick Links

- **Full Documentation**: `content/README.md`
- **Templates**: `content/TEMPLATES.md`
- **Type Definitions**: `content/types.ts`
- **System Overview**: `CONTENT_STRUCTURE.md`

## ⚡ Pro Tips

1. **Always use templates** - Saves time and ensures consistency
2. **Add sources** - Builds credibility
3. **Cross-reference** - Link related content
4. **Tag properly** - Makes content discoverable
5. **Test in app** - Verify before committing

## 🆘 Need Help?

1. Check `content/README.md` for detailed docs
2. Look at existing content for examples
3. Use templates from `TEMPLATES.md`
4. All types are in `content/types.ts`

## ✅ Checklist for New Content

- [ ] Copy appropriate template
- [ ] Fill in all required fields
- [ ] Add credible sources
- [ ] Tag appropriately
- [ ] Link related content
- [ ] Register in index file
- [ ] Test in app
- [ ] Check for typos

---

**You're ready to go!** 🎉

Start by exploring existing content, then use templates to create your own.

