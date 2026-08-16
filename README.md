# AtomIQ

Nuclear science learning app for curious minds. AtomIQ turns complex nuclear physics, radiation safety, and clean-energy topics into an interactive, gamified learning journey — all running locally on device with a built-in AI study partner.

Built with **Expo (React Native) + TypeScript**, with content stored in a local SQLite database and an optional **Supabase + Gemini** edge function powering the AI chat.

## Features

- **Learning Path** — Take units of lessons and quizzes. Every module awards XP, stars, and level progress. Lessons mix briefing slides, micro-learning cards, hands-on lab prompts, myth-busting rounds, and assessments.
- **MythBuster Game** — Test your instincts in three modes: **Quick Play**, **Challenge** (timed), and **Endless** survival. Earn XP multipliers and bust nuclear myths with science-backed verdicts.
- **AI Study Partner (Schrödi)** — Ask any nuclear question, get cited, science-backed answers, and suggested follow-ups. Chat history is persisted and moderated locally. Requires Supabase + Gemini (see [AI chat setup](#ai-chat-setup)).
- **Discovery Hub** — Browse a digestible feed of facts and stories, category-filtered, with bookmarks stored on device.
- **Explorer** — Go deeper with guided **journeys** (e.g. nuclear safety, radiation reality), a searchable **encyclopedia**, and the **Atom Maze** mini-game.
- **Lab** — Interactive experiments: the **Dose Visualizer** compares everyday radiation sources, and **Energy Showdown** weighs nuclear vs. fossil fuels on safety and emissions.
- **Daily Puzzles** — A new **daily fact**, **daily missions** with claimable rewards, and **streak tracking** keep learning consistent.
- **Progress & Rewards** — XP, levels, achievements/awards, personal best game scores, and a leaderboard.
- **Profile & Settings** — Customize your avatar and display name, pick light/dark/system themes, toggle sound effects and haptics, or delete all local data.
- **Onboarding** — A guided, mascot-powered first-run experience before entering the app.

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| Language | TypeScript (strict) |
| Routing | expo-router v6 (file-based) |
| Local storage | expo-sqlite (content + app database), AsyncStorage |
| Animation | react-native-reanimated v4, react-native-gesture-handler |
| Graphics | react-native-svg, expo-linear-gradient, expo-image |
| Media | expo-speech (TTS), expo-haptics, expo-av (SFX), expo-clipboard |
| AI chat | Supabase Edge Functions + Google Gemini |
| UI kit | Custom design-system components under `components/ui` with a themed autumn light/dark palette |

## Project Structure

```
app/                  expo-router routes (tabs, stack screens, sim/game screens)
    (tabs)/           Home, Discovery Hub, AI Chat, Games, Profile
    explorer/         Journeys, encyclopedia, atom maze
    lesson/           Lesson renderer + flow views
    mythbuster/       MythBuster game
    lab/              Dose Visualizer, Energy Showdown
components/           Lesson views, games, community, UI kit, markdown renderer
content/              Educational content sources (lessons, quizzes, myths, facts,
                      articles, explorer journeys) — seeded into SQLite
hooks/                Shared React hooks
services/             SQLite database layer, storage context, missions, AI chat,
                      SFX, profiles, explorer storage, chat history
supabase/             Deployable Supabase Edge Functions (Gemini chat)
scripts/              Content tooling (editor + SQLite migration/seed generators)
theme/                Design tokens, palettes, ThemeProvider, useTheme
```

## Getting Started

Prerequisites: Node.js 18+ and npm.

```bash
# Install dependencies
npm install

# Start the Expo dev server
npx expo start
```

Then press `w` for web, `a` for Android, or `i` for iOS. Run a specific platform:

```bash
npm run android   # expo start --android
npm run ios       # expo start --ios
npm run web       # expo start --web
```

The app works fully offline — lessons, quizzes, games, and encyclopedia all read from the bundled SQLite database. Only the AI chat requires network access.

## AI Chat Setup

The AI chat is the only network feature. It calls a Supabase Edge Function (`supabase/functions/gemini-chat`) that proxies to the Google Gemini API through a pool of API keys.

1. **Environment variables** — provide these to the app (via `.env.local`, EAS secrets, or `eas.json` build env):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
2. **Deploy the Edge Function**:
   ```bash
   cd supabase/functions/gemini-chat
   supabase functions deploy gemini-chat
   ```
3. **Add Gemini keys** — insert rows into the `gemini_api_keys` table (`is_active = true`). The function rotates through keys, applies cooldowns on rate limits/failures, and auto-deactivates repeatedly failing keys.

## Building an APK

Use EAS to build Android APKs from the committed profiles (`development`, `preview`, `production`):

```bash
npm run eas:preview:android   # expo run eas-cli preview profile
# or
./build-apk.sh                # interactive: pushes env secrets, then builds
npx eas build --platform android --profile preview
```

Environment secrets are pushed to EAS with `eas secret:push --scope project --env-file .env.local --force`.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the Expo dev server |
| `npm run lint` | Run ESLint (expo config) |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run content-editor` | Launch the content editor |
| `npm run reset-project` | Scaffold a fresh Expo starter app (dev tool) |

## Content Pipeline

Educational content lives in `content/` as typed TypeScript modules, which are converted and seeded into the app's SQLite database:

- `scripts/content-editor.js` — interactive editor for lessons, quizzes, myths, and facts.
- `scripts/content-migration/` — converts TypeScript content to JSON and seeds SQLite (`ts-to-json.js`, `seed-sqlite.js`, `schema.sql`).
- `services/content-db.ts` — the runtime SQLite content repository used by the app.

## License

Private project.