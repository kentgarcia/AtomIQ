# AtomIQ — Android UI/UX UAT Result

**Status:** Code hardening complete; device acceptance **not yet possible**  
**Date:** 2026-11-10  
**Candidate:** local `master` (UAT hardening commit on top of `8df51ec`), plus the uncommitted beta-feedback working tree  
**Checklist:** [ANDROID_UI_UX_UAT_CHECKLIST.md](./ANDROID_UI_UX_UAT_CHECKLIST.md)  
**Specification:** [ANDROID_RESPONSIVE_UI_UX_SPEC.md](./ANDROID_RESPONSIVE_UI_UX_SPEC.md)

> This record separates what can be verified in the repository from what requires a
> release-like Android build and physical devices. A **Static pass** below means the
> required code path, layout rule, or guard exists and was reviewed/compiled. It is
> **not** a substitute for the device observation the checklist requires.

## 1. Environment

| Field | Value |
|---|---|
| Host | Linux development container |
| App | Expo SDK 58 / React Native 0.88 |
| Android runtime available | No emulator, no physical device, no release APK/AAB |
| Evidence available | Source review, TypeScript, ESLint, Expo Doctor, Expo exports |

## 2. What was implemented in this pass

### Layout primitives and app shell

- `theme/layout.ts` is the single responsive source of truth:
  - width classes: Compact `<360`, Phone `360–599`, Tablet `≥600`;
  - height classes: Short `≤720`, Standard `721–839`, Tall `≥840`;
  - gutters `16 / 20 / 24`, tablet readable cap `720`, grid item minimum `160`;
  - `useResponsiveLayout()` exposes window size, insets, gutter, content width,
    content frame, and tab-bar reservation.
- `components/layout/tab-bar-inset.tsx` measures the real floating tab bar and
  exposes `useTabBarInset()` / `useBottomInset()` so screens reserve the exact
  occluded space instead of guessing.
- `components/layout/pressable-icon-button.tsx` provides a guaranteed `48 × 48 dp`
  icon-button primitive.
- The tab bar is bounded (`maxWidth: 520`) and centered, uses a measured height,
  has `accessibilityRole="tab"`, labels, selected state, and a `48 dp` minimum.
- Guide chat hides the bar and its reserved space; returning restores it.

### Screen coverage

Responsive frames, safe-area handling, and tab-bar insets were applied to:

- onboarding, settings, legal pages, article/achievement detail;
- Home, Discovery, Guide, Games, Profile, Leaderboard;
- explorer index / journey / journey node / encyclopedia;
- encyclopedia, streak, labs, lesson, quiz, MythBuster, and Atom Maze.

### UAT-specific fixes

- Removed single/two-line truncation from primary titles, names, lesson/fact
  titles, quiz/myth statements, card titles, and award labels so font-scale growth
  wraps instead of clipping.
- Added `hitSlop` and/or accessibility labels to small icon controls: community
  search clear/category chips, encyclopedia/explorer filters, settings modal
  close buttons, leaderboard back, lesson speaker/read-aloud controls, home
  info/fact/jump/beta controls, profile level/flip/close/clear/avatar controls,
  lab steppers, PickAGame close, LessonPreview close, onboarding name clear and
  avatar options, Guide pills, and lesson back buttons.
- Wrapped the settings delete-account modal and profile edit modal in
  `KeyboardAvoidingView` (`height` on Android).
- Made lesson debrief and quiz results scrollable so the final CTA stays reachable
  on short viewports.
- Added TTS unmount cleanup to the quiz screen (lesson, MythBuster, and
  encyclopedia already stopped speech on exit).
- Added recoverable alerts when an external link cannot be opened in
  `article-detail.tsx`, `markdown-text.tsx`, explorer encyclopedia entries, and
  Home references.
- Added `fontVariant: ["tabular-nums"]` to XP, score, timer, streak, progress,
  and stat values so changing digit widths do not shift layout.
- Confirmed every `Modal` has `onRequestClose`; confirmed `app.json` locks
  `orientation: "portrait"` and uses `softwareKeyboardLayoutMode: "resize"`.
- Back behavior: the global `useAndroidBackPolicy` handles tab roots (double-tap
  exit) and lesson/quiz/MythBuster exit confirmations; each of those screens also
  owns a `BackHandler` so the confirmation appears before progress is lost.
  Atom Maze keeps its own handler. Modals dismiss before navigation.

## 3. Local verification results

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | **Pass** — no errors |
| ESLint | `npm run lint` | **Pass** — `0 errors`, `50 warnings` (all pre-existing hook-dependency warnings; no new errors) |
| Expo Doctor | `npx expo-doctor@latest` | **Pass** — `20/20` checks |
| Web export | `npx expo export --platform web` | **Pass** |
| Android Hermes bundle | `npx expo export --platform android` | **Pass** |
| iOS Hermes bundle | `npx expo export --platform ios` | **Pass** |
| Final tree re-run | all three exports after the last edit | **Pass** (`web:0`, `android:0`, `ios:0`) |
| Modal back handling | source audit | **Pass** — all `Modal`s define `onRequestClose` |
| Portrait / keyboard config | `app.json` | **Pass** — `orientation: "portrait"`, `softwareKeyboardLayoutMode: "resize"` |

These checks prove the code compiles, bundles, and follows the intended layout
contract. They do **not** prove runtime behavior on Android.

## 4. Checklist disposition

| Checklist area | Local disposition | Evidence / reason |
|---|---|---|
| §4 Preconditions — typecheck, lint, bundled content | **Static pass** | Commands above; content DB is bundled by `scripts/sync-content.js` |
| §4 Preconditions — release-like install, clean launch, airplane mode | **Blocked** | No APK/AAB or device |
| §5.1 Onboarding — safe area, keyboard, long name, back, cold relaunch | **Static pass** | Safe-area insets, `KeyboardAvoidingView`, step-preserving `BackHandler`; runtime blocked |
| §5.2 App shell / tabs — bounded centered bar, labels, selected state, 48 dp, no occlusion | **Static pass** | `app/(tabs)/_layout.tsx`, `tab-bar-inset.tsx`; runtime blocked |
| §6.1 Safe areas / edge-to-edge / bottom controls | **Static pass** | `useSafeAreaInsets` + `useBottomInset` + measured tab bar; runtime blocked |
| §6.2 Width, height, scrolling, tablet cap, grid rule | **Static pass** | `theme/layout.ts`, `ResponsiveGrid`, Discovery gallery `getColumnCount`; runtime blocked |
| §6.3 Touch targets and press feedback | **Static pass** | 48 dp primitive, `hitSlop` audit, accessibility labels; device accuracy blocked |
| §7 Typography — SNPro, no clipping, tabular numbers, themes | **Static pass** | `useSnPro`, truncation removal, tabular numbers, theme palettes; **font scale 2.0 runtime blocked** |
| §7 Accessibility — TalkBack order and reachability | **Blocked** | Requires TalkBack on device |
| §8 Route and flow acceptance | **Static pass** | Responsive frames and scroll containers applied to all listed routes; visual/device pass blocked |
| §9.1 System back — nested, modal, active session, root, repeated taps | **Static pass** | Global policy + per-screen handlers; runtime blocked |
| §9.2 Keyboard — Gboard / Samsung / SwiftKey | **Blocked** | Requires physical keyboards/devices |
| §9.3 Sound, haptics, TTS, external links | **Static pass** | Gates in `ui-sfx`/`game-sfx`/`haptics`, guarded `speech.ts`, cleanup on exit, link-failure alerts; runtime blocked |
| §10 Resilience and 30-minute soak | **Blocked** | Requires device and time-boxed run |
| §10 Crash/ANR review | **Blocked** | Requires device logs / Play pre-launch |
| §11 Screenshot parity | **Blocked** | Requires iPhone baseline and Android devices side by side |
| §12 Final sign-off | **Blocked** | Device matrix and evidence are mandatory |

## 5. P0/P1 status

- No code-level P0/P1 defect was identified in this pass.
- No P0/P1 defect can be **closed** without device evidence. The gate remains open
  until the device matrix is executed.
- Known residual risks to verify first on device:
  1. Font scale `2.0` on the MythBuster swipe/result card, whose card has a fixed
     height by design. Text now wraps, but the card may still need a scroll
     affordance on very short screens.
  2. `services/ui-sfx.ts` still patches `Pressable.defaultProps` (inert under
     React 19). `PressableIconButton` calls the SFX helper explicitly, but some
     plain `Pressable` controls may not produce UI click sound. Verify the sound
     toggle on each route.
  3. `app/settings.tsx` contains responsive/UAT fixes but also depends on the
     untracked beta-feedback files. It is therefore **not included** in the UAT
     hardening commit; build from the working tree or commit the beta feature
     before producing a release candidate.
  4. Many typography styles set an explicit `lineHeight`. Verify at font scale
     `2.0` that Android scales line height with font size and that no vertical
     clipping appears in headings, cards, tabs, or quiz answers.
  5. The tablet layout is capped and centered in code, but real tablet window
     behavior (split screen, foldable posture, rotation) is unverified.

## 6. Required work to close the gate

1. Produce a release-like APK/AAB (not Expo Go) and install it on physical devices.
2. Run matrix D1–D6 from the checklist and record model, Android version, window
   size, navigation mode, display size, and font scale for every run.
3. Repeat starred items on D1, D2, and D5; repeat compact/short checks on D3/D4.
4. Capture the screenshot parity set (iPhone baseline, D1, D2, D5).
5. Log every failure in §11 of the checklist with severity, route/state, expected,
   actual, and evidence.
6. Run the 30-minute soak and review crash/ANR logs.
7. Re-run this record with actual Pass/Fail/Blocked results and complete §12
   sign-off.

## 7. Acceptance decision

**Not accepted yet.** The code-verifiable portion is ready for device UAT, but the
checklist's mandatory release build, physical-device matrix, font-scale 2.0 pass,
TalkBack pass, keyboard pass, screenshot parity, and soak/crash review have not
been performed in this environment.
