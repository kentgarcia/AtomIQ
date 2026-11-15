# AtomIQ: Kubai Icons Migration Specification

**Status:** **Reverted 2026-11-14.** Implemented and reviewed visually by the owner, who found the look unacceptable ("ugly"). All Kubai code, scripts and dependencies were removed; `Icon` and the tab bar render Iconsax and the original PNGs again. Kept as a record of the approach (§13) in case a different icon set is tried.  
**Date:** 2026-11-14  
**Owner:** AtomIQ engineering  
**Applies to:** navigation and main-action icons rendered through `components/ui/icon.tsx`  
**Related:** [`ICON_INTEGRITY_SPEC.md`](./ICON_INTEGRITY_SPEC.md), [`DARK_MODE_COMPLIANCE_SPEC.md`](./DARK_MODE_COMPLIANCE_SPEC.md), [`THEME_EXCEPTION_REGISTER.md`](./THEME_EXCEPTION_REGISTER.md)

## 1. Goal

Replace the icons used for **navigation** and **main actions** with [Kubai Icons](https://icons.kubai.design/docs/) of the same meaning. Keep every icon's size and colour. Change no other code: no layout, no behaviour, no call-site rewrites unless unavoidable.

Success is a visible design upgrade for those controls with no regression in layout, contrast, accessibility, performance or the icon-integrity gate.

## 2. Findings that shape the plan

Verified on 2026-11-14 against the public docs and `index.json` (v0.8.0, 2,954 icons, 930 base icons, MIT).

| # | Finding | Consequence |
|---|---|---|
| F1 | The requested package choice does not fit this project. The packages are `kubai-icons-react` (React 18+ / Next.js, DOM SVG), `kubai-icons-vue`, `kubai-icons` (plain JS + `<kubai-icon>` web component) and `kubai-icons-static` (SVG files). **None documents React Native or `react-native-svg`.** AtomIQ is Expo / React Native. | Do not install `kubai-icons-react` as a runtime dependency; it targets the DOM and would only work on the web build. Use a generation approach (§4). |
| F2 | Icons are layered, filled artwork with an accent colour, not stroke glyphs. `color` is "the accent color that all gradients, outlines and marks are derived from", not a flat fill. There is no stroke-width prop. | "Keep colours" means passing the same colour value; the rendering becomes a gradient/duotone derived from it. This must be checked for contrast (§7). |
| F3 | Static SVGs use `<linearGradient>`, `<filter>` (`feGaussianBlur`, `feColorMatrix`, `feOffset`, `feBlend`), `<mask>`, and a baked-in blue palette (`#93BBFF`, `#7FAEFF`…). | `react-native-svg` support for filters on Android/iOS and under the project's React Native architecture is **unproven**. A spike must decide whether filters render, are dropped, or are flattened (§5, phase 0). |
| F4 | The only style axis is `variant`: `color` (default) and `soft` (lighter fills, darker outlines). Iconsax's six variants (`Linear`, `Outline`, `TwoTone`, `Bulk`, `Broken`, `Bold`) have no equivalent. | A variant mapping is required (§6.3). |
| F5 | The docs say to "use base icons instead of badged icons at 24 px and below", and static files shown at 24 px should be displayed at 28 px to match animated icons. The artwork's `viewBox` is `-2.5 -5.5 36 36`, so the glyph occupies less than the full box. | Size parity cannot be assumed. Optical size must be calibrated per icon so the visible glyph matches today's (§6.4). |
| F6 | Hover/active/trigger props and motion are web-oriented (hover, `prefers-reduced-motion`). | Not used on native. Do not port animation in this migration. |
| F7 | The bottom tab bar uses PNG assets, not `Icon` (`ICON_INTEGRITY_SPEC.md` §1 excludes them). | "Navigation" must be defined explicitly (§3). The owner opted in (Q1), so the tab icons are migrated too (§13.4). |
| F8 | The icons and packages are MIT. The Kubai Icons **skill** is "source-available" under the Kubai Icons License. Kubai and Lumno names and logos are not licensed. | Generated icons may ship with a retained copyright notice. The skill is optional tooling and has its own terms (§8). |

## 3. Scope

### 3.1 In scope: "navigation and main actions"

Defined by meaning, not by file. At least 108 of the 225 literal `<Icon name="…">` usages in `app/` and `components/` fall in this set. Dynamic usages of the same canonical names (data-driven) are covered through the registry.

| Group | Current Iconsax names (usages) | Meaning |
|---|---|---|
| Back / forward | `ArrowLeft2` (16), `ArrowLeft` (3), `ArrowRight2` (27), `ArrowRight` (3) | page back, continue, row chevrons |
| Confirm / dismiss | `TickCircle` (16), `CloseCircle` (14), `Close` (5) | confirm, correct, close, clear |
| Primary actions | `SearchNormal` (4), `Refresh` (4), `Play` (2), `Send` (1), `Share` (1), `Edit2` (2), `Trash` (3), `Setting` (1) | search, retry, start, send, share, edit, delete, settings |
| Utility actions | `Lock` (2), `Link` (2), `Eye` (2) | locked, open link, view |
| Read Aloud control | `VolumeHigh`, `VolumeSlash`, `Warning2` (via `components/ui/read-aloud-button.tsx`) | speak, stop, failed |

### 3.2 Out of scope

- Bottom tab-bar PNG icons: now in scope (Q1), see §13.4.
- Content-driven icons (lesson Lab options, Guide pills and cards, missions, units, Explorer, achievements) are not migrated as a group. The swap is by icon name, so one of them changes only when its name is in `KUBAI_MAP` (e.g. a lesson option that uses `TickCircle`), and it keeps the colour it is given.
- Decorative icons with no navigation or action meaning (`Flash`, `Crown`, `Cup`, `Danger` badges, `Book` section icons, etc.).
- Icons with no Kubai equivalent. They stay on Iconsax and are listed in §6.2.
- Animation, hover and toggle behaviour from the Kubai packages.
- Any layout, spacing, copy, navigation or logic change.

## 4. Approach

### 4.1 Options considered

| Option | Verdict |
|---|---|
| A. Install `kubai-icons-react` and import components | **Rejected.** DOM SVG only; does not render on native. |
| B. Render `kubai-icons-static` or `/api/icon/…` SVG at runtime | **Rejected.** Needs network or large runtime parsing; breaks offline use. |
| C. `<kubai-icon>` web component / WebView | **Rejected.** Not suitable for native UI controls. |
| D. **Generate `react-native-svg` components from Kubai artwork at build time and bundle them** | **Recommended**, subject to the phase-0 spike. `react-native-svg` is already a dependency. Works offline, no runtime Kubai dependency. |
| E. Keep Iconsax | Fallback if the spike fails (§9). |

### 4.2 Package use (replaces step 1 of the request)

No runtime package. Add **dev-only** inputs for the generator, pinned to an exact version:

- `kubai-icons-static` (SVG source) as a `devDependency`, or `kubai-icons` if its markup exposes the colour derivation function the generator needs to recolour per `color` prop (decided in the spike).
- Do **not** add `kubai-icons-react` or `kubai-icons-vue`.

Generated output is committed under `components/ui/kubai/` with a header recording the Kubai package version and MIT notice.

### 4.3 Runtime shape

Call sites are **not edited**. `components/ui/icon.tsx` keeps its public props (`name`, `size`, `color`, `variant`, `style`, `source`). The registry gains a Kubai layer:

1. Apply the existing alias map.
2. If the resolved Iconsax name is in `KUBAI_MAP` and Kubai icons are enabled, render the generated Kubai component with the same `size`, `color` and `style`.
3. Otherwise render Iconsax exactly as today, including the existing fallback and diagnostics.

This keeps the diff to `icon.tsx`, `icon-registry.ts` (plus new files), satisfying "change no other code", and gives one switch to roll back (§9).

## 5. Phased plan

**Phase 0: Feasibility spike (blocking).** On Android and iOS, in light and dark, render 6 representative icons (`chevron-left`, `circle-check`, `circle-x`, `search`, `sync`, `play`) through `react-native-svg` from the Kubai artwork and answer:

1. Do `<filter>`, `<mask>` and gradients render correctly under the app's React Native version and architecture? If filters do not, is dropping the shadow/highlight filters visually acceptable?
2. Can the accent colour be recoloured at runtime (computed gradient stops) so `color` behaves like today's?
3. Frame cost for 30+ icons on a mid-range Android device (scrolling lists with `ArrowRight2` rows).
4. Optical size at 16/20/24 px against current Iconsax glyphs.

Exit: written go/no-go in this file. No-go ends the migration at the fallback (E).

**Phase 1: Generator and registry.** `scripts/generate-kubai-icons.mjs`, `components/ui/kubai/*`, `KUBAI_MAP`, resolver changes, feature flag. No call-site changes.

**Phase 2: Mapping and calibration.** Fill §6.1 with confirmed names, resolve open mappings, set per-icon optical scale, decide the variant mapping.

**Phase 3: Verification.** Automated gates (§7), visual review in both themes, accessibility and performance checks.

**Phase 4: Rollout.** Ship behind the flag, enable by default after on-device review.

## 6. Icon mapping

### 6.1 Candidate map

Kubai names were checked to exist in `index.json` v0.8.0 on 2026-11-14. "Review" rows need a visual or semantic decision in phase 2.

| Iconsax name | Kubai name | Status |
|---|---|---|
| `ArrowLeft2`, `ArrowLeft` | `chevron-left`, `arrow-left` | exists; `ArrowLeft2`→chevron, `ArrowLeft`→arrow (preserves today's distinction) |
| `ArrowRight2`, `ArrowRight` | `chevron-right`, `arrow-right` | exists; same rule |
| `TickCircle` | `circle-check` | exists |
| `CloseCircle` | `circle-x` | exists |
| `Close` (alias → `CloseCircle` today) | `circle-x` | **Review:** no plain "x" icon found; a bare close glyph may need a new icon (§8.2) |
| `SearchNormal` | `search` | exists |
| `Refresh` (alias → `Loader`/`Refresh` use) | `sync` or `rotate-cw` | **Review:** pick one for "retry/refresh" |
| `Play` | `play` | exists |
| `Send` | `send` | exists |
| `Share` | `share` | exists |
| `Edit2` | `pencil` | exists |
| `Trash` | `trash` | exists |
| `Setting` | `settings` | exists (a `sliders` icon also matches the tag) |
| `Lock` | `lock` | exists |
| `Link` | `link` | exists |
| `Eye` | `eye` | exists |
| `VolumeHigh` | `volume` | exists (`speaker` is an alternative) |
| `VolumeSlash` | `volume-off` | exists |
| `Warning2` | `triangle-alert` | exists |

Names above are candidates; the generator must fail if any `KUBAI_MAP` target is absent from the pinned name list.

### 6.2 No equivalent or out of scope

Names not in §6.1 stay on Iconsax. Any in-scope meaning that has no suitable Kubai icon is recorded here with the decision (keep Iconsax, or create a new Kubai-style icon per §8.2).

### 6.3 Variant mapping (to confirm)

Iconsax `variant` → Kubai `variant`:

| Iconsax | Kubai |
|---|---|
| `Bold`, `Bulk`, `TwoTone` | `color` |
| `Linear`, `Outline`, `Broken` | `soft` |

Reviewed visually in phase 2; adjust if the result changes emphasis (for example a muted "Linear" icon turning into a strong coloured one).

### 6.4 Size and colour parity

- `size` is passed through unchanged. Each generated icon declares an optical scale factor so its visible glyph height matches the Iconsax glyph it replaces at 16, 20 and 24 px (F5). Layout boxes must not change.
- `color` is passed through unchanged and drives the Kubai accent. Where a call site passes a colour chosen for contrast (for example the Read Aloud glyph colour derived with `pickReadableText`), contrast must be re-measured on the rendered artwork, not the input colour (§7).
- Base (non-badged) icons only at 24 px and below.

## 7. Requirements and acceptance criteria

1. **Integrity gate stays green.** `npm run check:icons` extends to validate every `KUBAI_MAP` target against a committed, pinned name list (`scripts/data/kubai-icon-names.json`, generated from `index.json` version-tagged), so CI works offline. Invalid mappings fail the build.
2. **Fallback preserved.** Unknown names still render the visible fallback with diagnostics. A Kubai render error must fall back to the Iconsax icon, never to a blank slot.
3. **No call-site churn.** `git diff` outside `components/ui/icon.tsx`, `components/ui/icon-registry.ts`, `components/ui/kubai/*`, `scripts/*`, `package.json` and docs is empty, except for a call site that cannot work otherwise (each must be justified here).
4. **Size parity.** Rendered bounding box is within ±1 px of the current Iconsax icon at 16, 20 and 24 px for every mapped icon; no layout shift in any screen.
5. **Contrast.** For every mapped icon at every colour passed in the app, the darkest and lightest rendered layers keep at least 3:1 against their background (UI icon threshold) in light and dark. Icons that carry meaning alone (close, confirm, destructive) must keep at least 4.5:1 with the paired label. Add this to `scripts/test-option-contrast.mjs` or a sibling test, and run `npm run check:theme-colors`.
6. **State clarity.** Selected, pressed, disabled and failed states of buttons that contain a mapped icon (for example `ReadAloudButton`, Guide options, back buttons) stay distinguishable without relying on colour alone.
7. **Accessibility.** Icons remain decorative (hidden from the accessibility tree); the accessible label stays on the parent control. No accessible name is lost or duplicated.
8. **Performance.** On a mid-range Android device, no measurable frame-rate regression on the longest lists that use mapped icons; JS bundle growth for generated icons is under an agreed budget (propose 40 KB for the in-scope set).
9. **Offline.** No icon fetch at runtime.
10. **Licence.** MIT notice retained in `components/ui/kubai/` and listed in the app's third-party notices.
11. **Typecheck, lint and existing gates pass:** `npx tsc --noEmit`, `npm run check:icons`, `npm run check:theme-colors`, `npm run test:icons`, `npm run test:contrast`.

## 8. Tooling and the Kubai skill

### 8.1 Installing the Kubai Icons skill (step from the request, not yet done)

To create new icons, the request asks to clone `https://github.com/kubai087/kubai-icons` into the skills folder as `kubai-icons` (`~/.claude/skills` for Claude Code), or pull the latest if it already exists, confirm `SKILL.md` exists, and report when ready.

This has **not** been done. It installs third-party instructions that will run with the assistant's permissions, so it needs explicit approval at execution time (open question Q3). Before enabling it, review `SKILL.md` and any scripts it ships. The skill is source-available under the Kubai Icons License, not MIT; confirm that licence permits the intended use. The skill is optional: the migration itself does not depend on it.

### 8.2 Creating new icons

Only when an in-scope meaning has no Kubai equivalent (for example a bare close "x"). New icons must follow Kubai's design language, be added to the generator input with a recorded rationale, and pass the same gates. Prefer an existing icon when one is a reasonable semantic match.

### 8.3 Generator

`scripts/generate-kubai-icons.mjs` reads the pinned Kubai source, converts each mapped icon to a `react-native-svg` component (gradients, masks and, per the spike, filters or their flattened equivalent), derives gradient stops from the `color` prop, writes `components/ui/kubai/`, and writes a name manifest used by `check:icons`. It is deterministic so regenerated output diffs cleanly when the Kubai version is bumped.

## 9. Rollout, risk and rollback

| Risk | Mitigation |
|---|---|
| React Native does not render Kubai filters or masks acceptably | Phase-0 spike; flatten filters in the generator; no-go falls back to Iconsax |
| Duotone gradients reduce contrast on small buttons | Contrast tests on rendered layers (§7.5); choose `soft` or keep Iconsax per icon |
| Visual size drift breaks tight layouts | Per-icon optical scale and ±1 px check (§7.4) |
| List performance on low-end Android | Memoised icon components; shared gradient ids; budget check (§7.8) |
| Mixed icon languages look inconsistent | Migrate the whole in-scope set together; review screens in both themes |
| Upstream renames or removes an icon | Pinned version and name manifest; generator fails on a missing name |

**Rollback:** a single flag in `icon-registry.ts` (`KUBAI_ICONS_ENABLED`) makes every mapped name resolve to Iconsax again. No call site depends on Kubai.

## 10. Verification plan

- [ ] Phase-0 spike result recorded (go/no-go, filter behaviour, perf numbers).
- [ ] Every §6.1 row confirmed or moved to §6.2.
- [ ] `npm run check:icons` fails on a deliberately broken `KUBAI_MAP` entry, passes when fixed.
- [ ] Screenshot review of: page headers (back), list rows (chevrons), confirm/close states, search, retry, Read Aloud states, Guide options, settings, delete, share/send. Light and dark, compact phone, standard phone, tablet, large font.
- [ ] Bounding-box comparison at 16/20/24 px for all mapped icons.
- [ ] Contrast report for every mapped icon and colour in use.
- [ ] TalkBack pass on controls containing mapped icons.
- [ ] Android scroll-performance check on the longest lists.
- [ ] Release notes list which icons changed and which stayed on Iconsax.

## 11. Non-goals

- Replacing Iconsax everywhere or removing the `iconsax-react-native` dependency.
- Deleting the tab-bar PNG assets (they remain as the fallback).
- Adding Kubai animation, hover or toggle behaviour.
- Redesigning any control, spacing or layout.
- Shipping the Kubai skill or its generated artwork as part of the app.

## 12. Decisions (formerly open questions)

| # | Decision | Owner answer |
|---|---|---|
| Q1 | The bottom tab-bar icons are in scope. | "yes" |
| Q2 | The new Kubai look is accepted, **but every icon keeps the colour its call site passes today** (a gray option icon stays gray). Kubai derives its whole palette from one accent, so that colour becomes the accent. | "yes, but still use the original color icon" |
| Q3 | Installing the Kubai Icons skill is approved. Cloned to `~/.claude/skills/kubai-icons` (HEAD `7459692`), `SKILL.md` present. | "sure" |
| Q4 | Mapping, variants and `Close` chosen by engineering (§6, §13). `Close` is already aliased to `CloseCircle` in the registry, so it renders `circle-x` with no extra rule; no plain "x" icon was drawn. | "do the best" |
| Q5 | Budget chosen: generated data under **100 KB** (actual 55 KB for 25 icons, enforced by `test:kubai`). The proposed 40 KB could not hold the layered artwork. | "do the best option" |

## 13. Implementation record

### 13.1 Phase 0 result: **GO, with a flat render**

- No Kubai package supports React Native (web components only), and the published markup uses CSS variables and `color-mix()`, which `react-native-svg` cannot evaluate. The generator therefore rewrites the pinned `kubai-icons@0.8.0` markup into a token template and the app resolves the tokens from the colour passed at the call site.
- `react-native-svg@15.16.0` supports every element the templates use (`defs`, `linearGradient`, `stop`, `mask`, `rect`, `path`, `g`, `circle`, `clipPath`). Filters exist but their behaviour differs by platform and each costs a render pass per layer, so **the generator removes the drop-shadow and inner-highlight filters.** Gradients and the outline mask, which carry the layered look, are kept.
- Verified with resvg renders (light/dark, six sizes, gray, orange, white-on-orange). **Not verified:** how Android and iOS draw the masks and gradients, nor scroll performance. These are the first items of the device checklist.

### 13.2 What was built

| Piece | File |
|---|---|
| Pinned dependency (devDependency; `@resvg/resvg-js` is also dev-only, for measuring and tests) | `package.json` |
| Name manifest (verified against the pinned release) | `scripts/data/kubai-icon-names.json` |
| Generator and `--check` | `scripts/generate-kubai-icons.mjs`, `npm run generate:icons`, `npm run check:kubai` |
| Artwork bounds, used to crop every icon to the same optical size | `scripts/measure-kubai-icons.mjs`, `scripts/data/kubai-icon-bounds.json` |
| Generated templates (25 icons, 55 KB) | `components/ui/kubai/kubai-icon-data.generated.ts` |
| Colour resolution (framework-free) | `components/ui/kubai/kubai-color.ts` |
| SVG builder with cache, `KubaiIcon` component | `components/ui/kubai/kubai-svg.ts`, `kubai-icon.tsx` |
| `KUBAI_MAP`, `KUBAI_ICONS_ENABLED`, `KUBAI_MIN_SIZE`, variant rule | `components/ui/icon-registry.ts` |
| Branch in `Icon` (no call site changed) | `components/ui/icon.tsx` |
| Tab bar | `app/(tabs)/_layout.tsx` |
| Tests | `scripts/test-kubai-icons.mjs`, `npm run test:kubai` |

### 13.3 Rules that differ from the first draft

- **Colour parity.** The "color" variant fills with the exact accent. The "soft" variant (line variants) lightens the fill and darkens edge and glyph from the same accent. Hue is tested to stay within 6° and neutral grays are tested to stay neutral.
- **Pale accents.** White, `#E5E7EB`, `#9CA3AF` and similar cannot carry a white glyph, so they use "soft", and the glyph is darkened or lightened until it reaches 3:1 against the badge (WCAG non-text). Tested for every theme colour plus extremes.
- **Variants.** `Bold`, `Bulk`, `TwoTone` → "color". `Linear`, `Outline`, `Broken` → "soft".
- **Minimum size 14 px.** Below that the glyph inside the badge is unreadable, so those few call sites (one 12 px chevron) keep Iconsax.
- **Alpha.** A colour with alpha (`#RRGGBB80`, `rgba()`) becomes whole-icon opacity. A colour that cannot be parsed (`transparent`, a named colour) renders Iconsax.
- **Failure.** If `react-native-svg` fails to parse an icon, that icon falls back to Iconsax for the session. `KUBAI_ICONS_ENABLED = false` restores Iconsax everywhere.
- **Optical size.** Each icon is cropped square around its measured artwork so the longer side fills 86 % of the box (Iconsax glyphs fill about 83 %). Tested for no clipping and a 80–92 % fill.

### 13.4 Mapping used

`ArrowLeft2`→chevron-left, `ArrowRight2`→chevron-right, `ArrowLeft`→arrow-left, `ArrowRight`→arrow-right, `TickCircle`→circle-check, `CloseCircle`/`Close`→circle-x, `SearchNormal`→search, `Refresh`/`Loader`→sync, `Play`→play, `Send`→send, `Share`→share, `Edit2`→pencil, `Trash`→trash, `Setting`→settings, `Lock`→lock, `Link`→link, `Eye`→eye, `VolumeHigh`→volume, `VolumeSlash`→volume-off, `Warning2`→triangle-alert.

**Tab bar** (the PNGs are illustrations, so the meaning and dominant colour were kept): Home book→`book-open` (blue), Discover people→`users` (cyan), Guide cat mascot→`cat` (orange), Games controller→`gamepad` (blue), Profile person→`user` (purple). The PNG files stay in `assets/` as the fallback.

**Stayed on Iconsax:** every other icon (Flash, Medal, Teacher, Shield, Forbidden2 and the rest have no confirmed Kubai equivalent), and mapped icons below 14 px.

### 13.5 Known limitations

- Kubai is badge-style, so back, forward, confirm and close icons are circles with a glyph, not bare glyphs. Where a call site already draws its own circle behind the icon, check that it does not now look doubled.
- A few icons (`user`, `gamepad`, `cat`, `volume-off`) use fixed white details, so on a pure-white accent they lose some detail. The tab bar uses coloured accents and is unaffected.
- The icon artwork is MIT (`kubai-icons`). Keep the notice below when shipping.

> Icons: © Kubai087, MIT License, `kubai-icons@0.8.0`. The Kubai Icons *skill* is under a separate source-available license and is not shipped.
