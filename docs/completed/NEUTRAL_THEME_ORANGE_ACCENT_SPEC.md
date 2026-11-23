# AtomIQ — Neutral Light/Dark Backgrounds with Orange Accent Specification

**Status:** Implemented 2026-11-16 (steps 1–6 of section 7; step 7 docs updated)
**Date:** 2026-11-16
**Owner:** AtomIQ engineering
**Applies to:** `theme/tokens.ts`, `theme/themes.ts`, and every screen/component that consumes warm, cream, gradient, or indigo roles
**Extends:** `DARK_MODE_COMPLIANCE_SPEC.md`, `THEME_EXCEPTION_REGISTER.md`

## 1. Goal

Make AtomIQ look like Duolingo, with orange where Duolingo uses green.

- **Backgrounds are plain light and plain dark.** No yellow header, cream wash, warm gradient, or navy tint behind content.
- **Orange is an accent only.** It marks the things the learner can act on or that show progress: primary buttons, active tab, selected state, progress fills, links, streak and XP highlights.
- **Surfaces are flat and bordered.** Cards are solid fills with a 2px border. Controls have a chunky bottom "lip". Nothing depends on soft shadows or gradients for structure.

If a surface is not interactive and does not represent progress, it must not be orange.

## 2. Current state (what changes)

| Area | Today | Problem |
|---|---|---|
| Light background | `#FFFFFF`, with `pageGradientTop` `#FFF3E0` fading to white (`colors.warm.light`) | Pages are tinted cream at the top |
| Dark background | `#172B4D` navy (`colors.base.dark`) with surfaces `#213356` / `#26365A` | Reads as blue, not as a normal dark mode |
| Header / chips | Yellow `#FFCA5F` header and `#FFE0B2` chips (`colors.warm`) | A large warm surface competes with the accent |
| Primary role | `semantic.primary` is **indigo** `#5E72E4`; orange is only reached through `accents.orange`, `link`, and feature palettes | Two competing brand colors; "primary" is not the accent |
| Surface helpers | `creamTint` / `creamBorder` used for icon wells, stat tiles, chips | Cream surfaces on every screen |
| Feature palettes | Lesson, quiz, article, explorer, myth, achievements already use orange; maze (amber), lab (neon), map (green) and onboarding use their own backgrounds | Backgrounds differ per feature |

Measured footprint (hits across `app/`, `components/`, `hooks/`, `services/`, `theme/`): `colors.pageGradient*` 31 hits in 13 files, `colors.primary` 25 hits in 9 files, `colors.link` 18 hits in 6 files, `creamTint` about 12 hits in 8 files, `LinearGradient` 89 hits in 23 files. Most work is retargeting existing roles, not rewriting screens.

## 3. Design principles

1. **Neutral first.** Page, card, input, and sheet colors come only from the neutral scale in section 4.
2. **One accent.** Orange is the only brand color. Indigo stops being a brand color (see 5.3).
3. **Feedback colors keep their meaning.** Green is correct/success, red is wrong/destructive, blue is info, gold is rewards. None of them is the brand accent.
4. **Tactile controls.** Buttons and selectable cards sit on a 4px bottom border darker than the face and compress on press (translate down 4px, lip to 0).
5. **Contrast before beauty.** Every pairing in section 4 passes the repo contrast gate (`npm run test:contrast`).

## 4. Color specification

All values live in `theme/tokens.ts`. Components never reference them directly.

### 4.1 Neutral scale

| Role (`SemanticColors`) | Light | Dark |
|---|---|---|
| `background` | `#FFFFFF` | `#131F24` |
| `surface` / `card` | `#FFFFFF` | `#1F2C33` |
| `surfaceRaised` (sheets, modals, nested cards) | `#FFFFFF` | `#27363E` |
| `surfaceSoft` (quiet panels, icon wells, stat tiles) | `#F7F7F7` | `#1A262C` |
| `input` | `#F7F7F7` | `#1A262C` |
| `border` | `#E5E5E5` | `#3C4D57` |
| `borderStrong` | `#CFCFCF` | `#4A5A64` |
| `borderSubtle` | `#F0F0F0` | `#2A383F` |
| `text` | `#3C3C3C` | `#F1F7FB` |
| `textSecondary` | `#5C5C5C` | `#C5D2DA` |
| `textMuted` | `#737373` | `#8FA3AD` |
| `textFaint` | `#9A9A9A` | `#667985` |
| `disabled` / `disabledText` | `#E5E5E5` / `#AFAFAF` | `#2A383F` / `#667985` |
| `inverseSurface` / `inverseText` | `#3C3C3C` / `#FFFFFF` | `#F1F7FB` / `#131F24` |
| `overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.65)` |

Neutral rules:

- Pure `#FFFFFF` is the light page background and card fill. `#FFFFFF` is never used as light-mode body text.
- Light surfaces are separated by the 2px border, not by shadow. Dark surfaces are separated by a lighter fill plus the same border.
- No neutral may carry a hue other than the slight cool tint in the dark values above.

Measured contrast: `text` on light background 11.0:1; `textMuted` `#737373` on white 4.7:1; dark `text` on dark background 15.6:1; dark `textMuted` on dark background 6.4:1 and on dark surface 5.5:1.

### 4.2 Orange accent

| Role | Light | Dark | Use |
|---|---|---|---|
| `primary` (face) | `#EA580C` | `#EA580C` | Button fill, progress fill, selected fill |
| `primaryDark` (lip) | `#C2410C` | `#C2410C` | 4px bottom border of buttons, pressed fill |
| `primaryLight` (tint text/icon) | `#C2410C` | `#FB923C` | Orange text, links, icons on a neutral background |
| `primarySurface` (new) | `#FFF1E8` | `#3A2A20` | Selected card fill, active chip, soft highlight (opaque so contrast is testable) |
| `primaryBorder` (new) | `#EA580C` | `#FB923C` | Selected card/chip outline |
| `onPrimary` | `#FFFFFF` | `#FFFFFF` | Label/icon on the orange face |
| `link` | `#C2410C` | `#FB923C` | Text links |
| `ring` | `#FB923C` | `#FB923C` | Focus ring |

Why two orange tints: white on the `#EA580C` face is 3.56:1, which passes the 3:1 bar for large or bold text and UI components. Orange *text* on a white page must reach 4.5:1, so it uses `#C2410C` (5.18:1). On the dark background `#FB923C` reaches 7.4:1, so it is used for text and icons there.

Rules:

- Button labels on the orange face are bold (700+) and at least 16px. Smaller or regular-weight text on the face fails the gate.
- `#FFB300`-family amber (`brand.amber`) is no longer an accent. It is reserved for gold rewards (XP, stars) through `gold`.
- Orange is not used for body text, card fills, page backgrounds, headers, or decorative gradients.

### 4.3 Feedback roles (unchanged meaning, retuned for the neutral surfaces)

| Role | Face | Lip | Soft fill (light / dark) |
|---|---|---|---|
| `success` | `#58CC02` | `#46A302` | `rgba(88,204,2,0.12)` / `rgba(88,204,2,0.18)` |
| `error` / `danger` | `#EF4444` | `#DC2626` | `rgba(239,68,68,0.10)` / `rgba(239,68,68,0.18)` |
| `info` | `#1CB0F6` | `#1899D6` | `rgba(28,176,246,0.10)` / `rgba(28,176,246,0.18)` |
| `warning` | `#FFC107` | `#FFA000` | `rgba(255,193,7,0.14)` / `rgba(255,193,7,0.20)` |
| `gold` | `#FFC700` | `#E5A800` | n/a |

Open decision: the app's current success green is `#2ECC71`. Using `#58CC02` makes correct/incorrect read as strongly as Duolingo. Keep `#2ECC71` if retuning existing content screenshots is out of scope.

## 5. Role changes in `theme/`

### 5.1 `tokens.ts`

- Replace `base.light` and `base.dark` with the values in 4.1.
- Replace `warm.light` and `warm.dark` so every key resolves to a neutral: `header` → `surface`, `headerText` → `text`, `chipBorder` → `border`, `chipActive` → `primarySurface`, `cream` / `creamStrong` → `surfaceSoft` / `borderSubtle`, `gradientTop` and `gradientBottom` → `background`. This keeps all current call sites compiling while they are migrated (see section 7).
- Add `brand.orange.surface` and `brand.orange.border` as in 4.2. Leave the indigo scale in the file for the AI Guide avatar artwork only (see 5.3).

### 5.2 `themes.ts`

- `semantic()`: set `primary`, `primaryDark`, `primaryLight`, `secondary`, `accent`, `tint`, `icon`, `tabIconSelected`, `ring`, `link` to the orange roles in 4.2. `secondary` becomes the neutral `textMuted`, not a second brand color. `icon` is a neutral (`#5C5C5C` / `#C5D2DA`): default icons are not accent-colored.
- Add `primarySurface` and `primaryBorder` to `SemanticColors`.
- `pageGradientTop` and `pageGradientBottom` both resolve to `background`. Keep the keys until the gradient call sites are removed.
- `creamTint` / `creamBorder` / `amber*` roles resolve to `surfaceSoft` / `borderSubtle` / neutral. They are deprecated aliases (section 7).
- `tab`, `library`, `entry` palettes: `primary` moves from indigo to orange. `purple` in `entry` keeps its meaning (encyclopedia category) and is not an accent.
- `tabBar.active` stays orange; `tabBar.bg` is the neutral `background`.
- `lesson`, `quiz`, `article`, `explorer`, `settings`, `achievements`, `onboarding`, `myth`: backgrounds already come from `base[mode]`; confirm none override `bg`. `myth.error` and `maze.*` hardcodes (`#E74C3C`, `#FFFFFF`, `#0F172A`) move to the neutral and feedback roles.
- `maze`, `mazeGame`: background and card use the neutral scale. Player/monster/wall artwork colors stay game-specific and remain registered in `THEME_EXCEPTION_REGISTER.md`.
- `lab`: background and card use the neutral scale. Neon colors remain only on the mini-game artwork and glows.
- `map`: the grass terrain is artwork and stays; its card and text follow the neutral scale.

### 5.3 Indigo retirement

Indigo currently supplies `primary`, `icon`, `ring`, and the `tab`/`library`/`entry` primaries. After this change no screen chrome, button, tab, link, or chip uses indigo. The only permitted indigo use is the Guide (Shrodi) character artwork. Register it as a theme exception.

## 6. Component specification

Shared control anatomy (all values from `theme/tokens.ts`; add `controlLip: 4` and `controlBorder: 2`):

| Component | Rest | Pressed | Disabled |
|---|---|---|---|
| **Primary button** | `primary` face, `primaryDark` 4px bottom border, `onPrimary` label, radius `lg` (16) | translateY 4, bottom border 0 | `disabled` fill, `disabledText` label, no lip |
| **Secondary button** | `surface` face, `border` 2px, 4px `borderStrong` bottom, `primaryLight` label | translateY 4, bottom border 0 | as primary |
| **Destructive button** | `error` face, `dangerDark` lip | as primary | as primary |
| **Selectable card / answer option** | `surface`, `border` 2px, 4px bottom | selected: `primarySurface` fill, `primaryBorder` outline, `primaryLight` text. Correct: `success` soft fill + border. Wrong: `error` soft fill + border | n/a |
| **Chip / filter** | `surface`, `border` | selected: `primarySurface` fill, `primaryBorder` | n/a |
| **Progress bar** | track `surfaceSoft` (light) / `border` (dark); fill `primary` with a 4px lighter highlight | n/a | n/a |
| **Tab bar** | neutral `background`, top `border`; active icon/label `primary` (`primaryLight` text in light), inactive `textMuted` | n/a | n/a |
| **Header / page title** | no fill; `text` title, back button is a secondary icon button | n/a | n/a |
| **Input** | `input` fill, `border` 2px; focused `primaryBorder` | n/a | `disabled` |
| **Modal / sheet** | `surfaceRaised`, `border`, scrim `overlay` | n/a | n/a |
| **Switch** | track `border` off / `primary` on; thumb `#FFFFFF` | n/a | n/a |

Screen-specific direction:

- **Home / Profile / Guide headers:** remove the yellow header fill and warm gradient. The header is a plain row on `background`. Streak and XP chips keep their meaning with orange/gold fills on `surface` with a border.
- **Streak:** the streak flame and counter use `primary`. The day-dots use `primary` when complete and `surfaceSoft` otherwise.
- **Lesson / Quiz / MythBuster:** keep orange for the Continue/Check button and the progress bar. Result states use `success` / `error` roles, never orange.
- **Encyclopedia, Explorer, Articles:** icon wells use `surfaceSoft`, not cream.
- **Onboarding:** plain `background`; the primary button is orange; illustrations may stay colorful.
- **Gradients:** `LinearGradient` is removed from page and header backgrounds. It remains allowed for artwork, medals, and the XP/streak celebration effects. Each remaining use is reviewed in the audit (section 7, step 3).

## 7. Migration plan

Ordered so the app builds and looks coherent after every step.

1. **Tokens first.** Change `base`, `warm`, `brand.orange`, and the semantic assembly per section 5. With `warm` mapped to neutrals, most warm/cream/gradient screens flatten without editing the screens. Run `typecheck` and spot-check Home, Lesson, Quiz, Settings in both modes.
2. **Primary swap.** Point `primary` and friends at orange. Fix the nine files that read `colors.primary` and the six that read `colors.link`. Confirm no component relies on `primary` being indigo (for example, an orange button on an orange screen would now blend).
3. **Gradient and cream audit.** Remove page-background `LinearGradient` and `pageGradient*` usage in the 13 listed files, then replace `creamTint` / `creamBorder` with `surfaceSoft` / `borderSubtle` at each call site. Delete the deprecated aliases once no consumer remains.
4. **Shared controls.** Update `page-header.tsx`, `pressable-icon-button.tsx`, the tab bar, `beta-notice-modal.tsx`, and the guide `Pill` so the lip, border, and selected states match section 6. Build or extend one shared button and one shared selectable-card component so screens stop re-implementing them.
5. **Feature palettes.** Normalize maze, lab, onboarding, myth, and achievement backgrounds to the neutral scale, as in 5.2.
6. **Guard the rules.** Extend `scripts/check-theme-colors.mjs` to fail on `pageGradient*` in screens and `creamTint`, `creamBorder`, or amber/indigo roles once the aliases are gone. Add a unit test that every primary/surface/text pairing in sections 4.1–4.3 meets its contrast target (extend `scripts/test-option-contrast.mjs` or `theme/contrast.ts`).
7. **Docs.** Update `THEME_EXCEPTION_REGISTER.md` for indigo Guide artwork and any retained gradients. Update `DARK_MODE_COMPLIANCE_SPEC.md` section 2 to point at this spec for the color values.

## 8. Acceptance criteria

1. In both modes, every route's page background is exactly `background`; there is no cream, yellow, or navy region behind content.
2. The only orange surfaces are primary buttons, progress fills, selected states, the active tab, streak/XP highlights, and links. A screen capture with orange removed shows a fully neutral UI.
3. No `indigo` or `amber` brand color appears outside registered artwork exceptions.
4. Primary, secondary, and destructive buttons share one anatomy, with a 4px lip, compress on press, and flat fills with no drop shadow.
5. All text and control pairings meet WCAG AA: 4.5:1 for body text, 3:1 for large or bold text and UI components. `npm run test:contrast` passes.
6. Switching theme while a screen is mounted updates it immediately and preserves state (per `DARK_MODE_COMPLIANCE_SPEC.md` 5.1).
7. `npm run check:theme-colors`, `check:tab-bar`, `check:icons`, `test:theme`, `test:contrast`, `typecheck`, and `lint` pass.
8. Release-like Android build checked in light and dark on a phone and a tablet: Home, Lesson, Quiz result states, Streak, Settings, and Onboarding.

## 9. Open decisions

| Decision | Recommendation |
|---|---|
| Dark background: Duolingo-style slate `#131F24` or true neutral gray (for example `#121212`) | Use slate `#131F24`. It is the reference look, and pure gray makes the orange feel harsher. Changing it only touches the dark column in 4.1. |
| Success green `#58CC02` or the current `#2ECC71` | Use `#58CC02`, as noted in 4.3. |
| Keep a faint orange wash behind the streak/celebration screens | No. Use confetti and flame artwork for celebration, not a background tint, so the rule "orange is never a background" has no exception. |
