# AtomIQ — UI Icon Integrity Specification

**Status:** Implemented (`check:icons`, `test:icons`)  
**Date:** 2026-11-11  
**Owner:** AtomIQ engineering  
**Applies to:** Iconsax-backed UI icons rendered through `components/ui/icon.tsx`, lesson content, lab experiences, and non-tab-bar UI

## 1. Goal

AtomIQ must never show a blank, broken, or silently missing icon in the UI. Every icon name used by application code or bundled content must resolve to a valid installed icon, and an invalid name must still produce a visible, safe fallback while the defect is reported.

This includes the icons shown in lesson Lab steps, standalone Lab mini-games, lesson headers and result states, navigation controls, cards, pills, dialogs, settings, games, Explorer, Guide, profile, and other UI surfaces.

This specification explicitly excludes the bottom navigation PNG icons. Those assets are governed by the tab-bar asset checklist and are not part of the Iconsax/name-resolution gate defined here.

## 2. Current baseline

The shared icon wrapper is `components/ui/icon.tsx`. It accepts a string, applies a small alias map, looks up the corresponding export from `iconsax-react-native`, logs a warning when the export is absent, and currently returns `null`. Returning `null` creates an invisible control or an empty card slot, which is the failure this spec prevents.

The initial repository audit found these known missing names:

| Source | Missing names | Required disposition |
|---|---|---|
| Lesson Lab content in `assets/database/content.db` / `lesson_steps.data.options[].icon` | `Mountain`, `Gas`, `Temperature`, `Equal` | Replace with valid Iconsax names or add approved aliases; update the bundled database and source content together. |
| Standalone Lab screen `app/lab/index.tsx` | `Beaker`, `Bulb`, `TimeCircle` | Replace with valid Iconsax names or add approved aliases. |

These are starting defects, not an allowlist. The validation must discover any future missing names automatically.

## 3. Scope of validation

The icon-integrity check must cover all of the following:

1. Literal `<Icon name="..." />` usages in `app/`, `components/`, and shared services that provide icon names.
2. Alias keys and their mapped Iconsax exports in `components/ui/icon.tsx`.
3. Dynamic names supplied by bundled or generated data, including:
   - lesson Lab options (`lesson_steps` rows with `step_type = 'lab'`);
   - lesson/unit metadata and lesson renderer data;
   - Guide topics, pills, and cards;
   - missions, game cards, profile cards, Explorer, encyclopedia, and other data-driven UI.
4. Every rendered UI variant used by the app: `Linear`, `Outline`, `TwoTone`, `Bulk`, `Broken`, and `Bold` where applicable.
5. Release-like Android and iOS smoke flows, including empty/error/result states that are not necessarily visible on the default happy path.

Out of scope:

- Bottom navigation PNG icons and their image files.
- Decorative lesson illustrations, mascot artwork, photos, and other non-icon images.
- Icons rendered by an external web page opened outside the app.

## 4. Functional requirements

### 4.1 Single resolver

`Icon` must use one exported resolver/registry for all name lookup. The resolver must:

- apply aliases before lookup;
- distinguish a valid name from an invalid name without relying on React rendering side effects;
- expose the resolved name for tests and diagnostics;
- preserve the current `size`, `color`, `variant`, and `style` behavior;
- provide a stable fallback icon for an invalid name instead of returning `null`.

The fallback must be a known, installed icon such as `InfoCircle`. It must preserve the requested size, color, variant, and style so the layout remains intact. The fallback is a safety net, not permission to ship invalid content.

### 4.2 Diagnostics

When a missing name is encountered, development and test builds must report:

- requested name;
- resolved/aliased name, if different;
- source context when available, such as lesson id, step id, option id, or screen;
- whether the fallback was rendered.

The same invalid name must be de-duplicated so a repeated list does not flood logs. Production builds may reduce log verbosity, but they must still render the fallback and expose an observable error signal to the app's diagnostics path.

### 4.3 Content contract

Icon-bearing content must use a validated icon-name contract. For lesson Lab options:

- `icon` may be omitted only when the component has an intentional, documented default;
- when present, `icon` must be a valid canonical name or approved alias;
- a missing or invalid icon must not prevent the option label, touch target, selection state, or result state from rendering;
- content validation must identify the exact lesson, step, option id, and icon name.

Content changes and the generated/bundled SQLite database must be validated together. A source content fix is incomplete if `assets/database/content.db` still contains the old invalid value.

## 5. Required automated checks

Add a repository check, for example `scripts/check-icons`, and run it in CI and before release. It must fail with a non-zero exit code when it finds any invalid icon name.

The check must:

1. Read the installed Iconsax export surface from the dependency used by the app.
2. Read the alias map from the shared icon module, or move the map into a testable registry module.
3. Scan static icon names without treating dynamic expressions as validated literals.
4. Load the bundled content database and validate all icon-bearing JSON fields, especially every lesson Lab option.
5. Report file/database location and data identity for each failure.
6. Exit successfully only when every discovered name resolves to an installed export.

Recommended package command:

```json
"check:icons": "node scripts/check-icons.mjs"
```

The check should run before `lint`/release acceptance or as a required CI job. It must not inspect or fail on the excluded bottom-nav PNG assets.

## 6. Required tests and smoke coverage

### Unit tests

- Every alias resolves to an installed Iconsax export.
- Every valid canonical name resolves to a component.
- An invalid name returns the visible fallback and emits one diagnostic record.
- `size`, `color`, `variant`, and `style` are passed to both canonical and fallback icons.
- An empty optional icon follows the documented default behavior.

### Data tests

- Load all lessons from the bundled database.
- Visit every Lab step and validate every option icon.
- Validate all other data-driven icon collections used by Guide, missions, games, units, Explorer, profile, and lesson summaries.
- Include a regression fixture with an intentionally invalid icon and assert that the check fails.

### UI smoke pass

On a release-like build, verify that no icon slot is blank or replaced by an unexpected text glyph in:

- all 18 current lesson Lab steps, including every option, selected state, correct state, and incorrect state;
- standalone Lab: Radiation Shield, Build an Atom, and Radioactive Decay flows, including result, hint, challenge, and error states;
- lesson preview, renderer, assessment, debrief, MythBuster, and MicroLearn;
- home, Guide, Games, Profile, Explorer, encyclopedia, quizzes, settings, community, onboarding, legal pages, and modal states;
- light and dark themes;
- compact phone, standard phone, and tablet widths;
- Android and iOS release-like builds.

For each flow, verify both visual presence and interaction behavior. A fallback icon that is visible but has caused a control to lose its accessibility label, hit target, alignment, or state meaning is still a failure.

## 7. Acceptance criteria

The icon-integrity work is accepted only when:

- `check:icons` passes against the repository source and bundled database;
- the seven known baseline defects are resolved or explicitly approved as aliases with tests;
- no `<Icon>` path can silently return `null` for an invalid name;
- all current lesson Lab options render an icon in idle, selected, correct, and incorrect states;
- all standalone Lab icon states render in both themes;
- invalid-name diagnostics include enough context to fix the source without reproducing the screen manually;
- static checks, data tests, lint, and typecheck pass;
- the release-like Android smoke pass records zero broken/missing non-tab-bar UI icons.

Any unresolved icon warning, blank icon slot, clipped icon, or incorrect fallback in a primary control is a release-blocking P0/P1 defect.

## 8. Implementation notes

Prefer fixing the name at its source and adding a deliberate alias only when the product name is intentionally different from the installed Iconsax export. Do not hide the problem by mapping many unrelated names to one generic icon. Keep the canonical registry small, reviewed, and covered by tests so future content authors receive an immediate validation failure when they introduce a typo or an icon from a different library.

