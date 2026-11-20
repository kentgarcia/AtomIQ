# AtomIQ — Light/Dark Mode Compliance Specification

**Status:** Draft for implementation  
**Date:** 2026-11-11  
**Owner:** AtomIQ engineering  
**Applies to:** Every AtomIQ screen, modal, overlay, component state, and system-bar surface

## 1. Goal

Every screen must follow the active AtomIQ color scheme completely. Switching between light and dark mode must update all visible surfaces and states without requiring navigation, app restart, or a second render-triggering interaction.

“Follow the theme” means more than changing the page background. The active mode must be reflected in backgrounds, cards, text, borders, dividers, controls, icon colors, inputs, selected/disabled/error states, overlays, shadows, gradients, system bars, and every modal or empty/loading/result state.

No screen may contain a leftover light-only card, dark-only text, unreadable border, or hardcoded neutral that contradicts the active mode.

## 2. Current theme contract

The canonical theme state is provided by `ThemeProvider` and consumed through `useTheme()` from `theme/useTheme.ts`. Shared semantic colors and feature palettes are defined in `theme/tokens.ts` and `theme/themes.ts`. Theme-dependent styles should be created with `createStyles(theme)` and memoized from the resolved theme.

The following are mandatory sources of truth:

- `theme/tokens.ts` for base values and shared design tokens;
- `theme/themes.ts` for resolved light/dark semantic colors and feature palettes;
- `useTheme()` for `theme`, `colorScheme`, `isDark`, and theme actions;
- `StatusBar` and the Expo Router navigation theme for system/navigation chrome.

Color values (neutral light/dark scale and the orange accent) are specified in [`NEUTRAL_THEME_ORANGE_ACCENT_SPEC.md`](../completed/NEUTRAL_THEME_ORANGE_ACCENT_SPEC.md); this spec governs behavior and coverage.

Legacy color helpers may remain temporarily for compatibility, but new screen code must not introduce another color system or a screen-local copy of the theme palette.

## 3. Known leakage risks to audit first

The repository already contains several patterns that can leave light-mode residue or bypass the canonical theme. These are audit targets, not an exhaustive defect list:

| Area | Risk |
|---|---|
| `theme/themes.ts` | `myth`, `achievement`, and `lab` palettes contain mode-independent surfaces/text; each must be converted to mode-aware values or explicitly approved as a documented visual exception. |
| Onboarding palette | Some background, card, and text values are fixed light colors even though other onboarding values branch by mode. |
| Guide components | `components/guide/ProfileProgressCard.tsx` and `components/guide/Pill.tsx` contain fixed white, cream, gray, and dark text values. |
| Community and games | `components/community/hub-styles.ts`, `components/games/HowToPlayCard.tsx`, and `components/games/StackCard.tsx` mix theme-aware branches with fixed light surfaces. |
| Maze and utility UI | `components/atom-maze/styles.ts`, `components/ui/fast-alphabet.tsx`, `components/markdown-text.tsx`, and the legacy `ThemedText` link style contain hardcoded colors that require contrast review in both modes. |
| Controls and feedback | Ripple colors, modal scrims, pressed states, disabled states, gradients, and inline icon colors can remain light-only even when the surrounding card changes. |

The implementation must inspect all `app/`, `components/`, `theme/`, `hooks/`, and shared service-provided UI data for the same pattern.

## 4. Screen coverage

The compliance pass covers every route and every meaningful state, including:

- Home, Discovery/Community, Guide/Chat, Games/Awards, Profile, Leaderboard;
- onboarding and avatar/profile editing;
- lessons, lesson preview, Lab steps, standalone Lab mini-games, quizzes, MythBuster, and Streak;
- Explorer, journeys, journey nodes, encyclopedia, encyclopedia entries, Atom Maze, and article detail;
- Settings, privacy policy, terms of service, achievement detail, modal routes, loading states, empty states, error states, and confirmation/delete dialogs;
- the custom tab bar, headers, bottom actions, keyboard-aware sheets, alerts, and overlays.

The bottom navigation PNG artwork may retain its own artwork treatment, but the tab-bar container, gradient, active marker, borders, shadows, labels, and surrounding surfaces must follow the active theme.

## 5. Functional requirements

### 5.1 Live theme switching

- Toggling light/dark mode while a screen is mounted updates that screen immediately.
- The current route, scroll position, modal state, selected item, form contents, lesson progress, and game state are preserved across the toggle.
- Returning to a previously visited route does not restore stale colors from the previous mode.
- Persisted user choice overrides the OS scheme; system mode remains correct on a cold start and after the OS scheme changes when no override is saved.
- Theme changes do not produce a flash of the wrong surface longer than the normal render transition and never leave a permanent mixed-mode screen.

### 5.2 Surface and content roles

Every visible color must have a documented role. At minimum, each screen must define mode-aware values for:

- page background and safe-area fill;
- primary/secondary/raised surfaces and nested cards;
- primary, secondary, muted, disabled, link, and inverse text;
- borders, dividers, input outlines, focus rings, and selected markers;
- primary buttons, secondary buttons, pressed states, disabled states, and destructive actions;
- icons in default, selected, disabled, success, warning, and error states;
- loading indicators, empty states, error callouts, result cards, and progress indicators;
- overlays, modal scrims, shadows, gradients, and system-bar contrast.

Brand/accent colors may remain recognizable across modes, but their foreground/background pairing must be adjusted where needed for contrast. Pure white or black is allowed only when it is an intentional inverse/on-color role, not as a shortcut for a surface or body-text color.

### 5.3 Style construction

- Any style containing a color must be derived from the active `theme`, a theme-aware palette, or an explicitly approved invariant token.
- Theme-dependent style factories must be recomputed when `theme.mode` or the relevant palette changes.
- Do not create module-level `StyleSheet.create` objects containing screen surfaces, body text, borders, shadows, or state colors.
- Do not copy a light/dark object into each component when the same role belongs in `theme/themes.ts`.
- Do not infer dark mode by comparing arbitrary color strings. Use `isDark` or `theme.mode`.
- Do not use `#FFFFFF`, `#000000`, `#333333`, `#F7F7F7`, or similar neutral literals for UI surfaces/text unless the line is annotated as an approved inverse, art, or brand treatment.
- `withAlpha()` must be applied to a mode-aware base color; alpha applied to a light-only literal is still a theme leak.

### 5.4 Navigation and system chrome

- Expo Router navigation uses the matching light/dark navigation theme.
- Status-bar icon style remains readable against every route background, including modal and edge-to-edge screens.
- Android navigation/gesture-area treatment remains readable in both modes.
- The custom tab bar and its fade/marker use mode-aware colors even when tab PNG artwork is unchanged.

## 6. Theme audit and implementation workflow

1. Inventory every color literal and every `isDark`/`theme` branch in `app/`, `components/`, and shared UI utilities.
2. Classify each value as semantic, feature accent, invariant brand/art, or defect.
3. Move semantic values into `theme/tokens.ts`/`theme/themes.ts`; keep feature palettes mode-aware.
4. Replace screen-local light/dark copies with the resolved theme or a small named palette derived from it.
5. Make all style factories and inline color expressions react to the resolved theme.
6. Test the route matrix below in both modes, including secondary states and overlays.
7. Repeat the scan and visual pass after fixes; no new unapproved fixed neutral may remain.

## 7. Required automated checks

Add a repository check, for example `scripts/check-theme-colors.mjs`, and run it in CI and release validation. A recommended package command is:

```json
"check:theme-colors": "node scripts/check-theme-colors.mjs"
```

The check must:

- scan source files for hardcoded color literals in UI code;
- flag module-level color-bearing styles and static palettes outside the theme system;
- flag `isDark` branches that define duplicated full palettes outside `theme/themes.ts`;
- allow a small reviewed list of invariant brand colors, artwork colors, and inverse/on-primary colors;
- validate that every screen-level style factory receives the active theme or an approved mode-aware palette;
- report file and line number for each violation;
- fail CI for new unapproved violations.

Static scanning is not sufficient by itself. It must be paired with runtime tests that prove the active colors change when the theme changes.

## 8. Required tests

### Unit/component tests

- `themes.light` and `themes.dark` provide values for every required semantic role.
- Theme-dependent style factories return different surface/text/border values for light and dark mode where the role is expected to change.
- Toggling the theme rerenders a mounted component and updates its resolved colors.
- No screen component retains a module-level light-only `StyleSheet` for theme-dependent colors.
- Modal, overlay, disabled, error, success, selected, pressed, and loading states resolve readable colors in both modes.

### Route smoke matrix

For every route in §5, run the following sequence:

1. Open the route in light mode and record the initial, scrolled, empty, loading, error, selected, and modal states that apply.
2. Toggle to dark mode without leaving the route.
3. Repeat the same states and confirm every visible surface changed or intentionally remained invariant.
4. Toggle back to light mode and confirm the original light treatment is restored.
5. Navigate away and back, then repeat a spot-check for stale styles.

Repeat on a release-like Android build and an iOS build, on a compact phone, standard phone, and tablet. Include large font/display-size settings where text wrapping can expose low-contrast or hidden content.

### Visual acceptance checklist

- [ ] No white card or light input remains on a dark page unless explicitly approved.
- [ ] No dark text, gray text, divider, or icon becomes unreadable on a dark surface.
- [ ] No dark card or dark text remains on a light-only state where it breaks hierarchy or contrast.
- [ ] All primary and secondary controls retain their intended contrast and pressed/disabled feedback.
- [ ] All modals, scrims, sheets, alerts, snackbars, and keyboards states match the active mode.
- [ ] All lesson, Lab, quiz, MythBuster, maze, Explorer, Guide, profile, and settings states pass in both modes.
- [ ] Status-bar and navigation-area icons remain readable.
- [ ] No stale colors appear after toggling, returning to a route, or reopening a modal.

## 9. Acceptance criteria

The dark-mode compliance work is accepted only when:

- every route and state in scope follows the active light/dark mode;
- live toggling works without navigation or restart and preserves state;
- `check:theme-colors` passes with no new unapproved violations;
- every fixed-color exception is documented with its reason, owner, and visual test;
- body text and important controls meet the project’s approved contrast target in both modes;
- system bars, tab-bar chrome, dialogs, overlays, gradients, and shadows have been reviewed;
- typecheck, lint, automated theme tests, and route smoke evidence are complete;
- no reported leftover light-mode or dark-mode UI remains open.

Any mixed-mode screen, unreadable primary content, stale theme after toggle, or mode-dependent screen that only corrects after navigation is a release-blocking P0/P1 defect.

## 10. Deliverables

- Mode-aware token/palette updates in `theme/`.
- Refactored screen/component styles with no unapproved light-only leftovers.
- `check:theme-colors` CI/release gate.
- Automated tests for live switching and representative component states.
- Light/dark route screenshots or recordings for the full smoke matrix.
- A short exception register for intentional invariant artwork or brand treatments.

