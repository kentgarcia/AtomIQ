# Content Structure Diagram

## 📊 Visual Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CONTENT SYSTEM                          │
│                     (@/content/)                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   LESSONS     │    │    QUIZZES    │    │     MYTHS     │
│               │    │               │    │               │
│ • Radiation   │    │ • Safety Quiz │    │ • Waste Myth  │
│   Shielding   │    │               │    │ • Clean Myth  │
│ • Nuclear     │    │               │    │               │
│   Fission     │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌───────────────┐
                    │     FACTS     │
                    │               │
                    │ • Waste Vol.  │
                    │ • Emissions   │
                    └───────────────┘
```

## 🔄 Content Flow

```
┌──────────────┐
│   User App   │
└──────┬───────┘
       │
       │ import { getLessonById } from '@/content'
       │
       ▼
┌──────────────────────────────────────────────┐
│         content/index.ts                      │
│  (Main Export Hub)                            │
│                                               │
│  • Exports all content types                  │
│  • Provides helper functions                  │
│  • Enables search & filtering                 │
└──────┬───────────────────────────────────────┘
       │
       │ Aggregates from:
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ▼                                         ▼
┌──────────────┐                        ┌──────────────┐
│ lessons/     │                        │ quizzes/     │
│ index.ts     │                        │ index.ts     │
│              │                        │              │
│ Imports:     │                        │ Imports:     │
│ • lesson1.ts │                        │ • quiz1.ts   │
│ • lesson2.ts │                        │ • quiz2.ts   │
└──────────────┘                        └──────────────┘
       │                                         │
       ▼                                         ▼
┌──────────────┐                        ┌──────────────┐
│ myths/       │                        │ facts/       │
│ index.ts     │                        │ index.ts     │
│              │                        │              │
│ Imports:     │                        │ Imports:     │
│ • myth1.ts   │                        │ • fact1.ts   │
│ • myth2.ts   │                        │ • fact2.ts   │
└──────────────┘                        └──────────────┘
```

## 🎯 Lesson Structure

```
┌────────────────────────────────────────┐
│           LESSON                        │
│  (radiation-shielding)                  │
└────────────────────────────────────────┘
                 │
                 │ Contains 6 Steps:
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Step 1  │  │ Step 2  │  │ Step 3  │
│Briefing │  │  Myth   │  │ Micro   │
│         │  │ Buster  │  │ Learn   │
└─────────┘  └─────────┘  └─────────┘
    │            │            │
    └────────────┼────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Step 4  │  │ Step 5  │  │ Step 6  │
│   Lab   │  │Assessment│ │ Debrief │
│         │  │         │  │         │
└─────────┘  └─────────┘  └─────────┘
```

## 🔗 Content Relationships

```
┌─────────────┐
│   LESSON    │
│  (Fission)  │
└──────┬──────┘
       │
       │ references
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│    MYTH     │    │    FACT     │
│  (Fusion=   │    │ (Energy     │
│   Fission)  │    │  Density)   │
└──────┬──────┘    └──────┬──────┘
       │                  │
       │ relatedLessons   │ relatedLessons
       │                  │
       └────────┬─────────┘
                │
                ▼
         ┌─────────────┐
         │    QUIZ     │
         │  (Nuclear   │
         │   Basics)   │
         └─────────────┘
```

## 📦 Type Hierarchy

```
┌─────────────────────────────────────────┐
│          types.ts                        │
│  (All Type Definitions)                  │
└─────────────────────────────────────────┘
                 │
                 │ Defines:
                 │
    ┌────────────┼────────────┬────────────┐
    │            │            │            │
    ▼            ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│ Lesson │  │  Quiz  │  │  Myth  │  │  Fact  │
│        │  │        │  │        │  │        │
│ • id   │  │ • id   │  │ • id   │  │ • id   │
│ • title│  │ • title│  │ • title│  │ • title│
│ • steps│  │ • ques │  │ • myth │  │ • state│
│ • tags │  │ • tags │  │ • tags │  │ • tags │
└────────┘  └────────┘  └────────┘  └────────┘
    │            │            │            │
    └────────────┼────────────┴────────────┘
                 │
                 │ All extend:
                 │
                 ▼
         ┌──────────────┐
         │   Common     │
         │   Fields     │
         │              │
         │ • id         │
         │ • title      │
         │ • category   │
         │ • tags       │
         └──────────────┘
```

## 🔍 Search Flow

```
┌──────────────┐
│  User Types  │
│  "radiation" │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│  searchContent('radiation')  │
└──────┬───────────────────────┘
       │
       │ Searches in:
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│   LESSONS    │                  │   QUIZZES    │
│              │                  │              │
│ • title      │                  │ • title      │
│ • description│                  │ • description│
│ • tags       │                  │ • tags       │
└──────┬───────┘                  └──────┬───────┘
       │                                 │
       └─────────────┬───────────────────┘
                     │
       ┌─────────────┴───────────────┐
       │                             │
       ▼                             ▼
┌──────────────┐              ┌──────────────┐
│    MYTHS     │              │    FACTS     │
│              │              │              │
│ • title      │              │ • title      │
│ • statement  │              │ • statement  │
│ • tags       │              │ • tags       │
└──────┬───────┘              └──────┬───────┘
       │                             │
       └─────────────┬───────────────┘
                     │
                     ▼
            ┌────────────────┐
            │    RESULTS     │
            │                │
            │ • lessons: []  │
            │ • quizzes: []  │
            │ • myths: []    │
            │ • facts: []    │
            │ • total: 12    │
            └────────────────┘
```

## 📱 App Integration

```
┌─────────────────────────────────────────┐
│          APP SCREENS                     │
└─────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┬────────────┐
    │            │            │            │
    ▼            ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│  Home  │  │  Map   │  │  Wiki  │  │ Lesson │
│        │  │        │  │        │  │        │
│ Uses:  │  │ Uses:  │  │ Uses:  │  │ Uses:  │
│ • Myths│  │ •Lesson│  │ • Myths│  │ •Lesson│
│ • Facts│  │  Data  │  │ • Facts│  │  Steps │
└────────┘  └────────┘  └────────┘  └────────┘
                 │
                 │ All import from:
                 │
                 ▼
         ┌──────────────┐
         │   @/content  │
         │              │
         │ • getLessonById()
         │ • getAllMyths()
         │ • searchContent()
         │ • getMetadata()
         └──────────────┘
```

## 🎨 Category Organization

```
                    ┌──────────────┐
                    │  CATEGORIES  │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────┐        ┌────────┐        ┌────────┐
    │ Safety │        │ Waste  │        │  Env.  │
    │        │        │        │        │        │
    │ 🛡️     │        │ 🗑️     │        │ 🌍     │
    └────────┘        └────────┘        └────────┘
        │                  │                  │
        ├──────────────────┼──────────────────┤
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────┐        ┌────────┐        ┌────────┐
    │ Energy │        │History │        │ Future │
    │        │        │        │        │        │
    │ ⚡     │        │ 📚     │        │ 🚀     │
    └────────┘        └────────┘        └────────┘
```

## 🔄 Content Lifecycle

```
1. CREATE
   ┌────────────────┐
   │ Use Template   │
   │ from           │
   │ TEMPLATES.md   │
   └───────┬────────┘
           │
           ▼
2. REGISTER
   ┌────────────────┐
   │ Add to         │
   │ index.ts       │
   └───────┬────────┘
           │
           ▼
3. TEST
   ┌────────────────┐
   │ Test in app    │
   │ Verify data    │
   └───────┬────────┘
           │
           ▼
4. USE
   ┌────────────────┐
   │ Import in      │
   │ components     │
   └───────┬────────┘
           │
           ▼
5. UPDATE
   ┌────────────────┐
   │ Modify as      │
   │ needed         │
   └────────────────┘
```

---

**Legend:**
- 📦 Package/Module
- 📁 Directory
- 📄 File
- 🔗 Relationship
- ➡️ Data Flow
- 🔄 Process Flow

