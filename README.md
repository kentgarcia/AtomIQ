<div align="center">

<img src="assets/images/icon.png" alt="AtomIQ" width="128" />

# AtomIQ

### Make the atom make sense.

An offline-first nuclear science learning app for curious minds — built around short lessons, playful experiments, and just enough game energy to keep the next question irresistible.

<p>
  <img src="https://img.shields.io/badge/Expo%20SDK-58-4630EB?style=flat-square&logo=expo&logoColor=white" alt="Expo SDK 58" />
  <img src="https://img.shields.io/badge/React%20Native-0.88-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React Native 0.88" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Offline--first-local%20SQLite-2E7D32?style=flat-square" alt="Offline-first local SQLite" />
</p>

<p>
  <a href="#get-started">Get started</a>
  &nbsp;·&nbsp;
  <a href="#what-you-can-do">Explore the app</a>
  &nbsp;·&nbsp;
  <a href="#documentation">Read the docs</a>
</p>

</div>

<br />

> AtomIQ turns nuclear physics, radiation safety, and clean-energy topics into a guided learning journey that works without an account — or a network connection.

## What you can do

| Learn | Explore | Play |
| --- | --- | --- |
| Follow lessons, quizzes, micro-learning cards, and lab prompts. | Search the encyclopedia, browse science stories, and follow guided journeys. | Bust myths, run challenges, chase streaks, and navigate the Atom Maze. |

### A learning loop with momentum

```text
  Discover a question
          ↓
  Learn the idea in a short lesson
          ↓
  Test your intuition with a quiz or game
          ↓
  Earn XP, stars, streaks, and achievements
          ↓
  Go one layer deeper
```

## The experience

### Learning Path

Move through units that combine briefings, micro-learning cards, hands-on prompts, myth-busting rounds, and assessments. Every completed module feeds progress, XP, stars, and level growth.

### MythBuster

Put nuclear-science assumptions to the test in three modes:

- **Quick Play** for a fast round of fact-checking.
- **Challenge** for timed decision-making.
- **Endless** for a survival-style run and a personal best.

### AtomIQ Guide

Meet **Shrodi**, the mascot-powered guide. Pill-based prompts make it easy to jump from a question to the right lesson, article, encyclopedia entry, journey, or game — no typing required.

### Explorer and Lab

Follow guided journeys such as *Nuclear Safety* and *Radiation Reality*, then experiment with the **Dose Visualizer** and **Energy Showdown** to compare ideas through interaction rather than memorization.

### Discovery and progress

Browse a category-filtered feed of facts and stories, save bookmarks locally, complete daily missions, build a streak, collect awards, and compare personal bests on the leaderboard.

### Your app, your pace

Customize your avatar and display name, choose light/dark/system themes, control sounds and haptics, use text-to-speech on supported content, and delete local data from Settings.

<div align="center">
  <img src="assets/images/mascot/happy.png" alt="Shrodi, the AtomIQ guide mascot" width="220" />
</div>

## Why it is built this way

- **Offline-first by default.** Lessons, quizzes, games, Guide content, and the encyclopedia ship with the app in a local SQLite database.
- **Small moments, real understanding.** Content is broken into approachable steps without flattening the science.
- **Play is part of the explanation.** Games and visualizers turn misconceptions into something users can inspect and revise.
- **A calm, expressive interface.** The custom design system pairs an autumn-inspired palette with mascot-led guidance, motion, sound, and haptics.
- **Local by design.** Progress, bookmarks, settings, and profile choices are stored on-device; no account is required for the core experience.

## Tech stack

| Layer | Technology |
| --- | --- |
| App runtime | Expo SDK 58, React Native 0.88, React 19.3 |
| Language | TypeScript with strict checking |
| Navigation | Expo Router 58 with typed routes |
| Data | Expo SQLite for bundled content and local app state; AsyncStorage for lightweight preferences |
| UI and motion | Custom components, React Native Reanimated 4, Gesture Handler, SVG, Linear Gradient, Expo Image |
| Feedback | Expo Audio, Expo Speech, Expo Haptics |
| Typography | Bundled SNPro font family |
| Builds | EAS Build; preview APKs and production Android App Bundles |

## Project map

```text
app/                         Expo Router screens and flows
├── (tabs)/                  Home, Discovery, Guide, Games, Profile
├── explorer/                Journeys, encyclopedia, Atom Maze
├── lab/                     Dose Visualizer and Energy Showdown
├── lesson/                  Lesson renderer and lesson flow
└── mythbuster/              MythBuster modes and results

components/                  Shared UI, games, Guide, lessons, and markdown
content/                     Typed lessons, quizzes, myths, facts, and articles
services/                    SQLite, storage, Guide engine, missions, media
theme/                       Tokens, palettes, themes, layout, and motion
scripts/                     Content editor, migration, and database tooling
docs/                        Product, Android UX, release, and upgrade specs
```

## Get started

### Requirements

- Node.js `22.13+`
- npm
- An Expo-compatible Android or iOS development environment, or Expo Go

### Install and run

```bash
npm install

# Sync the content database and start the Expo development server
npm run start
```

From the Expo CLI, press:

```text
w  open web
a  open Android
i  open iOS
```

Or run a platform directly:

```bash
npm run android
npm run ios
npm run web
```

The app works offline after installation. The `start`, `android`, `ios`, and `web` scripts synchronize the bundled content database before launching Expo.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run start` | Sync content and start the Expo development server |
| `npm run android` | Sync content and start Expo for Android |
| `npm run ios` | Sync content and start Expo for iOS |
| `npm run web` | Sync content and start Expo for web |
| `npm run sync-content` | Rebuild the bundled SQLite content database |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run lint` | Run the Expo ESLint configuration |
| `npm run lint:fix` | Apply safe ESLint fixes |
| `npm run content-editor` | Open the interactive content editor |
| `npm run content-studio` | Start the browser-based content studio |
| `npm run eas:preview:android` | Build an internal Android preview APK with EAS |
| `./build-apk.sh` | Run the project's interactive APK build helper |

Before opening a pull request, run:

```bash
npm run sync-content
npm run typecheck
npm run lint
```

## Android builds

Use the committed EAS profiles for Android distribution:

```bash
# Internal testing / sideloadable APK
npx eas build --platform android --profile preview

# Google Play production bundle
npx eas build --platform android --profile production
```

The `preview` profile produces an APK for device testing. The `production` profile produces an Android App Bundle for Google Play.

If the build requires environment secrets, use the project helper or push the local environment file through EAS:

```bash
./build-apk.sh
# or
npx eas secret:push --scope project --env-file .env.local --force
```

For Android UI validation, use a release-like build on physical devices. Expo Go is useful for iteration, but it is not the final parity gate for safe areas, system back, keyboard resizing, TTS, fonts, audio, or Android elevation.

## Content pipeline

Content starts as typed source and becomes the bundled SQLite database used at runtime:

```text
content/*.ts
      ↓
scripts/content-migration/ts-to-json.js
      ↓
scripts/content-migration/seed-sqlite.js
      ↓
assets/database/content.db
      ↓
services/content-db.ts
```

Typical content workflow:

1. Edit lessons, quizzes, myths, facts, articles, or journeys in `content/`.
2. Run `npm run sync-content`.
3. Launch the app and verify the updated content in the relevant flow.
4. Include the regenerated database in the change when the content hash/version changes.

The content tooling is also available through `npm run content-editor` and `npm run content-studio`.

## Documentation

| Document | What it covers |
| --- | --- |
| [Android Responsive UI/UX Spec](docs/ANDROID_RESPONSIVE_UI_UX_SPEC.md) | Responsive behavior, safe areas, tablets, keyboard, back, and visual parity |
| [Android UI/UX UAT Checklist](docs/ANDROID_UI_UX_UAT_CHECKLIST.md) | Device matrix, user acceptance checks, evidence, defects, and sign-off |
| [Play Release Checklist](docs/PLAY_RELEASE_CHECKLIST.md) | Versioning, signing, build hygiene, rollout, and release gates |
| [Google Play Launch Spec](docs/GOOGLE_PLAY_LAUNCH_SPEC.md) | Launch risks, Android QA gates, policy readiness, and store assets |
| [Expo SDK 58 Upgrade Spec](docs/EXPO_SDK_58_UPGRADE_SPEC.md) | SDK upgrade decisions, compatibility notes, and verification work |
| [Chat UI Guide](docs/CHAT_UI_GUIDE.md) | Guide/chat interface patterns and implementation notes |

## Contributing

AtomIQ is currently a private project. For changes inside the repository:

1. Keep feature behavior and content changes close to their owning route or domain.
2. Prefer shared primitives and theme tokens over one-off device-specific fixes.
3. Run content sync, typecheck, and lint before handing off work.
4. For Android UI changes, attach screenshots or recordings from the relevant device class and update the UAT checklist when acceptance behavior changes.

## License

Private project.

<div align="center">

<sub>Built for people who are not afraid to ask, “But why?”</sub>

</div>
