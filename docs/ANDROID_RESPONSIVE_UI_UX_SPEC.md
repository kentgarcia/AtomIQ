# AtomIQ — Android and Tablet Responsive UI/UX Specification

**Status:** Draft for beta hardening  
**Date:** 2026-11-07  
**Owner:** AtomIQ product/engineering  
**Applies to:** Expo SDK 58 / React Native 0.88 / Expo Router 58 app  
**Primary problem:** The current UI has been validated in Expo Go on iPhone, but Android beta testers are reporting layout and UI/UX problems. This specification defines the behavior required for Android phones and Android tablets.

## 1. Goal

The iPhone experience is the visual reference for hierarchy, tone, content, and interaction intent. Android and tablet builds must preserve that experience while adapting to:

- edge-to-edge status and navigation bars;
- Android gesture and three-button navigation;
- different display sizes and aspect ratios;
- Android font metrics and font scaling;
- hardware/system back behavior;
- Android keyboard resizing;
- OEM differences in shadows, elevation, cutouts, and touch feedback.

“Perfectly reflect” means **visual and behavioral equivalence**, not identical pixel coordinates. Android-native differences are acceptable only when the same hierarchy, content, affordance, readability, and usable space are preserved.

## 2. Current baseline and constraints

The following are part of the current app baseline and must be treated as inputs to implementation:

- `app.json` keeps portrait orientation; SDK 58 always draws edge-to-edge (the removed `edgeToEdgeEnabled` flag is no longer needed).
- The custom tab bar in `app/(tabs)/_layout.tsx` is absolutely positioned and uses `useSafeAreaInsets()`.
- The app uses a custom SNPro font family loaded before the root layout renders.
- `softwareKeyboardLayoutMode` is `resize` on Android.
- The app has lessons, quizzes, MythBuster, Lab, Explorer/Atom Maze, Guide, Discovery, Games, Profile, Settings, onboarding, and detail screens.
- The existing design tokens live in `theme/tokens.ts` and feature themes live in `theme/themes.ts`.
- Existing iPhone screenshots are the baseline source for visual comparison; they are not proof that Android layout is correct.

The app remains portrait-only for this scope. Landscape tablet support is out of scope until orientation is intentionally enabled.

## 3. Responsive model

Use `useWindowDimensions()` and safe-area insets. Do not branch on device model, brand, or a hardcoded list of phone names.

### 3.1 Width classes

| Class | Window width | Required behavior |
|---|---:|---|
| Compact | `< 360 dp` | Single column; compact horizontal padding; wrap labels before shrinking text; no horizontal overflow. |
| Phone | `360–599 dp` | Match the iPhone information hierarchy and one-column flow. Use the same component order and token scale. |
| Tablet | `≥ 600 dp` | Keep phone hierarchy, center the main content, cap readable content width at `720 dp`, and use available width for intentional grids only. Do not stretch cards or paragraphs edge-to-edge. |

### 3.2 Height classes

| Class | Window height | Required behavior |
|---|---:|---|
| Short | `≤ 720 dp` | Scrollable content; no fixed-height screen may hide the primary CTA. Reduce decorative whitespace before reducing readable text. |
| Standard | `721–839 dp` | Default layout. |
| Tall | `≥ 840 dp` | Preserve the same content order; extra space may remain as breathing room but must not move primary actions unpredictably. |

### 3.3 Content frame

Every screen must define a content frame with:

```ts
const horizontalGutter = width >= 600 ? 24 : width < 360 ? 16 : 20;
const contentMaxWidth = width >= 600 ? 720 : width;
```

The exact values may be routed through `theme/tokens.ts`, but the rules are mandatory:

- content is never clipped by the left/right safe area;
- tablet content is centered when the viewport exceeds the readable max width;
- cards use the available content frame, not the entire tablet width;
- text blocks use a readable measure; long paragraphs must not become full-width tablet lines;
- no screen may require horizontal scrolling for ordinary text, buttons, or navigation.

## 4. Global layout contract

### 4.1 Safe areas and edge-to-edge

All full-screen routes must use a shared safe-area strategy based on `react-native-safe-area-context`.

- Top content begins at `insets.top` unless it is intentionally drawn behind the status bar.
- Bottom content reserves `insets.bottom` plus the height of any persistent bottom control.
- System bars must not cover headings, close/back buttons, input fields, progress indicators, or primary CTAs.
- Do not use a fixed `paddingTop: 24` or `paddingBottom: 24` as a substitute for insets.
- Re-check punch-hole/cutout devices and Samsung display cutout settings.
- Status-bar icon contrast must pass in both light and dark themes.

### 4.2 Bottom navigation and bottom actions

The floating custom tab bar is a known occlusion risk because it is rendered above screen content.

- Screens with the tab bar visible must reserve bottom space based on the measured tab-bar height, `insets.bottom`, and the bar’s visual gap from the viewport edge.
- Screens with a bottom CTA, bottom sheet, chat composer, or quiz answer row must reserve their own measured height in addition to the system inset.
- The tab bar must not cover the last list item, lesson action, quiz answer, or profile control.
- The fade behind the tab bar must not be treated as usable content space.
- On Android three-button navigation, validate the larger bottom inset separately from gesture navigation.
- On Guide chat mode, hiding the tab bar must remove its reserved space so the chat composer does not float unnecessarily high.

### 4.3 Scroll behavior

Every screen containing more content than the available viewport must scroll vertically.

- Use `contentContainerStyle` bottom padding that accounts for safe areas and fixed controls.
- The final interactive element must be reachable with one natural scroll gesture.
- Avoid nesting vertical `ScrollView`s unless the inner scroll region has a clear, persistent height.
- Horizontal carousels must have visible affordance and must not capture vertical gestures unexpectedly.
- Preserve scroll position when returning from a detail route where practical.

### 4.4 Fixed dimensions and absolute positioning

Fixed dimensions are allowed for icons, avatars, illustration bounds, game boards, and touch targets. They are not allowed for ordinary text containers or full-screen sections.

Any absolute element must document:

1. its containing coordinate space;
2. the safe-area behavior;
3. the minimum and maximum viewport sizes it supports;
4. what happens when text wraps or font scale increases.

Decorative elements may overlap. Interactive elements may not overlap one another or become obscured by a system bar.

## 5. Visual parity requirements

### 5.1 Typography

- Use the bundled SNPro family on Android; do not silently fall back to the system font.
- Every text style must have a line height that supports the intended font size and wrapping.
- Text must remain readable at Android font scale `1.0`, `1.3`, and `2.0`.
- No heading, label, button title, tab label, quiz option, or error message may be clipped, ellipsized unexpectedly, or overlap an icon.
- If a label cannot fit, wrap it or use the approved short label; do not reduce below the minimum readable size to force one line.
- Numerical values such as XP, streak, score, and progress must remain aligned when digits change.
- Use the same semantic text roles and tokens on iOS and Android. Platform-specific values require a documented reason and screenshot evidence.

### 5.2 Color, borders, and shadows

- Use semantic theme colors and the existing token system; do not add one-off Android colors to compensate for screenshots.
- Android elevation and iOS shadow properties render differently. Every raised card, 3D button, modal, and tab-bar treatment must be reviewed on Android at 1x and dark mode.
- A shadow may not reduce text contrast or make card boundaries ambiguous.
- Borders, button lips, active markers, and progress fills must remain visible against both light and dark surfaces.

### 5.3 Images, SVG, and illustrations

- All images must use a defined aspect ratio or a bounded container.
- `contain` is the default for mascots, icons, and illustrations; `cover` is allowed only for intentional crops.
- No image may expand a parent beyond the content frame.
- Verify PNG, WebP, and SVG assets in a release Android build, not only Expo Go.
- If an image fails to load, preserve layout with a bounded placeholder and accessible label.

### 5.4 Touch targets and feedback

- Every actionable control has a minimum `48 × 48 dp` touch area, including icon-only controls, tab buttons, back buttons, close buttons, and game controls.
- Visual icons may be smaller than 48 dp if the hit area remains 48 dp.
- Adjacent controls must have enough separation to prevent accidental activation.
- Press feedback must be visible but must not change layout dimensions.
- Android back, system gestures, and touch interactions must not trigger duplicate navigation or duplicate sounds.

## 6. Screen-specific requirements

### 6.1 App shell and tab routes

Routes: Home, Discovery, Guide, Games, Profile.

- The custom tab bar stays visually consistent across Android phones and tablets.
- On tablets, it remains a floating control with a bounded readable width rather than stretching edge-to-edge.
- Each tab has an accessible label and a visible focused state that does not rely only on color.
- The active marker and icon remain centered within the 48 dp hit target.
- The tab bar never covers scrollable content or the Android navigation area.
- Guide chat mode hides the tab bar and restores it when returning to the Guide landing screen.

### 6.2 Home, Discovery, Profile, and Settings

- Preserve the iPhone card order and content hierarchy.
- On tablet, center the page and cap the primary column at `720 dp`.
- Existing two-column or grid content may use a second column only when each item remains at least `160 dp` wide and labels do not clip.
- Profile editing and settings forms must remain reachable above the keyboard and bottom controls.
- Destructive actions must remain visually separated from normal settings and must not be hidden beneath the tab bar.

### 6.3 Guide landing and chat

- Guide landing keeps the same dashboard hierarchy as iPhone.
- Chat mode is an immersive screen with a safe-area-aware header, mascot stage, speech bubble, options/cards area, and input/composer area.
- The speech bubble must wrap naturally and never push the composer off-screen on short Android phones.
- The mascot may scale down on compact or short screens; text and controls take priority over illustration size.
- Option pills and content cards must wrap or scroll within their bounded region; they must not widen the screen.
- When the keyboard opens, the active input remains visible and the composer is not hidden behind the keyboard.
- Undo, reset, and dashboard controls retain their 48 dp hit areas.

### 6.4 Onboarding

- Each onboarding step must be usable at `360 × 640 dp` before keyboard display.
- Name/profile inputs must scroll into view when the Android keyboard opens.
- Progress indicators and primary actions must remain visible after keyboard resize.
- Long names, autocorrect suggestions, and Android back must not corrupt the step state.
- A user can complete onboarding without needing to dismiss the keyboard manually.

### 6.5 Lessons, quizzes, MythBuster, Lab, and Explorer

- The primary action is always reachable without being covered by the tab bar, keyboard, or system navigation bar.
- Question/answer content must remain readable at 2.0 font scale; answer buttons may grow vertically.
- Progress, score, and timer elements must not overlap content when values become longer.
- Game boards and fixed playfields may retain bounded dimensions, but surrounding instructions, controls, and results must be responsive.
- A lesson or active game must define Android back behavior: continue, show an exit confirmation, or save progress before leaving.
- Modal sheets and result dialogs must fit short phones and tablets without clipped buttons.

### 6.6 Detail, article, encyclopedia, legal, and modal screens

- Detail pages use a vertical scroll container with safe-area-aware top and bottom padding.
- Article images and long titles must not force horizontal overflow.
- Back and close controls remain in the same logical location across Android devices.
- Modal content must not be hidden by the keyboard or navigation bar.
- External-link actions must show a recoverable error state if no browser is available.

## 7. Android interaction parity

### 7.1 System back policy

Implement and test one global policy:

- On a nested detail route, back returns to the previous route.
- On an active lesson, quiz, MythBuster, or maze, back shows the approved exit confirmation before losing progress.
- On a modal, back dismisses the modal first.
- On a tab root, back follows the product decision for root exit behavior; it must not unexpectedly reset the app.
- Back must not double-pop because of both a screen handler and the router.

### 7.2 Keyboard

Validate with Gboard, Samsung Keyboard, and SwiftKey where available.

- Input screens use the configured resize behavior and a scrollable content container.
- The focused input, helper text, and submit action remain visible.
- The floating tab bar is hidden or accounted for when it would obstruct an input.
- Keyboard dismissal does not leave a permanent blank spacer.

### 7.3 Sound, haptics, and TTS

These are UX parity requirements because Android feedback differs from iOS:

- Sound and haptic toggles must gate every feedback path, including global press feedback and game feedback.
- Missing or disabled Android haptics must not block the action.
- TTS failure must return the UI to an idle state and show a recoverable message; no speaking/loading state may remain stuck.
- Navigating away stops active speech and does not leave audio playing over the next screen.

## 8. Required implementation patterns

The implementation should converge on shared primitives rather than screen-by-screen fixes.

### 8.1 Shared primitives

Create or standardize these primitives as part of the hardening work:

- `ScreenFrame`: safe-area-aware page frame with width class and content max width.
- `BottomOcclusionView` or equivalent: reserves space for measured bottom controls.
- `ResponsiveContainer`: applies horizontal gutters and tablet max width.
- `ResponsiveGrid`: switches column count only when item minimum width is satisfied.
- `PressableIconButton`: 48 dp hit target with accessible label and consistent feedback.
- `AndroidBackBoundary`: documents whether a route pops, confirms, or dismisses.

Names are implementation suggestions; the behavior is required.

### 8.2 Rules for screen code

- Prefer flexbox, `useWindowDimensions()`, and measured layout over magic coordinates.
- Keep styles in theme tokens or feature style files; do not add repeated device-specific literals.
- Use `onLayout` for controls whose height affects content padding.
- Do not solve wrapping issues by globally shrinking font sizes.
- Do not use `Platform.OS === "android"` for layout unless the Android native behavior is the cause and the difference is documented.

## 9. Visual QA device matrix

The minimum matrix for every beta candidate is:

| Device class | Example target | OS | Navigation | Font/display |
|---|---|---|---|---|
| Android reference phone | Pixel 8/9 class | Android 14/15 | Gesture | Default |
| OEM phone | Samsung A/S class | Android 14/15 | Gesture and 3-button | Default |
| Compact/low-end phone | Moto G/Redmi class | Android 12/13 | 3-button | Default |
| Short viewport phone | Any supported device | Supported OS | Gesture | Large display size |
| Android tablet | 7–10 inch, portrait | Android 14+ | Gesture | Default |
| Accessibility pass | Any reference phone | Supported OS | Gesture | Font scale 1.3 and 2.0 |

At least one pass must use a production-like Android build installed outside Expo Go. Expo Go is acceptable for rapid iteration but is not the final parity gate.

## 10. Test scenarios

Run these scenarios on every matrix class where marked `*`:

- Fresh install → onboarding completion → cold relaunch `*`.
- Home, Discovery, Guide landing, Guide chat, Games, Profile, Settings `*`.
- Full lesson with the shortest and longest available content `*`.
- Quiz with long question, long answer, selected answer, results, and retry `*`.
- MythBuster and Atom Maze intro, active state, exit confirmation, and result state `*`.
- Detail pages with long title, long body, image, and external link `*`.
- Light theme, dark theme, and system theme `*`.
- Gesture navigation and three-button navigation `*`.
- Keyboard open with Gboard; repeat with Samsung Keyboard where available `*`.
- Font scale 1.3 and 2.0; display size Large.
- Android back on nested route, modal, active game, and tab root `*`.
- Device with a display cutout/punch hole.
- Airplane mode and no-browser fallback for external links.
- TTS available, TTS voice data unavailable, and interrupted speech.
- Sound/haptics enabled and disabled.
- 30-minute navigation/content soak with no accumulating blank space, duplicated tab bars, or stuck loading states.

## 11. Screenshot comparison protocol

For each release candidate:

1. Capture the approved iPhone reference at the same logical state.
2. Capture the Android reference phone at the same logical state.
3. Capture one Samsung phone and one tablet for layout behavior.
4. Compare content order, wrapping, spacing rhythm, card bounds, CTA position, safe-area handling, and contrast.
5. Record device, OS, window size, font scale, theme, navigation mode, route, and issue severity with every discrepancy.

Acceptable differences:

- native shadow softness or elevation falloff;
- a few pixels of font rasterization or baseline variation;
- Android-native ripple/press feedback when it does not alter layout.

Unacceptable differences:

- clipped or overlapped text;
- a CTA hidden behind a system bar, tab bar, keyboard, or modal edge;
- content that requires unintended horizontal scrolling;
- different route/back behavior;
- unreadable contrast or missing focus/selected state;
- a tablet layout stretched so far that the hierarchy or readability changes.

## 12. Acceptance criteria

The Android/tablet hardening work is complete when all of the following are true:

- No P0 or P1 layout defects remain on the required matrix.
- All routes listed in §6 pass at least one Android phone and the tablet pass.
- All primary CTAs and final list items are reachable without changing system settings.
- No text clipping or horizontal overflow occurs at font scale 2.0 on the reference phone.
- No fixed bottom element obscures content in either gesture or three-button navigation.
- Back behavior is defined and verified for every nested, modal, and active-flow route.
- Light/dark/system themes retain contrast and hierarchy.
- The app remains usable on a short viewport and at least one tablet width.
- Screenshot review confirms visual equivalence to the approved iPhone baseline.
- `npm run typecheck` and `npm run lint` pass, or every remaining warning is documented and unrelated to this scope.
- The final pass is performed on a release-like Android build, not only Expo Go.

## 13. Defect severity and reporting

### P0 — release blocker

Crash, ANR, data loss, inaccessible primary flow, or content/CTA hidden by system UI on a supported device.

### P1 — beta blocker

Clipped text, broken wrapping, horizontal overflow, unusable keyboard/back behavior, tab-bar occlusion, or a major screen hierarchy difference on a common phone/tablet.

### P2 — polish

Shadow/elevation mismatch, small spacing drift, minor icon alignment, or non-blocking Android-native visual difference.

Every defect must include:

- route and exact state;
- device, OS, window dimensions, navigation mode, font scale, and theme;
- screenshot or recording;
- expected behavior from the iPhone baseline/spec;
- actual behavior;
- severity and proposed owner.

## 14. Suggested execution order

1. Establish iPhone reference screenshots and a small Android/tablet baseline run.
2. Fix shared safe-area, content-frame, bottom-occlusion, typography, and touch-target primitives.
3. Fix app shell, onboarding, keyboard, and back behavior.
4. Fix lesson/quiz/game flows and their bottom actions.
5. Fix tablet max-width and grid behavior.
6. Run the complete device matrix and screenshot comparison protocol.
7. Re-run release checks on the production-like Android build.

## 15. Definition of done for beta sign-off

The beta is ready for wider Android testing only after the team can answer “yes” to all of these:

- Does the app keep the same information hierarchy as the approved iPhone flow?
- Can a user reach every primary action on a compact phone, common phone, and tablet?
- Are status bars, navigation bars, keyboard, tab bar, and modals accounted for?
- Does Android back behave predictably everywhere?
- Are typography, wrapping, contrast, and touch targets still correct with accessibility settings increased?
- Have the fixes been verified in a release-like Android build on physical devices?

