# 🔧 Import Path Fix

## Issue
`TypeError: Cannot read property 'getLessonById' of undefined`

## Root Cause
The import path `@/content` was not properly resolving the `getLessonById` function due to the re-export chain.

## Solution
Changed imports to be more explicit and direct:

### Before
```typescript
import { getLessonById } from '@/content';
import { UNITS as SYLLABUS_UNITS } from '@/content';
```

### After
```typescript
import { getLessonById } from '@/content/lessons';
import { UNITS as SYLLABUS_UNITS } from '@/content/units';
```

## Files Fixed

1. **`app/lesson/[id].tsx`**
   - Changed: `import { getLessonById } from '@/content'`
   - To: `import { getLessonById } from '@/content/lessons'`

2. **`app/map/index.tsx`**
   - Changed: `import { UNITS as SYLLABUS_UNITS } from '@/content'`
   - To: `import { UNITS as SYLLABUS_UNITS } from '@/content/units'`

## Why This Works

Direct imports bypass the re-export chain:

```
app/lesson/[id].tsx
    ↓ Direct import
content/lessons/index.ts
    ↓ Exports getLessonById
✅ Function found
```

Instead of:

```
app/lesson/[id].tsx
    ↓ Import from content
content/index.ts
    ↓ Re-export from lessons
content/lessons/index.ts
    ↓ Exports getLessonById
❌ Re-export chain issue
```

## Verification

Run the app and navigate to a lesson:
1. Open map
2. Tap on "Meet the Atom"
3. Lesson should load correctly

## Alternative Solution (Optional)

If you prefer using `@/content`, you can also explicitly re-export in `content/index.ts`:

```typescript
// content/index.ts
export { getLessonById, getAllLessons, getLessonsByUnit } from './lessons';
export { UNITS, getUnitById, getUnitProgress } from './units';
```

But the direct import approach is cleaner and more explicit.

---

**Status**: ✅ Fixed  
**Files Modified**: 2  
**Ready to test**: Yes

