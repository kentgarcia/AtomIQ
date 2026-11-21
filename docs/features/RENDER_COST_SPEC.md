# Render cost spec: why screens hitch, and how to cut it without repeated device testing

Status: first pass built 2026-11-22 (see the Status section); written after four shared perf reports (Galaxy S21 development build, 120 Hz; iPhone 12 in Expo Go) and a read of the code. Nothing in section 4 is built yet. Replaces the "build tabs in the background" idea of `PERFORMANCE_AND_SOUND_SPEC.md` §5.8, which did not work (section 1).

## Status (2026-11-22): what is built, what changed from the plan, what was left

Built and checked without a device (typecheck, lint, `test:perf` 50, `test:lecture`, `test:path-nodes`, `test:sprite`, `check:images`, and the rest of the check scripts):

| Item | State | Notes |
|---|---|---|
| A1 image diet | **done** | 20 photos resized to 1024 px (149 MB less to decode), the chest glow thinned from 104 frames at 25 fps to 52 at 12.5 (same 4.16 s, 11.2 to 6.0 MB), a 256 px copy of the icon for the Chats head and Settings. `npm run check:images` gates it. **Correction to section 1.2:** only pictures a `require()` names are bundled, so 18 required pictures were over 4 MB (not 38; the rest were unused files such as `profile/*.png` and `onboarding/1.png`, which cost nothing at run time). Required pictures now decode to 191 MB if every one were loaded (348 before), of which the sprite sheets are 27 MB |
| A2 remove warm-up | **done** | files, probe switch, storage key, report section and tests deleted |
| A3 freeze hidden tabs | **tried and removed** | the navigator ignores `freezeOnBlur`, so `react-freeze` was applied by hand. The first iPhone Auto-walk (below) showed first opens under 100 ms but the REVISITS of the frozen tabs at 352 (Quests), 269 (Profile) and 276 ms (Games, a nearly static screen), and Games' render timer read 46 s: its render began while frozen and committed only on thaw, so freezing held the commit back without saving the render. Removed; revisit hitches are re-measured by the next walk |
| A5 measure | **done** | `useRenderTimer` (works in a release build, unlike `Profiler`), the Auto-walk and the two new report sections. **Not run yet: this is the one device run that decides the rest** |
| C1 window the Home map | **done** | `map-window-core.ts` (tested); nodes within 1.5 screens of the window, the current, tapped and changing nodes always drawn |
| C2 fewer layers | **partly** | the held-still bust (the lesson teacher) is 6 Svg layers instead of 8. A swaying figure keeps 5: its layers sit on different moving parents and cannot be merged |
| C4 typewriter | **done** | steps of 3 characters every 60 ms, half the bubble re-layouts |
| Found while building (not in the plan) | **done** | the Phone tab **tore down all 16 icons every time it lost focus and built them again on return**: that is the per-visit 230 to 280 ms hitch. The grid now stays (`gridDrawn`); a later visit only chooses the next install batch |

Left, on purpose, with the reason (each is a hypothesis the Auto-walk will confirm or kill, and a blind change here risks the look):

- **B1 baked Phone icons.** Recounted: an icon is about 8 native views (the picture's paths are not views, only its `Svg` root is), so baking saves about 2 views and one vector draw per icon, not the "150 to 40" of section 1.2 D3. With the per-visit rebuild gone the grid is built once. Revisit if the Phone's first open is still over target.
- **B2 baked teacher stills for lists.** A list figure is already a single `Svg` of about 25 paths (`live={false}`); a bitmap is one view too. No expected saving.
- **B3 baked patterns.** There is no safe way to tile a bitmap here: expo-image does not support `repeat`, and Fresco (React Native on Android) does not repeat images either (a comment in `ReactImageView.kt` says so). The alternative, one baked picture per size per pattern, multiplies assets for an unproven gain. If the Auto-walk shows the Shop or Profile still hitching on the pattern layer, the next step is drawing patterns with fewer shapes per tile, or a baked wallpaper only for the full-screen uses.
- **A4 Shop preview.** Nothing to remove that is certain: the tiles are memoized and `PatternLayer` is memoized. The Auto-walk's Shop row (JS render versus native frame) says which side the 667 ms is on.
- **C3 lesson card mount.** Needs the lesson's JS-versus-native split, which the lesson screen's `useRenderTimer("/lesson")` records, but the Auto-walk does not open a lesson run (it needs a started lesson); open one lesson card by hand before pressing Share to get its row.

### First Auto-walk (iPhone 12, Expo Go, dev bundle, 2026-11-21)

- **First opens are fine: 0 of 10 over 100 ms** (worst Shop 97 ms). Before this work the iPhone's first opens were 270 to 570 ms. The Phone's revisit is 17 ms (it was a full rebuild).
- **The JS thread is the loaded one**: 14 fps, 134 stalls over 100 ms in a minute, and the render cost of screens on it is large in the dev bundle: Shop mounts in 958 ms, Quests 507 ms, Phone 335 ms (first open), Profile 167 ms, Encyclopedia up to 707 ms. A dev bundle runs React several times slower than a release build, so these are an upper bound; the Android walk (same button) is the one to compare.
- Frame numbers per step are loose while the JS thread is blocked (the collector reads its windows late), so a hitch can land in the next step; trust the timestamped "FRAMES OVER 100 ms" list for when.
- The JS numbers beside Games, Shop and every screen after it (30 to 46 s) were the freeze artifact above, now dropped by the timer.

## Next, in one run

Finish or skip the tour, press **Auto-walk** on the probe (or the HUD), wait about a minute, and send the report that opens. Its "Auto-walk" line says how many first opens are still over 100 ms and which; "SCREEN RENDER COST" says how much of each is JavaScript. That decides B1, B3, A4 and C3 with numbers.

## 0. The rules this spec follows

1. **The owner cannot test repeatedly.** So every change here must be justifiable from the code or the assets (a number a script can print), and enforced by a check script that fails the build. A device run is for confirming at the end, once, not for deciding.
2. **Fix the cost, do not hide it.** Warm-up, deferred mounts and idle callbacks only move work around. They are allowed only where the work cannot be removed.
3. **No change to the look.** The flat Duolingo-style art stays. What changes is how it reaches the screen (a bitmap instead of a tree of vector views, a smaller picture instead of a huge one).
4. **Every number below is marked** *measured* (from a report), *counted* (from the code or files) or *hypothesis* (a reading that a number has not confirmed yet).

## 1. What we know

### 1.1 Measured (four reports, same walk)

- Hitches are 280 to 670 ms **UI-thread** frames, once per screen on first open, at Max, Reduced and Disabled alike. The animation level does not touch them.
- The minified bundle (`--no-dev --minify`, React in production mode) was no faster on Android. So the cost is **native**: creating views, drawing vector shapes and decoding pictures, not JavaScript and not the dev bundle.
- Same screens on both phones. Android, latest run, worst frame: Shop 667, Community 384 (revisit too), Phone 283 (every visit), Onboarding 234, lessons 342 to 384. Quests 41, Profile 25, Awards 50 once their tabs had been built.
- The Phone tab is the only one with *sustained* load: 5 to 6% of its frames are over 2x the frame time, against 1 to 2% on the others.
- JS stalls over 100 ms: 164 to 183 in 2.5 minutes (40 on Home, 41 on Onboarding). Not attributed yet.
- **Warm-up failed.** It needs about 12 s of idle on Home, a lesson or game stops it, and nobody idles. A learner opens the tab they came for within seconds. It is removed (A2).

### 1.2 Counted (the cost drivers)

| # | Driver | Count | Where it bites |
|---|---|---|---|
| D1 | **Pictures far bigger than they are shown.** 433 bundled images; 38 are over 4 MB decoded, 373 MB together if all were loaded (127 MB if capped at 1024 px). Worst: `terms/Uranium-235.webp` 3200x2560 = 31 MB, `people/Lise_Meitner.webp` 27 MB, `people/fermi.webp` 26 MB, `onboarding/1.png` 1888x2240 = 16 MB (Onboarding), `chest/chest-loop.webp` 1344x2184 = 11 MB and `chest-open.webp` (Quests), `character_shrodi_sheet.png` 2048x2048 = 16 MB (platformer), the 1024 px app icon in three copies | First open of Quests, Onboarding, Encyclopedia, the Atom Maze; memory pressure everywhere (the crash guard exists for a reason) |
| D2 | **Vector art drawn as native view trees.** A live figure is 5 `Svg` views (back, face, lids, top, front) plus 4 animated views and a clock; a still figure is 1 `Svg` of about 25 paths. An avatar tile adds a `PatternLayer` `Svg` that fills a rect with an SVG `Pattern` (18 shapes a tile on average, 56 at most; react-native-svg draws a pattern to an offscreen bitmap) | Shop (a tile per item, a big preview that changes on every try-on), Profile card, Phone wallpaper, Contacts, every avatar with a pattern |
| D3 | **Phone app icons.** 16 icons, each with about 7 animated views, 5 `useAnimatedStyle`, an animated SVG rect and an SVG glyph, so roughly 150 native views for a screen that shows icons | Phone, on every visit (its frames stay over budget) |
| D4 | **The Home map is not virtualized.** One `ScrollView` draws every node: each node is a lip `Svg`, a face `Svg` (circle, swirl lines, glyph) in an animated view, and the current one a ring `Svg`. 14 nodes today across 2 units; every new unit adds about 5 to 7 | Home is always mounted. This is the best case: it gets worse with every unit shipped |
| D5 | **Hidden tabs stay live.** No `freezeOnBlur`, no detaching; six tab trees are mounted and re-render on store changes while hidden | JS stalls, and the work behind a hitch on return |
| D6 | **A lecture types itself with `setInterval` and `setState` per tick** (`TypedText`) | JS thread during every lecture card (hypothesis for the lesson stalls) |

Already fixed and not the cause any more: feed cards re-rendering on every focus and reaction (`reuseItems`, `minuteOf`), phone icons re-rendering with new handlers (`sameIconView`), Feed's focus refresh (delayed, throttled), loops gated by focus and animation level.

### 1.3 Hypothesis (to be confirmed by the numbers A5 adds)

- The Shop's 500 to 670 ms is the big preview avatar and its pattern layer being re-created and re-drawn on each try-on (D2). The React side is already memoized.
- Lesson hitches (150 to 384 ms at 120 Hz) are a new card mounting many SVG scenes (D2) plus the cascade, not the state machine.
- Revisit hitches on Community are the focus refresh (now delayed) plus D5.

## 2. Targets

A screen passes when, on the Galaxy S21 run (Android creates and draws views the most expensively of the two phones):

- the **first open** of every tab and every screen in the walk has no frame over **100 ms**, and none over **50 ms** on a revisit;
- no screen has more than **2%** of frames over 2x;
- JS stalls over 100 ms: at most **1 per screen** in a walk.

Static budgets (the gates in section 4, no phone needed):

- no bundled image whose decoded size is over **4 MB** unless it is in a named exceptions list with a reason; no photo wider than **1280 px**;
- no screen draws an SVG `Pattern` fill at runtime;
- every list that can grow past one screen of items is virtualized or windowed;
- the Phone tab's home screen draws at most **60** native views in total (a count a test computes from the catalog, see B1).

## 3. Method: how this avoids repeated testing

1. **Static first.** Work items in phases A and B are verified by scripts (image sizes, the baked files being fresh, no `Pattern`, node counts). They ship without a device run.
2. **One tap, whole walk (A5).** The perf probe gets an "Auto-walk" button: it opens each tab and each key screen twice (a first open and a revisit), waits for the frames to settle, then opens the share sheet. The owner taps once, waits about a minute, taps Share. No manual route, no waiting on Home. The report gains a **commit time per screen** (React `Profiler`), which finally says how much of each hitch is JavaScript and how much is native. That removes the guessing that cost the last three rounds.
3. **One confirmation at the end (phase D):** the same Auto-walk on a **preview APK** (a release build, Hermes bytecode, `EXPO_PUBLIC_PERF_PROBE=1`) on the S21, and once on the iPhone 12. Expo Go on the iPhone is never a verdict on speed.

## 4. Work, in order

Each item has: the change, why it should help (evidence), how it is checked without a phone, risk.

### Phase A: cheap, certain, no look change

**A1. Image diet.** Resize every photo to at most **1024 px on its long edge** (people, terms, onboarding; they are shown a fraction of that wide), re-export as WebP, and shrink the app icon copies to what the stores need. Re-bake the chest sheets smaller: halve the loop's frames (25 fps to 12 fps is invisible on a glow) and cut the frame size to the size it is drawn at; same for `character_shrodi_sheet` only if the baked frame is larger than the largest zoom needs. Script `scripts/shrink-images.mjs` (keeps the originals under `tools/image-originals/`, outside the bundle, like `tools/platformer-art/`); gate `npm run check:images` fails on a new oversized or over-wide image, with an exceptions list in the script.
Evidence: D1; first opens of Quests, Onboarding, Encyclopedia, the Atom Maze; 373 MB to about 127 MB.
Check: the script prints decoded MB per image and the total; the gate runs in `check`. Risk: low; open the Encyclopedia, a person page and onboarding once to eyeball sharpness (a screen-size photo at 1024 px is sharp at 3x on a 400 dp card).

**A2. Remove the warm-up.** Delete `use-tab-warmup.ts`, `tab-warmup.ts`, `tab-warmup-core.ts`, its report section, the probe switch, `STORAGE_KEYS.TAB_WARMUP`, its tests and the CLAUDE.md paragraph; tabs go back to the default lazy behaviour. It added code and a switch and gave nothing a normal learner sees.

**A3. Freeze hidden tabs.** Set `freezeOnBlur: true` on the tab screens (react-native-screens freeze) so a tab that is not in front does not re-render on store changes. Evidence: D5. Check: typecheck, plus the tour and install-moment code already waits for focus. Risk: low to medium (anything that must keep running while hidden, such as the tab dot counts, lives in the tab bar, not in the frozen screen; verify the Feed dot and the Phone dot still update).

**A4. Shop preview audit.** Make the big preview cheap to change: keep the avatar's picture layer mounted and change only the part that differs where the data allows it (a try-on changes one choice), compute the pattern's tile placements once per pattern id (already `useMemo`) and **do not lay the pattern out again** on a size-equal change (`onLayout` sets `box` state, which re-renders the pattern `Svg`). Depends on B3 for the real fix; until then this only removes redundant work. Check: the render count test for `Avatar`/`PatternLayer` (new, in `test:avatar`).

**A5. Measure per screen, one tap.** (a) `Profiler` around each tab screen and the Shop, lesson run, onboarding; the store keeps the mount commit time and the worst re-render. (b) The Auto-walk button described in section 3. (c) `formatReport` prints "SCREEN COST: /shop first open, JS commit 38 ms, worst frame 667 ms", which separates JS from native in every row. Check: `test:perf` on the pure formatter. This is built **first** so every later phase has a number that costs the owner one tap.

### Phase B: bake the still art into pictures

The flat art is data (`app-icon-art.ts`, `npc-art.ts`, `pattern-art.ts`). Keep it as the source, and add a bake step like `bake-emotes.mjs` and `bake-shrodi-layers.py`: run once, commit the WebP, reference it with `expo-image`. One image is one native view, with no path drawing. The script writes the hash of its source data into the file name or a manifest, and a gate `check:baked-art` fails when the data changed and the picture did not, so the two never drift.

**B1. Phone app icons.** Bake each app's tile and glyph (normal and locked) at 3x. `AppIcon` draws one image, keeps the press sink, badge and install pop (already view transforms and opacity). This cuts the Phone from roughly 150 native views to about 40. The same baked icons serve the Shop's phone-app unlocks, the tour pictures and Settings. Check: a test computes the Phone screen's view budget from the catalog; `check:baked-art`. Risk: low; the icons use the app's fixed object palette, so theme does not change them.

**B2. Teacher heads and busts for lists.** The cast is fixed (about ten teachers plus Shrodi). Bake `head` and `hero` stills per teacher and pose actually used in lists (Feed posts, Contacts, Chats, Ranks, blog comments); a live or large figure (lesson bust, profile cover, preview) stays vector. Feed, Contacts and Chats rows become image rows. Check: `test:npc` asserts every list use has a baked picture.

**B3. Patterns and wallpapers as bitmaps.** Bake each of the 35 patterns once as a white-on-transparent picture of a few tiles (the layer is already white at 50%), plus the five illustrated phone wallpapers, and draw them with `expo-image`, scaled to the tile size asked for. Removes the runtime SVG `Pattern` from the Phone, Profile card, Contacts, Shop preview, every patterned avatar and every Shop tile. Evidence: D2, and the Phone's sustained load. Risk: medium (a bitmap pattern at very large sizes can blur: bake at 3x of the biggest use and test with the contact sheet script, which already exists for patterns).

**B4. Evaluate (do not commit to) a runtime cache for avatars.** `Svg.toDataURL` can turn an avatar into a picture once per configuration and size; lists would then draw that picture. It would make the shop's grid and every avatar row an image. It is a larger change with a cache to invalidate, so it is decided only after A5's numbers say avatars are still the cost once B3 is in.

### Phase C: structure

**C1. Window the Home map.** The node positions are deterministic (`node-geometry.ts`), so render only the nodes within about 1.5 screens of the viewport and a spacer for the rest; keep the current node, its bubble and the unit cards always mounted. Needed as the curriculum grows (D4), whatever the phones do today. Check: a test that the windowed set for any scroll offset contains the viewport's nodes and the current one.

**C2. Fewer layers on a live figure.** A live figure is 5 `Svg` views. `back` and `front` need not move apart from `face` when the pose does not sway: merge them into one layer for a still pose and keep three (body, head with lids, front) otherwise. Fewer views per teacher on the lesson preview, conversations and onboarding. Check: `test:npc` on the layer count.

**C3. Lesson card mount (decide after A5).** If the commit time shows the card tree is the cost: mount a card's figure scene one frame after its text (the cascade already staggers arrivals), and use C2/B-style stills for lesson spot art that does not move. If it shows JavaScript, do the typewriter below.

**C4. The typewriter.** Reveal a lecture bubble by word (or in chunks of about 3 characters) instead of one `setState` per tick, and stop the interval the moment it finishes. Check: `test:lecture` on the pure timeline. Only if C3's numbers or A5's JS stalls point at it.

### Phase D: confirm once

Auto-walk on the preview APK (S21) and once on the iPhone 12. Pass = section 2. Anything over target becomes a line in the next revision of this spec with its Profiler row, never a guess.

## 5. Order and what each should buy

| Order | Item | Needs a device run to decide? | Expected effect (hypothesis until D) |
|---|---|---|---|
| 1 | A5 Profiler + Auto-walk | no | the numbers for everything below |
| 2 | A1 images, A2 remove warm-up | no | first open of Quests, Onboarding, Encyclopedia, Atom Maze; less memory |
| 3 | B1 phone icons | no | the Phone tab stops being the sustained cost |
| 4 | B3 patterns/wallpapers | no | Shop try-ons, Profile card, Phone wallpaper, avatar rows |
| 5 | A3 freeze, A4 Shop audit | no | fewer JS stalls, cheaper Shop |
| 6 | B2 teacher stills, C2 layers | no | Feed, Contacts, Chats, lesson preview |
| 7 | C1 window Home | no | Home stays flat as units are added |
| 8 | C3/C4 lessons | yes (A5 row decides) | the 150 to 384 ms lesson hitches |
| 9 | D confirmation | the one run | pass or a new row |

## 6. Not doing

- Any more idle or background warm-up, or telling learners to wait.
- Dropping animation, art detail or the cascade for slow devices. The animation level and the speed page already exist for that choice; this spec lowers the cost for everyone instead.
- A new graphics engine (Skia, Lottie renderers): the project already found native Lottie unreliable here, and adding a dependency to draw what a bitmap can show is the wrong direction.
- Building all tabs behind the splash: it would hide the hitch by delaying every launch and raising memory on the phones that crash first. Kept only as a fallback if A, B and C leave a tab over target.

## 7. Open questions (none block A)

- Is the Shop's preview cost the avatar or the pattern? A5's per-screen row plus B3 answer it; until then A4 only removes redundant work.
- Are 1024 px photos enough for tablets (`supportsTablet`)? On a 10 inch tablet at full width a card photo is about 800 dp: 1024 px is soft at 2x. If tablets matter, cap at 1600 for the few full-width photos and list them as exceptions.
- Should the Phone's baked icons exist at all once B3 lands, or is the pattern the Phone's whole cost? A5 decides before B1 is spent; B1 is still recommended because 150 native views per visit is a cost whatever else is fixed.
