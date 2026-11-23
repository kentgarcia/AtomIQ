# AtomIQ — Bottom Tab Bar Responsive Positioning Specification

**Status:** Steps 1–3 of §11 implemented 2026-11-16 (resolver, wiring, gate, Home FABs). Step 4 (navigation-bar glyphs) and the device matrix are pending.
**Date:** 2026-11-16
**Owner:** AtomIQ engineering
**Applies to:** `app/(tabs)/_layout.tsx`, `components/layout/tab-bar-inset.tsx`, `theme/layout.ts`, `scripts/check-tab-bar-clearance.mjs`, and any screen that anchors a control above the tab bar

> **Update: the bar is now docked.** It is fixed to the bottom edge, spans the full window width (the tabs themselves stop at `maxWidth` and stay centred on tablets), has a top border only, and its background continues under the system inset. Each tab is an icon with a label under it (active label in the active colour). There is no gap (`gap: 0`), no side margin (`horizontalMargin` is only the side system inset), no highlight square and no bottom fade. Sections below that describe a floating pill, a margin, a gap or the fade are historical; `theme/tab-bar-metrics.ts` and `test:tab-bar` are the current truth.
**Extends:** `ANDROID_RESPONSIVE_UI_UX_SPEC.md` (§4.2, §6.1)

## 1. Goal

The tab bar must look the same and clear the same things on every phone: small and large, Android gesture navigation, Android three-button navigation, tablets with a taskbar, and iPhones with or without a home indicator.

"Looks great" is defined by four measurable rules:

1. **Never covered, never covering.** The bar does not overlap system navigation (buttons or gesture pill), and no content, FAB or CTA is hidden behind it.
2. **Consistent visual margin.** The gap between the bar and the system navigation area, and the gap to the screen sides, look intentional on every device and never hug an edge.
3. **Touch-safe.** Every tab hit area is at least 48 × 48 dp, including on 320 dp-wide windows.
4. **One source of truth.** The bar, the screens and the CI gate all read the same metrics. No screen hardcodes a bar height.

Layout never branches on device model, brand or OS version. It branches only on window size, safe-area insets and the measured bar.

## 2. Current state and problems found

What exists today (all verified in the repo):

- `app/(tabs)/_layout.tsx` positions the bar with `bottom: insets.bottom + layout.tabBar.gap` and `paddingHorizontal: layout.tabBar.horizontalMargin` (20).
- `components/layout/tab-bar-inset.tsx` measures the bar via `onLayout` and exposes `useTabBarInset()` (`measured height + gap + insets.bottom`, or `insets.bottom` when hidden). Hiding goes through `useHideTabBar()` and keyboard events.
- `theme/layout.ts` holds `layout.tabBar = { contentHeight: 79, gap: 10, horizontalMargin: 20, maxWidth: 600 }`.
- `npm run check:tab-bar` proves clearance for five viewports × three navigation modes.

Problems this spec fixes:

| # | Problem | Evidence | Impact |
|---|---|---|---|
| P1 | **Tabs are narrower than 48 dp on 320 dp windows.** Bar width is `320 − 72 = 248`; minus 4 dp border and 16 dp padding leaves 228 dp, so each of the 5 tabs is 45.6 dp. The 56 dp icon circle is wider than its tab and overlaps its neighbours. | `_layout.tsx` styles `tabBar`, `iconContainer`; `layout.tabBar.horizontalMargin` | Fails the 48 dp rule. Realistic on Android "Display size: Large", which shrinks window dp width. |
| P2 | **The check script's navigation modes are inverted.** It models three-button as inset `0`, gesture as `24`, "tall-gesture" as `48`. In practice three-button is the *largest* Android inset (about 48 dp) and gesture is small (about 16–24 dp). | `scripts/check-tab-bar-clearance.mjs`, `navigationModes` | The gate passes without testing the worst real case, and its labels mislead QA. |
| P3 | **Home FABs use a magic offset.** The beta-info button and "jump to current lesson" arrow use `bottom: insets.bottom + 130`. | `app/(tabs)/index.tsx:1082`, `:1097` | They do not follow the measured bar. If the bar's height or gap changes, or the bar is hidden, they float wrongly or collide. The gate only checks `paddingBottom`, so it misses them. |
| P4 | **The bar formula exists in three places.** The bar (`_layout.tsx`), the provider (`tab-bar-inset.tsx`) and `useResponsiveLayout().tabBarReservedHeight` (`theme/layout.ts`) each compute it from `layout.tabBar`, and the check script regex-parses the source. | grep `tabBar.gap` | Any change to bar metrics must be made in four places, and the script can silently drift from the code. |
| P5 | **Bar ignores side insets.** Only `horizontalMargin` is applied. | `tabBarLayer` style | Wrong on landscape phones with a side navigation bar or cutout. See §8 on large-screen orientation. |
| P6 | **Short windows lose a lot of space.** 79 + 16 + 48 = 143 dp is about 22% of a 640 dp window on three-button navigation. | computed | Content area feels cramped on small Androids. |
| P7 | **Navigation-bar glyph contrast is unverified when the in-app theme differs from the system theme.** The app has its own theme mode (`theme/ThemeProvider.tsx`), but only `<StatusBar>` is configured in `app/_layout.tsx`. | `app/_layout.tsx:100` | On three-button navigation, dark glyphs on a dark app (or the reverse) can make the system buttons unreadable. |

## 3. System bottom inset reference

`insets.bottom` from `react-native-safe-area-context` is the only input we use. The values below are **typical, not guaranteed**. Record the real values per device in the QA table (§9) instead of trusting this table.

| Navigation mode | Typical `insets.bottom` | Notes |
|---|---:|---|
| None / hidden / iPhone with home button | 0 | Bar must still keep its own gap so it never touches the edge. |
| Android gesture | ~16–24 dp | Some OEMs shrink it further when the gesture hint is turned off. |
| iPhone home indicator | 34 dp | Reference look; must not change. |
| Android three-button | ~48 dp | Largest phone inset. Treated as the worst case for clearance. |
| Android tablet taskbar | ~48–64 dp | Persistent; present on large screens. |

The inset can change while the app is running: the user switches navigation mode, enters split-screen, rotates a tablet, or toggles the OEM gesture hint. The bar and every screen must follow without a reload and without stale padding.

## 4. Metrics model

### 4.1 Pure resolver

Add one framework-free module, `theme/tab-bar-metrics.ts`. It follows the `services/media-core.ts` precedent (no React or React Native imports) so `node --test` can load it.

```ts
interface TabBarMetricsInput {
  windowWidth: number;
  windowHeight: number;
  insets: { top: number; bottom: number; left: number; right: number };
  tabCount: number;            // 5
}

interface TabBarMetrics {
  variant: "regular" | "dense";
  contentHeight: number;       // bar height incl. borders (what onLayout reports)
  iconSlot: number;            // icon container width, clamped to the tab width
  iconSlotHeight: number;      // icon container height (variant value; keeps bar height stable)
  iconSize: number;            // glyph size
  verticalPadding: number;
  gap: number;                 // space between bar bottom and system inset
  bottomOffset: number;        // distance from window bottom to bar bottom = insets.bottom + gap
  horizontalMargin: number;    // distance from each window side to the bar
  barWidth: number;
  tabWidth: number;            // hit-area width per tab
  reservedHeight: number;      // contentHeight + bottomOffset (what screens reserve)
}
export function resolveTabBarMetrics(input: TabBarMetricsInput): TabBarMetrics;
```

Everything else consumes this function: the bar component, `TabBarInsetProvider` (fallback height and `total`), `useResponsiveLayout().tabBarReservedHeight`, and `scripts/check-tab-bar-clearance.mjs` (which imports the module instead of regex-parsing source).

### 4.2 Variants

| | Regular | Dense |
|---|---|---|
| Trigger | default | `windowWidth < 360` **or** `windowHeight ≤ 640` |
| `iconSlot` / `iconSize` | 52 / 32 | 48 / 28 |
| `verticalPadding` | 8 | 6 |
| `contentHeight` | 75 (52 + 2×8 + 2 top border + 5 bottom lip) | 67 (48 + 2×6 + 7) |
| `gap` | 16 | 12 |

Rationale for the trigger: dense is for genuinely small Android windows (360 × 640 and below, or Android "Large" display size). It is deliberately *not* tied to the 720 dp `short` class, so an iPhone SE (375 × 667) keeps the regular bar and the iPhone reference look does not change.

### 4.3 Horizontal rules

```
horizontalMargin = clamp((windowWidth − tabCount × 48 − 20) / 2, 6, 20)
horizontalMargin = max(horizontalMargin, insets.left + 8, insets.right + 8)
barWidth         = min(windowWidth − 2 × horizontalMargin, 600)
tabWidth         = (barWidth − 2 × 8 − 2 × 2) / tabCount     // padding 8, border 2
iconSlot         = min(variant.iconSlot, floor(tabWidth))
```

Properties this guarantees:

- `tabWidth ≥ 48` for every window width from 320 dp up (with six tabs, at 320 dp the margin becomes 10 instead of 12, so tabs are 48 dp).
- `iconSlot ≤ tabWidth`, so icon circles never overlap neighbours.
- At 360 dp and wider the margin stays 20 (36 originally, 12 for a while); the regular gap is 10 dp (was 16) and the dense gap 8 dp (was 12).
- On tablets the bar stays centred at 600 dp max and is never stretched edge to edge.

### 4.4 Vertical rule

```
bottomOffset   = insets.bottom + gap
reservedHeight = contentHeight + bottomOffset
```

This keeps today's behavior, which already gives a consistent visual margin across modes: 3-button 48 + 10 = 58 dp from the screen bottom, gesture ~24 + 10 = 34 dp, iPhone 34 + 10 = 44 dp, no inset 10 dp. The bar always sits *above* the system navigation area, never inside it.

The bar must not be moved by animation when the inset changes. It repositions through layout, so the sliding active highlight, whose position is derived from the tab index and tab width, follows with no extra animation.

## 5. Behavior requirements

### 5.1 Bar placement

- The bar's bottom edge is at `bottomOffset` from the window bottom, always. No `Platform.OS` branch.
- The bar is centred, `barWidth` wide, with the margins in §4.3.
- The bar reports its measured height through `onLayout` as it does today. The provider uses `resolveTabBarMetrics().contentHeight` as the fallback **before** the first measurement, so the first frame does not jump.
- Elevation and shadow stay inside the bar layer. Elevation 16 on Android must not be clipped by a parent, and the shadow must remain visible in dark mode (see `completed/NEUTRAL_THEME_ORANGE_ACCENT_SPEC.md` for border and lip rules).
- Behind the bar, every tab fades into the page colour (`background` on Home, `mapBackground` on the other tabs) with a gradient drawn by the tab bar layer (`bottomFade` in `app/(tabs)/_layout.tsx`): it spans the reserved height plus 12 dp, so it stays under the 16 dp that floating buttons keep above the bar. Content scrolls under it to the screen bottom, and screens keep their last row clear of the bar with the reserved inset. The fade is not drawn while the bar is hidden.

### 5.2 Reserved space for screens

- Screens reserve space only through `useTabBarInset()`, `useBottomInset({ tabBar: true })` or `<ScreenFrame reserveTabBar>`. No `insets.bottom + <number>` for anything that sits above the bar.
- Anything anchored above the bar uses `useBottomInset({ tabBar: true, extra: n })`. The home FABs become `extra: 16`, which replaces the `+ 130` literal.
- The last scroll item keeps at least 16 dp of clearance above the bar top (existing `MIN_CLEARANCE`).
- When the bar is hidden (immersive Guide chat, keyboard open) the reserved space collapses to `insets.bottom` and anchored FABs drop with it.

### 5.3 Keyboard

- The bar is hidden while the soft keyboard is open (existing behavior).
- With `softwareKeyboardLayoutMode: "resize"` on Android edge-to-edge, verify on Android 11 through 16 that `insets.bottom` while the keyboard is open does not double-count into the hidden-state `total`, and that no frame shows the bar sitting on top of the keyboard or over the focused input. `keyboardDidShow` fires after the animation on Android, so confirm there is no visible flash. If there is, hide on input focus instead of waiting for the keyboard event.

### 5.4 System navigation bar legibility (P7)

- On Android three-button navigation, the navigation glyphs must be legible against the app background in all combinations: system light/dark × in-app light/dark/system theme.
- The glyph style must follow the **in-app** theme, not only the system theme.
- `expo-status-bar` styles the status bar only. Whether it also covers the navigation glyphs on SDK 58 must be verified on a device. If it does not, add `expo-navigation-bar` and call its button-style API from the root layout. That is a new dependency and needs an explicit decision (see §10).

### 5.5 Accessibility

- Each tab keeps `accessibilityRole="tab"`, a label and a selected state.
- Hit area per tab ≥ 48 × 48 dp (`tabWidth ≥ 48`, `minHeight` 48 already set).
- The active tab is marked by shape (rounded square with fill and border), not color alone. With the OS "remove animations" setting on, the highlight switches instantly (handled by `useReducedMotion`).
- Font scale does not affect the bar because it has no text labels. The bar must be identical at font scale 1.0, 1.3 and 2.0.

### 5.6 Window changes

Positioning must follow `useWindowDimensions()` and `useSafeAreaInsets()`, never `Dimensions.get("screen")`. That covers split-screen, freeform windows, foldable fold/unfold, Android display size changes and tablet taskbar toggles.

## 6. Screens that need changes

| File | Change |
|---|---|
| `theme/tab-bar-metrics.ts` (new) | The resolver in §4. |
| `theme/layout.ts` | Keep `layout.tabBar` as the *regular* variant constants consumed by the resolver. `tabBarReservedHeight` in `useResponsiveLayout()` calls the resolver. |
| `components/layout/tab-bar-inset.tsx` | Provider gets metrics from the resolver for fallback height and `total`. `total === metrics.reservedHeight` when visible. |
| `app/(tabs)/_layout.tsx` | Read `bottomOffset`, `horizontalMargin`, `iconSlot`, `iconSize`, `verticalPadding` from the resolver. Replace the static `iconContainer`/`tabImage` sizes. Pass side insets into the margin rule. |
| `app/(tabs)/index.tsx` | `betaFab` and `nextBtn`: replace `insets.bottom + 130` with `useBottomInset({ tabBar: true, extra: 16 })`. |
| `scripts/check-tab-bar-clearance.mjs` | See §7. |
| `app/_layout.tsx` | Navigation-bar glyph style per §5.4 once the decision in §10 is made. |

## 7. Verification

### 7.1 Automated

Update `npm run check:tab-bar` and add `scripts/test-tab-bar-metrics.mjs` (`node --test`, wired as `test:tab-bar`).

**Fix the inset model (P2):** replace the navigation modes with

```
none          0
gesture       24
iphone        34
three-button  48
taskbar       64
```

**Viewports:** keep the existing five and add `320 × 640` (smallest realistic Android), `360 × 640`, `375 × 667` (iPhone SE), `393 × 852`, `430 × 932`, `600 × 960` (small tablet), `800 × 1280`.

**Invariants asserted for every viewport × mode:**

1. `tabWidth ≥ 48` and `iconSlot ≤ tabWidth`.
2. `barWidth ≤ 520` and `2 × horizontalMargin + barWidth ≤ windowWidth`.
3. `bottomOffset === insets.bottom + gap` and `reservedHeight === contentHeight + bottomOffset`.
4. `reservedHeight < windowHeight × 0.25`. This tightens today's 50% limit, which could never fail. The `taskbar` inset is only paired with viewports 600 dp wide or more.
5. The provider's visible `total` equals `reservedHeight`; hidden `total` equals `insets.bottom`.
6. iPhone reference widths (375, 390, 393, 430) at heights above 640 resolve to the *regular* variant with margin 36, so iOS output matches today.
7. Dense triggers exactly for `width < 360 || height ≤ 640`.

**Static checks to add to the script:**

- Fail on any `insets.bottom + <number>` used as an absolute `bottom:` value in `app/(tabs)/**` and `components/games/**` (catches P3).
- Fail if `scripts/` or screens re-derive `contentHeight + gap` instead of calling the resolver (catches P4).

### 7.2 Manual device matrix

Extends `ANDROID_RESPONSIVE_UI_UX_SPEC.md` §9. Record the measured `insets.bottom`, window size and nav mode with each screenshot.

| Target | Navigation | Display | Check |
|---|---|---|---|
| Pixel 8/9 class | Gesture | Default | Reference look; bar 40 dp from bottom |
| Samsung A/S class | Gesture, then three-button | Default | Same bar position logic; glyphs readable; gesture hint on and off |
| Moto G / Redmi class | Three-button | Default | Dense variant on 360 × 640; no overlap with nav buttons |
| Any phone | Gesture | Display size Large (≈ 320 dp wide) | Tabs ≥ 48 dp, icons not overlapping |
| Android tablet 7–10" | Taskbar | Default | Bar centred at 520 dp; clears taskbar |
| Foldable, folded and unfolded | Gesture | Default | Bar re-resolves on fold with no stale padding |
| Any phone | Switch gesture ↔ three-button while the app is open | Default | Bar and screens follow with no reload |
| Any phone | Split-screen (top and bottom halves) | Default | No phantom bottom gap in the top window |
| iPhone SE, 15, 15 Pro Max | n/a | Default | Pixel-equivalent to current build |

Each cell also runs light and dark in-app theme against the opposite system theme (P7), and Home, Discovery, Guide landing, Games and Profile.

### 7.3 Optional dev aid

A `__DEV__`-only readout (window size, `insets`, variant, `reservedHeight`) toggled from Settings makes QA recordings self-describing. It is not shipped in release builds.

## 8. Orientation and large screens

The app is portrait-only (`app.json`). Per current Android guidance, newer targets stop honoring orientation locks on displays 600 dp and wider, so tablets and foldables may show the app in landscape regardless. This should be verified against the SDK 58 build's target API before relying on the lock.

Bar behavior if landscape does occur: the bar stays centred at 600 dp max, side margins respect `insets.left` / `insets.right` (§4.3), and the reserved band uses the landscape bottom inset. Full landscape layout for screens remains out of scope.

## 9. Acceptance criteria

- `tabWidth ≥ 48` and no icon overlap at 320 dp width.
- The bar sits at `insets.bottom + gap` on every row of §7.2 and never overlaps the navigation buttons or gesture pill.
- No content, FAB or CTA is hidden behind the bar on any row of §7.2, in gesture and three-button modes.
- Home FABs use the measured inset; no `+ 130` remains.
- Switching navigation mode or window size at runtime repositions the bar and all screen padding without relaunch.
- Navigation glyphs are legible in all four system-theme × in-app-theme combinations on three-button navigation.
- iPhone output at reference widths is unchanged.
- `npm run check:tab-bar`, `npm run test:tab-bar`, `npm run typecheck`, `npm run lint` and `npm run check:theme-colors` pass.
- The final pass is done on a release-like Android build, not only Expo Go.

## 10. Open decisions

1. **`expo-navigation-bar` dependency (§5.4).** Verify first whether `expo-status-bar` already covers navigation glyph style on SDK 58 edge-to-edge. If not, adding `expo-navigation-bar` is the lowest-risk fix, but it is a new native dependency.
2. **Dense variant thresholds (§4.2).** `width < 360 || height ≤ 640` is chosen to leave iPhones untouched. Confirm on real small Androids; adjust if Large display size lands on heights above 640.
3. **Typical inset values (§3).** Replace them with measured values from the first device-matrix run.
4. **Keyboard hide timing (§5.3).** Keep `keyboardDidShow`, or hide on input focus, depending on whether a flash is visible on device.

## 11. Suggested execution order

1. Add `theme/tab-bar-metrics.ts` and `scripts/test-tab-bar-metrics.mjs`; fix the inset model in `check-tab-bar-clearance.mjs` (P2). This alone exposes P1 as a failing test.
2. Wire the resolver into `layout.ts`, the provider and `_layout.tsx` (P1, P4, P5, P6).
3. Replace the Home FAB offsets and add the static checks (P3).
4. Verify and resolve the navigation-bar glyph decision (P7).
5. Run the device matrix, record real insets, adjust §3 and §10.
6. Re-run all gates on a release-like Android build.
