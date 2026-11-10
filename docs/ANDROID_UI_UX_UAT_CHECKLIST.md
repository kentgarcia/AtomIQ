# AtomIQ — Android UI/UX User Acceptance Checklist

**Status:** Draft for beta sign-off  
**Date:** 2026-11-09  
**Owner:** AtomIQ product/engineering  
**Source of truth:** [Android and Tablet Responsive UI/UX Specification](./ANDROID_RESPONSIVE_UI_UX_SPEC.md)  
**Scope:** Portrait Android phones and Android tablets; Expo SDK 58 / React Native 0.88 app

## 1. Purpose and acceptance rule

This checklist is the user-acceptance gate for Android UI/UX hardening. It verifies that the Android experience preserves the approved iPhone information hierarchy and interaction intent while correctly handling Android system UI, responsive layouts, accessibility settings, keyboard behavior, system back, and device variation.

Mark an item **Pass** only when the stated behavior is observed on the required device/build. Mark **Fail** when the behavior is missing, inconsistent, clipped, obscured, or requires a workaround. Use **N/A** only with a written reason.

The candidate is accepted only when:

- every P0/P1 issue is closed or formally waived by product and engineering;
- all required device classes and starred scenarios have been tested;
- all primary actions and final content items are reachable;
- there is no text clipping or unintended horizontal overflow at font scale 2.0;
- no fixed control obscures content, including in gesture and three-button navigation;
- back, keyboard, theme, sound, haptics, TTS, and external-link behavior are verified;
- the final pass uses a release-like Android build, not only Expo Go; and
- the acceptance record below is complete with links to evidence.

## 2. Test record

| Field | Value |
|---|---|
| Candidate/version | ______________________________ |
| Android build / artifact | ______________________________ |
| Test window | ______________________________ |
| QA owner | ______________________________ |
| Product reviewer | ______________________________ |
| Engineering reviewer | ______________________________ |
| Evidence folder / report | ______________________________ |
| Open P0/P1 defects | ______________________________ |

### Result legend

- **Pass** — expected behavior verified.
- **Fail** — defect found; add an entry to §11 before continuing.
- **Blocked** — could not test because of environment or build issue; explain why.
- **N/A** — genuinely not applicable; explain why.

## 3. Required test matrix

Record the actual device model, Android version, window size, navigation mode, display size, and font scale for every run. The examples below are minimum targets, not substitutes for recording actual values.

| ID | Device class | Minimum configuration | Required coverage |
|---|---|---|---|
| D1 | Android reference phone | Pixel 8/9 class; Android 14/15; gesture navigation; default display/font | Full checklist |
| D2 | OEM phone | Samsung A/S class; Android 14/15; gesture and 3-button navigation | Full checklist and keyboard/TTS pass |
| D3 | Compact/low-end phone | Moto G/Redmi class; Android 12/13; 3-button navigation | Core flows, short viewport, performance |
| D4 | Short viewport | Supported phone; large display size | Layout, keyboard, CTA reachability |
| D5 | Android tablet | 7–10 inch portrait; Android 14+; gesture navigation | Full layout and route pass |
| D6 | Accessibility pass | Any supported reference device | Font scale 1.3 and 2.0; display size Large; TalkBack spot-check |

At least one run must use a production-like APK/AAB installed outside Expo Go. Repeat critical items marked `*` on D1, D2, and D5; repeat the compact/short checks on D3/D4.

## 4. Preconditions and build hygiene

- [ ] **P0** Install the release-like candidate on a physical Android device. Record build/version and installation source.
- [ ] **P0** Confirm the app launches from a clean install without a crash, ANR, blank screen, or stuck splash screen.
- [ ] **P0** Run `npm run typecheck`; record the result: __________________.
- [ ] **P0** Run `npm run lint`; record the result or linked triage: __________________.
- [ ] **P1** Confirm the candidate contains the current bundled content database and no unexpected development UI.
- [ ] **P1** Confirm portrait lock does not produce a layout break when the device is rotated or used on a foldable.
- [ ] **P1** Confirm the app remains usable in airplane mode after the initial install.

## 5. Installation, onboarding, and app shell

### 5.1 Fresh install and onboarding

- [ ] **P0*** Fresh install → launch → onboarding appears exactly once and is not clipped by the status bar or display cutout.
- [ ] **P1*** Complete onboarding at `360 × 640 dp`; every input, progress indicator, and primary action is reachable.
- [ ] **P1*** Enter a long display name; text wraps or scrolls without overlap, corruption, or horizontal overflow.
- [ ] **P1*** Open the keyboard on each onboarding input; the focused input, helper text, progress, and submit action remain visible.
- [ ] **P1*** Complete onboarding without manually dismissing the keyboard.
- [ ] **P1*** Press Android back during onboarding; state is preserved and the user is not unexpectedly exited or advanced.
- [ ] **P1** Kill and cold relaunch after onboarding; the user lands in the expected app state without reseeding or a blank layout.

### 5.2 App shell and tabs

- [ ] **P1*** Home, Discovery, Guide, Games, and Profile tabs open from a clean launch and preserve the expected active state.
- [ ] **P1*** The tab bar is bounded and centered on tablets; it does not stretch across the full readable width.
- [ ] **P1*** Every tab has an accessible label, a visible selected/focused state beyond color, and a minimum `48 × 48 dp` hit area.
- [ ] **P1*** The active marker and icon remain centered; tapping adjacent tabs does not trigger the wrong route or duplicate sound.
- [ ] **P0*** The tab bar never covers the last list item, primary CTA, quiz answer row, profile control, or Android navigation area.
- [ ] **P1*** Guide chat hides the tab bar and removes its reserved space; returning to Guide landing restores it correctly.
- [ ] **P1** Navigate repeatedly between tabs and nested routes; no duplicate tab bars, accumulated bottom spacing, or stale overlays appear.

## 6. Responsive layout and system UI

### 6.1 Safe areas, edge-to-edge, and bottom controls

- [ ] **P0*** Headings, back/close buttons, progress indicators, inputs, and primary CTAs are clear of the status bar and display cutout.
- [ ] **P0*** Bottom content reserves the system inset plus any measured tab bar, CTA, sheet, composer, or answer-row height.
- [ ] **P0*** Repeat with gesture navigation and three-button navigation; no content moves under or behind the navigation area.
- [ ] **P1*** The tab-bar fade is treated as occluded space, not usable content space.
- [ ] **P1*** Fixed or absolute elements remain correct when text wraps and when font scale increases.
- [ ] **P1** System-bar icon contrast is readable in light, dark, and system themes.

### 6.2 Width, height, and scrolling

- [ ] **P1*** Compact widths use one column, compact gutters, and wrapped labels; no horizontal scrolling is needed for ordinary content.
- [ ] **P1*** Phone widths preserve the iPhone component order and information hierarchy.
- [ ] **P1*** Tablet widths center the main content, cap readable content at approximately `720 dp`, and do not stretch paragraphs edge-to-edge.
- [ ] **P1*** Grids add a second column only when each item remains at least `160 dp` wide and labels remain readable.
- [ ] **P0*** Short viewports remain scrollable and keep the primary CTA reachable; decorative space yields before readable text.
- [ ] **P1*** The final interactive element on every long screen is reachable with one natural scroll gesture.
- [ ] **P1** Returning from a detail route preserves scroll position where practical and does not reset the screen unexpectedly.
- [ ] **P1** Horizontal carousels show an affordance and do not capture vertical scrolling unexpectedly.

### 6.3 Touch targets and feedback

- [ ] **P1*** Icon-only controls, back/close buttons, tabs, quiz options, and game controls have a minimum `48 × 48 dp` hit area.
- [ ] **P1*** Adjacent controls can be tapped accurately without accidental activation of a neighbor.
- [ ] **P1** Press feedback is visible, Android-appropriate, and does not change layout dimensions or cause duplicate actions.

## 7. Typography, visual parity, and accessibility

- [ ] **P1*** SNPro is used on Android after cold start; there is no visible system-font flash in the main flows.
- [ ] **P1*** At default font scale, headings, body text, labels, buttons, tabs, quiz answers, and error messages are not clipped or unexpectedly ellipsized.
- [ ] **P0*** At font scale 2.0, the same text remains readable; buttons grow vertically or wrap instead of shrinking below a readable size.
- [ ] **P1*** XP, streak, score, timer, and progress values remain aligned when digit lengths change.
- [ ] **P1*** Light, dark, and system themes preserve readable contrast for text, borders, active markers, progress fills, cards, and raised controls.
- [ ] **P1*** Android elevation/shadows do not obscure text or make card boundaries ambiguous.
- [ ] **P1** Images, SVGs, and WebP assets remain within bounded containers; failed images preserve layout and have an accessible label.
- [ ] **P1*** TalkBack can identify and reach icon-only controls, tabs, primary CTAs, inputs, quiz options, and modal actions in a logical order.
- [ ] **P1** Display size Large does not introduce clipping or make primary actions unreachable.

## 8. Route and flow acceptance

Run each route in light and dark themes on D1 and D5 unless noted otherwise.

### 8.1 Home, Discovery, Profile, and Settings

- [ ] **P1*** Card order and content hierarchy match the approved iPhone baseline.
- [ ] **P1*** Discovery filters, feed items, bookmarks, and detail links are reachable and do not overflow on compact widths.
- [ ] **P1*** Profile editing keeps the focused input and save action visible above the keyboard and bottom controls.
- [ ] **P1*** Settings controls remain reachable; destructive actions are separated from normal settings and are not hidden beneath the tab bar.
- [ ] **P1** Delete-all-data confirmation is visible, dismissible, and does not accidentally delete data from a back tap.

### 8.2 Guide landing and chat

- [ ] **P1*** Guide landing preserves the iPhone dashboard hierarchy.
- [ ] **P1*** Chat header, mascot stage, speech bubble, options/cards area, and composer are all visible in the intended order.
- [ ] **P1*** Long speech-bubble text wraps naturally and does not push the composer off-screen on a short phone.
- [ ] **P1*** Option pills and content cards wrap or scroll inside their bounded region without widening the screen.
- [ ] **P0*** Opening the keyboard keeps the active input and composer visible; dismissing it removes temporary spacing.
- [ ] **P1** Undo, reset, dashboard, and close controls have 48 dp hit areas and predictable back behavior.

### 8.3 Lessons and quizzes

- [ ] **P0*** Complete a shortest and longest lesson; the primary action and final content are reachable above fixed controls.
- [ ] **P1*** Long lesson headings, body copy, callouts, and action labels wrap without clipping at font scale 2.0.
- [ ] **P0*** Complete a quiz with a long question, long answer, selected answer, results, and retry; no answer or CTA is obscured.
- [ ] **P1*** Progress, score, timer, and result values do not overlap content when values become longer.
- [ ] **P1*** Android back during an active lesson or quiz shows the approved exit confirmation before progress can be lost.
- [ ] **P1** Modal sheets and result dialogs fit short phones and tablets; every action is visible and tappable.

### 8.4 MythBuster, Lab, Games, and Atom Maze

- [ ] **P0*** Open MythBuster Quick Play, Challenge, and Endless; intro, active, exit-confirmation, and result states are usable.
- [ ] **P0*** Open Atom Maze; the game board remains bounded while instructions, controls, exit confirmation, and results remain reachable.
- [ ] **P1*** Dose Visualizer and Energy Showdown keep controls, values, instructions, and results readable at compact width and font scale 2.0.
- [ ] **P1*** Fixed playfields do not force surrounding instructions or controls off-screen.
- [ ] **P1** Back behavior is consistent across active games and does not double-pop or lose progress without confirmation.

### 8.5 Detail, article, encyclopedia, legal, and modal screens

- [ ] **P1*** Long titles, long body content, images, and external-link actions fit within a vertical scroll container.
- [ ] **P1*** Images use intentional contain/cover behavior and never expand the parent beyond the content frame.
- [ ] **P1*** Back and close controls remain in the same logical position across Android devices.
- [ ] **P1*** Modal content and inputs are not hidden by the keyboard, navigation bar, or screen edge.
- [ ] **P1** External-link failure shows a recoverable error when no browser is available.

## 9. Android interaction and feedback

### 9.1 System back

- [ ] **P0*** Nested detail route: back returns to the previous route.
- [ ] **P0*** Modal: back dismisses the modal before navigating away from its underlying route.
- [ ] **P0*** Active lesson, quiz, MythBuster, and maze: back shows the approved exit confirmation and does not silently lose progress.
- [ ] **P1*** Tab root: back follows the approved root-exit behavior and does not unexpectedly reset the app.
- [ ] **P0*** Repeated back taps do not double-pop, skip confirmation, or exit the app unexpectedly.

### 9.2 Keyboard

- [ ] **P0*** Gboard: focused input, helper text, submit action, and any required content remain visible after keyboard resize.
- [ ] **P1** Samsung Keyboard where available: repeat the same input and submit checks.
- [ ] **P1** SwiftKey where available: repeat the same input and submit checks.
- [ ] **P1*** Autocorrect suggestions, long names, and one-handed keyboard mode do not corrupt layout or state.
- [ ] **P1*** The tab bar is hidden or accounted for when it would obstruct an input.
- [ ] **P1*** Dismissing the keyboard removes its spacer and restores the original content position.

### 9.3 Sound, haptics, and TTS

- [ ] **P1*** Sound toggle gates UI and game feedback on every tested route; rapid taps do not produce duplicate or accumulating sounds.
- [ ] **P1*** Haptics toggle gates both Expo haptics and vibration feedback; disabled or missing device vibration never blocks an action.
- [ ] **P1*** TTS works with the default Android engine and returns to idle after completion.
- [ ] **P1*** TTS voice data unavailable/no engine: the UI shows a recoverable message and never remains stuck in a speaking/loading state.
- [ ] **P1*** Navigate away during speech; speech stops and does not continue over the next screen.
- [ ] **P1** Bluetooth/headset disconnect or rapid route changes do not crash or leave audio playing unexpectedly.

## 10. Resilience and soak checks

- [ ] **P1** Fresh install with airplane mode enabled: bundled lessons, quizzes, games, Guide, and encyclopedia remain usable.
- [ ] **P1** No-browser case: article, encyclopedia, and settings external links fail gracefully and leave the user in a usable state.
- [ ] **P1** Low-storage or constrained-device run: launch and core navigation remain usable; record any environment limitation.
- [ ] **P1** Upgrade install over an existing version: local progress, theme, settings, and content database remain consistent.
- [ ] **P1*** Navigate through core routes for 30 minutes; no accumulating blank space, stuck loading state, duplicate tab bar, audio leak, crash, or ANR appears.
- [ ] **P0** Review device logs and release/pre-launch results; no unexplained crash or ANR remains.

## 11. Defect and evidence record

Every failed or blocked item must have a corresponding record. Attach a screenshot or recording for visual/layout defects.

| ID | Checklist item | Severity | Device/build | Route/state | Expected | Actual | Evidence | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
|  |  | P0 / P1 / P2 |  |  |  |  |  |  |  |
|  |  | P0 / P1 / P2 |  |  |  |  |  |  |  |
|  |  | P0 / P1 / P2 |  |  |  |  |  |  |  |

For screenshot comparison, capture the same logical state on the approved iPhone baseline, D1 Android reference phone, D2 Samsung phone, and D5 tablet. Record content order, wrapping, spacing rhythm, card bounds, CTA position, safe-area handling, and contrast. Android-native shadow softness, elevation falloff, font rasterization, and ripple appearance are acceptable only when they do not alter layout, hierarchy, or readability.

## 12. Final sign-off

### Gate summary

| Gate | Result | Evidence / notes |
|---|---|---|
| Build hygiene and release-like install | Pass / Fail / Blocked |  |
| Required device matrix | Pass / Fail / Blocked |  |
| App shell, safe areas, and bottom occlusion | Pass / Fail / Blocked |  |
| Responsive layout and tablet behavior | Pass / Fail / Blocked |  |
| Typography, themes, touch targets, and accessibility | Pass / Fail / Blocked |  |
| Route and flow acceptance | Pass / Fail / Blocked |  |
| Back and keyboard behavior | Pass / Fail / Blocked |  |
| Sound, haptics, TTS, and external links | Pass / Fail / Blocked |  |
| Resilience, soak, crash, and ANR review | Pass / Fail / Blocked |  |
| Screenshot parity review | Pass / Fail / Blocked |  |

### Acceptance decision

- [ ] **Accepted for Android beta / wider testing**
- [ ] **Accepted with documented P2 follow-ups**
- [ ] **Not accepted — remediation and re-test required**

| Role | Name | Decision | Date | Signature / link |
|---|---|---|---|---|
| QA owner |  |  |  |  |
| Product owner |  |  |  |  |
| Engineering owner |  |  |  |  |

