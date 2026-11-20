<div align="center">

<img src="assets/images/icon.png" alt="AtomIQ" width="120" />

# AtomIQ

### Make the atom make sense.

Nuclear science, one small win at a time. An offline-first learning app with short lessons, a cast of teachers, a phone full of tiny apps and a platformer to play between questions. No account, no network, no lecture hall.

<p>
  <img src="https://img.shields.io/badge/Expo%20SDK-58-F9B71F?style=for-the-badge&logo=expo&logoColor=white&labelColor=D9981A" alt="Expo SDK 58" />
  <img src="https://img.shields.io/badge/React%20Native-0.88-F9B71F?style=for-the-badge&logo=react&logoColor=white&labelColor=D9981A" alt="React Native 0.88" />
  <img src="https://img.shields.io/badge/TypeScript-strict-F9B71F?style=for-the-badge&logo=typescript&logoColor=white&labelColor=D9981A" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Offline--first-SQLite-7F5AC2?style=for-the-badge&labelColor=5F42A0" alt="Offline-first SQLite" />
</p>

<p>
  <a href="#a-tour-of-the-app"><b>Tour the app</b></a>
  &nbsp;·&nbsp;
  <a href="#get-started"><b>Get started</b></a>
  &nbsp;·&nbsp;
  <a href="#build-an-apk"><b>Build an APK</b></a>
  &nbsp;·&nbsp;
  <a href="#documentation"><b>Docs</b></a>
</p>

<img src="assets/images/mascot/happy.png" alt="Shrodi, the AtomIQ mascot" width="200" />

</div>

<br />

> Radiation, reactors, half-lives and safety are easy to fear and hard to understand. AtomIQ turns them into a path you can walk in five-minute steps, with a teacher beside every lesson and a game waiting when you finish.

## The loop

```text
   Ask a question  →  Learn it in a short lesson  →  Answer it, get graded at once
        ↑                                                        ↓
   Go one layer deeper  ←  Earn XP, stars, streaks, diamonds  ←  Play, chat, collect
```

Every answer is graded the moment it is given. Every lesson ends on a stamp, a count-up and a sign-off from your teacher. Everything you earn has somewhere to go: a shop, a phone, a ranking, a badge.

## A tour of the app

Six tabs, one friendly mascot.

| Tab | What happens there |
| --- | --- |
| **Home** | The lesson map: a winding path of units, each in its own colour. Tap a node, get a speech bubble, start a lesson. A teacher teaches it as a short lecture, then you answer. |
| **Quests** | Daily and weekly quests, with a chest that opens when you finish them all and pays out diamonds. |
| **Feed** | The cast posts about what you really did, mini blog pieces, and a weekly ranking against them. React with a like, a love, a clap or a wow. There is no comment box, on purpose. |
| **Phone** | Your own fictional smartphone. Chat with Shrodi and your teachers, keep Field Notes, browse the Reference Library, scan everyday things with the Atom Scanner, take photos, read the Safety Guide, explore the Nuclear Map. Apps unlock as you progress. |
| **Games** | **Atom Maze**, a side-scrolling platformer where enemies fight you with questions. **MythBuster** in three modes. A Lab with the Dose Visualizer and Energy Showdown. |
| **Profile** | Your avatar, passport, badges and level. Spend diamonds in the **Shop** on hair, faces, clothes, skin, paints and patterns. |

Also in the box: an encyclopedia (AtomDex), a periodic table, daily facts, an onboarding that plays two real questions before it asks your name, and a short guided tour led by Shrodi.

### Meet the cast

**Shrodi** is the mascot and guide. Each field has its own teacher, drawn from the same flat, chunky figure system the learner's avatar uses, with their own outfit, profile cover and chats. They appear beside lessons, post in the Feed and message you on the Phone.

## Brand

AtomIQ should feel like a friendly, tactile toy for adults and kids: bright, flat and a little bouncy.

| Role | Colour | Used for |
| --- | --- | --- |
| Button yellow | ![#F9B71F](https://img.shields.io/badge/-%20%20%20%20-F9B71F?style=flat-square) `#F9B71F` | Primary buttons, the lesson card, the app icon |
| Lip yellow | ![#D9981A](https://img.shields.io/badge/-%20%20%20%20-D9981A?style=flat-square) `#D9981A` | The darker edge under every yellow button and card |
| Map purple | ![#7F5AC2](https://img.shields.io/badge/-%20%20%20%20-7F5AC2?style=flat-square) `#7F5AC2` | Home map background and its lip `#5F42A0` |
| Guide blue | ![#1CB0F6](https://img.shields.io/badge/-%20%20%20%20-1CB0F6?style=flat-square) `#1CB0F6` | Games and the phone's chat headers, lip `#1899D6` |

- **Face and lip.** Buttons, cards and map nodes are a flat face on a darker lip. Pressing one sinks it.
- **Flat, never glossy.** Figures and objects use flat colour with at most one shade. SVG gradients are banned in drawn art (they render black on device).
- **Juicy but quick.** Option buttons pop, stamps land, coins fly to their counter. Interface motion stays under 300 ms, and reduced motion is respected everywhere.
- **Calm science.** The art is playful, the facts are sourced and checked before they ship.
- **Light and dark.** Every colour is a theme role (`theme/`), never a hex literal in a screen. `npm run check:theme-colors` enforces it.

Rules for drawing, motion and exceptions are in `components/motion/MOTION.md`, `.claude/skills/` and [the theme exception register](docs/critical/THEME_EXCEPTION_REGISTER.md).

## Built to work offline

- **Content is a SQLite database**, bundled into the app and checked on every launch. The lessons, item bank, myths, encyclopedia, teachers and phone content all live in `content/database/content.db`.
- **Progress stays on the device.** Profile, XP, streaks, quests, photos, notes and chats are in a local database. The core experience needs no account.
- **No sensors, no network on the phone.** The Phone is a simulation: no camera, location, contacts or notifications access, and `npm run check:phone` fails the build if that changes.
- **Privacy and Terms** ship as text modules in `content/legal/`, and a test checks their claims against the app.

## Tech stack

| Layer | Technology |
| --- | --- |
| Runtime | Expo SDK 58, React Native 0.88, React 19.3, React Compiler |
| Language | TypeScript, strict |
| Navigation | Expo Router 58, typed routes |
| Data | Expo SQLite (bundled content and local state), AsyncStorage for preferences |
| UI and motion | React Native Reanimated 4, Gesture Handler, SVG, Lottie, Linear Gradient, Expo Image |
| Feedback | Expo Audio (one SFX catalog), Expo Speech, Expo Haptics |
| Type | Bundled variable font |
| Builds | EAS Build: preview APK, production AAB |

## Project map

```text
app/                     Expo Router screens
├── (tabs)/              Home, Quests, Feed, Phone, Games, Profile
├── lesson/ practice/    The lesson runner and practice, checkpoints, test-outs
├── explorer/            Atom Maze, journeys, encyclopedia
├── phone-apps/          Chats, Contacts, Field Notes, Scanner, Camera, Map, ...
├── lab/ mythbuster/     Lab experiments and MythBuster
└── shop.tsx npc/        The Shop and teacher profiles

components/              UI by area: lesson, path, npc, avatar, phone, platformer, ...
content/                 Types and facades over the SQLite content
  database/content.db    The master content database
services/                Storage, content DB, XP, quests, chats, feed, media
  *-core.ts              Framework-free logic with node --test suites
theme/                   Tokens, palettes, light and dark themes
tools/studio/            Content Studio, the web content editor
scripts/                 Checks, tests, content migration and release tooling
docs/                    Specs, grouped by importance (see Documentation)
```

## Get started

Requirements: **Node.js 22.13+**, npm, and Expo Go or an Android or iOS development environment.

```bash
npm install
npm run start        # syncs the content bundle, then starts Expo
```

Press `a` for Android, `i` for iOS or `w` for web, or run `npm run android`, `npm run ios` or `npm run web` directly. Expo Go is fine for iteration. Use a release-like Android build for safe areas, back handling, keyboard, TTS, fonts and audio.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run start` / `android` / `ios` / `web` | Sync content, then start Expo |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint (Expo config) |
| `npm run sync-content` | Rebuild the content bundle only if it is out of date |
| `npm run validate:content` | Question-quality gate. Run it before `sync-content` |
| `npm run content-studio` | Content Studio at `http://localhost:8787` (edits are drafts) |
| `npm run release:content` | Content status. `--publish`, `--list`, `--restore <ver>` |
| `npm run check:<name>` | Gates: `icons`, `theme-colors`, `tab-bar`, `feed`, `sfx`, `phone`, `tutorial` |
| `npm run test:<name>` | One `node --test` suite per area (75 of them, see `package.json`) |
| `npm run eas:preview:android` | Build a preview APK on EAS |

There is no umbrella test command. Run one suite directly with, for example, `node --no-warnings --test scripts/test-media-policy.mjs`.

**Before handing off:** `sync-content`, `typecheck`, `lint`, plus the checks and tests for what you touched (icons, theme colours, content, media, sfx).

## Content

`content/database/content.db` is the source of truth. Content Studio edits it as a draft, and a version exists only once you publish.

```text
Content Studio  →  validated, recorded in history  →  master content.db (a draft)
                                   ↓  Publish
 releases.json ledger · content/releases/<ver>.db.gz · snapshot/ · bundled assets/database/content.db
                                   ↓
        services/content-db.ts copies it into on-device storage when the version changes
```

1. Run `npm run content-studio` and edit. Saves are checked by the same rules as `validate:content`.
2. Publish from Studio or run `npm run release:content -- --publish --notes "…"`. Never edit the version constant or the ledger by hand.
3. Commit the content files together after a publish.

Backups run daily and before every publish, restore and migration script. Every source on a card, site or scan target must be marked verified before a version can be published. The full design is in [the content and Studio spec](docs/critical/CONTENT_SQLITE_AND_STUDIO_SPEC.md).

## Build an APK

```bash
npm run eas:preview:android                     # installable APK for testers
npx eas-cli build -p android --profile production   # Play Store bundle (AAB)
```

- A **preview** build may carry draft content. A **production** build fails unless the content is published (`check:content-published`).
- Run the gates above first. Signing keys (`credentials.json`, `*.jks`) are gitignored and never uploaded.
- Every build currently carries the same version numbers. [The versioning spec](docs/critical/VERSIONING_SPEC.md) proposes a fix: let EAS own the build number and show app version, build and content version in Settings.
- `./build-apk.sh` is an interactive helper that pushes `.env.local` secrets to EAS, if you have one.

## Documentation

Specs live in `docs/`, grouped by how much they matter. See [`docs/README.md`](docs/README.md).

| Folder | Start with |
| --- | --- |
| [`docs/critical/`](docs/critical) | [Versioning](docs/critical/VERSIONING_SPEC.md), [Play release checklist](docs/critical/PLAY_RELEASE_CHECKLIST.md), [Google Play launch](docs/critical/GOOGLE_PLAY_LAUNCH_SPEC.md), [Media policy](docs/critical/MEDIA_POLICY.md), [Legal framework](docs/critical/LEGAL_FRAMEWORK.md) |
| [`docs/features/`](docs/features) | [Phone](docs/features/PHONE_SPEC.md), [Feed](docs/features/NPC_FEED_SPEC.md), [Teachers](docs/features/NPC_TEACHERS_SPEC.md), [Tutorial](docs/features/TUTORIAL_SPEC.md), [Atom Maze](docs/features/PLATFORMER_SPEC.md), [Lessons](docs/features/LESSON_RESTRUCTURE_SPEC.md), [SFX](docs/features/SFX_SPEC.md) |
| [`docs/qa/`](docs/qa) | [Android UI/UX spec](docs/qa/ANDROID_RESPONSIVE_UI_UX_SPEC.md), [UAT checklist](docs/qa/ANDROID_UI_UX_UAT_CHECKLIST.md), [dark-mode matrix](docs/qa/DARK_MODE_SMOKE_MATRIX.md) |
| [`docs/completed/`](docs/completed) | Finished, reverted or superseded work |

`CLAUDE.md` is the working guide for contributors and coding agents: architecture, rules and the reasons behind them.

## Contributing

AtomIQ is a private project.

1. Keep a change next to the route or domain that owns it, and put logic in a framework-free `*-core.ts` with a `node --test` suite.
2. Use theme roles, shared components (`Card`, `Button`, `ModalDialog`, `Icon`) and `playSfx`, not one-off colours, modals or audio calls.
3. Run the gates before handing off. For Android UI changes, attach screenshots from the device class you tested.

## License

Private project. All rights reserved.

<div align="center">

<sub>Built for people who are not afraid to ask, “But why?”</sub>

</div>
