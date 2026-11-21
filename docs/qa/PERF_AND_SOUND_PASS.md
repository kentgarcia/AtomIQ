# Performance and sound pass (device runs)

How to take comparable numbers on a phone, and where to file them. The plan and the reasons are in `docs/features/PERFORMANCE_AND_SOUND_SPEC.md` (read its section 2 first: Expo Go and dev builds run a dev JS bundle and are never a performance verdict). Each run below becomes one dated section at the bottom.

## 0. Builds

| Id | Device | Build | Command | Use |
|---|---|---|---|---|
| A3 | Android phone | Development build (hot reload) | `eas build -p android --profile development`, install it, then `npx expo start --dev-client -c`; or locally `npx expo run:android` (needs the Android SDK; it generates `android/`) | Iterating the Android sound engine. Dev bundle: not a timing verdict. |
| A1 | Android phone | Preview APK | `eas build -p android --profile preview` (it sets `EXPO_PUBLIC_PERF_PROBE=1`, so the probe is inside) | The verdict. |
| I1 | iPhone | Expo Go, release-like JS | `EXPO_PUBLIC_PERF_PROBE=1 npx expo start --no-dev --minify`, scan the code | The iPhone's timing column. |
| I2 | iPhone | Expo Go, dev | `npx expo start` | Only to reproduce "a sound sometimes does not play". |

Force a sound engine on one device for an A/B (a build-time value, restart Metro with `-c`): `EXPO_PUBLIC_SFX_BACKEND=expo-audio` or `audio-api`. `audio-api` is refused on iOS and in Expo Go and the probe says so.

On the phone: Settings > Developer options > animation scales 1x; note the refresh rate (the probe reads it); close other apps; battery saver off; airplane mode does not matter (the app is offline).

## 1. The probe

Home has a small bolt button at the bottom left, third from the left (beside Dev admin). It opens the **Perf probe**:

- **Frames**: UI-thread frames counted since the last Reset, the share over 1.2x and over 2x the display's frame time (targets: under 5% and under 0.5%), the worst frame, the JS thread's fps and its stalls over 100 ms.
- **By screen**: the same frame numbers split by route (`/`, `/shop`, `/lesson/...`), the worst first, with how many half-second windows held a frame over 100 ms. **Frames over 100 ms** lists the newest hitches with the clock time and the screen. This is what tells a slow mount from a slow animation. A window counts for the screen on show when it ends, so a hitch at a screen change can land on the new screen. Both are in **Share report**.
- **Sound**: the engine in use and why, live players or decoded files, faults (`lost` and `error`), the reason of each fault (cue, outcome, message, how often) and a count per outcome. `gate`, `skip-*` and `evicted` are by design. `late` means a load or decode came before the sound.
- **The report** (`perf-report-core.ts`, one message, no questions to answer afterwards): a summary first (SMOOTH, BORDERLINE or CHOPPY, the animation level in use, the worst screens), then the phone and build (model, OS, memory, tier and whether it was forced, display Hz, version, Expo Go or development or release build, dev or release JS bundle, Hermes, new architecture, the EXPO_PUBLIC switches, crashes found), the overall numbers, **by animation level** (time, frames, over 1.2x and 2x, worst frame, hitches and JS stalls for Max, Reduced and Disabled, so one run can switch the level in Settings and the report still compares them), by screen with JS stalls, **the walk** (screens in the order and clock time they were visited), frames over 100 ms with screen and level, and the sound log.
- **Last 20 cues**, **Show HUD** (a readout over every screen, on from the start: UI fps, JS fps, slow %, stalls, sound faults; **its Share report button sends the report in one tap without leaving the screen, its Probe button opens the probe from any screen; holding the readout shares too**), **Reset**, **Sound stress** (10 taps in 0.6 s, then 20 mixed cues in 2 s), **Sound self-test** (26 cues, one per area, 9 s) and **Share report** (plain text out of the phone).

## 2. The scripted tour

Reset the probe at each stop, do the thing, open the probe, and write the line. Do it twice on each build.

| # | Stop | What to do | Record |
|---|---|---|---|
| 1 | Cold start to onboarding step 1 | Force-stop the app, open it, stopwatch from the tap to Shrodi waving | seconds, UI over 1.2x / 2x |
| 2 | Onboarding questions | Get started, answer the three questions | UI and JS numbers |
| 3 | Building your path | Wait the 3 s | dropped frames (target under 5%) |
| 4 | The taste lesson, name, welcome | Finish onboarding | stalls |
| 5 | Home map | Scroll the map top to bottom, tap a node, open the preview | numbers |
| 6 | A lesson | Three cards of two different types, then the finish screen | numbers; sounds heard vs expected |
| 7 | Shop | Open, try on 3 items, buy one | numbers; sounds |
| 8 | Phone | Open Chats, a thread, send 3 replies | numbers; sounds |
| 9 | Atom Maze | Level 1 for 60 s, one battle | numbers; sounds |
| 10 | Myth Buster | A Quick round | numbers; sounds |
| 11 | Sound stress and self-test | Run each on the probe, after the tour | the outcome table, any fault |

For sound, also write what you did NOT hear. Then open the probe and read the cue list: a miss that shows `gate` or `skip-*` is by design; `lost`, `error` or a long `late` is a fault and goes in the table below.

## 3. The two cheap A/B switches (local builds only)

They find out whether audio is what hurts the onboarding. Never commit them.

1. No audio at launch: in `services/sfx.ts`, comment out `warmSfxSet("core")` inside `initializeSfx`, run tour stops 1 to 4 on A1, restore.
2. A still Shrodi: in `components/mascot/Shrodi.tsx` default `live` to `false`, run stops 1 to 4, restore.

## 3b. The Reanimated Android flag and the device tier

- **Tier:** the probe does not show it yet; to judge a phone as another tier, build with `EXPO_PUBLIC_DEVICE_TIER=high|mid|low` (an Android phone with 6 GB or more is `high`, 4 to 6 GB `mid`, under that `low`; an iPhone is `high`). On `mid` Shrodi idles at 30 steps a second, on `low` he is still (frame 0), bursts throw 75% and 50% of their stars and the `expo-audio` engine keeps 24 and 16 players. Run tour stops 1 to 4 on A1 at each tier and write down the lowest one that looks right: that is the default for the phone class.
- **Reanimated flag (an A/B, needs a rebuild, so it is invisible in Expo Go):** add to `package.json` `"reanimated": { "staticFeatureFlags": { "ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS": true } }`, build the preview APK, run stops 1 to 4 and 6, and check touch targets and the tutorial's lit holes still work. Keep it only if the frame numbers improve and nothing flickers. **It is ON now** (set on 2026-11-21 after the first Android reports showed the UI thread over budget on every screen while the iPhone was fine): rebuild the dev client, run the same walk and compare with the first report in section 6. To go back, delete the `reanimated` block from `package.json` and rebuild.

## 3c. The animation levels (Settings > Animations)

Run the same walk (Reset first, then tap Share report on the HUD) once at **Max**, once at **Reduced** and once at **Disabled**, on the same phone and the same build, and compare the "By screen" lines and the UI and JS totals. The first reading of what each level saves goes in section 6. Check by eye: at **Reduced** Shrodi, the teachers, fireflies, shine sweeps and the chest glow are still, while a pressed option, a stamp and the feedback sheet still play and bursts are smaller; at **Disabled** nothing moves and every screen still reads. A phone the app calls `low` starts on Reduced (`EXPO_PUBLIC_DEVICE_TIER=low` forces that to look at it). The tour has no animation at any level.

## 3d. The crash prompt

In a development build: open the perf probe, press **Pretend the app crashed**, close the app from the app switcher and open it again (or reload): "Run smoother?" shows about a second after start with Reduced recommended. Answer it, repeat: it recommends Disabled this time (Reduced was in use). On a preview APK, real detection is on: with the app in front, force it to crash or kill it from `adb shell am kill` / a memory kill, and the next start shows the prompt; leaving by Home, back or the app switcher must NOT.

## 4. The audio-api spike (Android, spec section 4.4 D)

Run on A3 first, then A1. Each item is pass or fail with a note.

| # | Check | Result |
|---|---|---|
| 1 | Builds and runs with Expo SDK 58, RN 0.88, React 19.3, Reanimated 4.7; onboarding still plays | |
| 2 | 30 overlapping plays of one sound and 20 different sounds at once: no dropout, no frame over 2x (the stress script) | |
| 3 | Pitch: `chat.incoming` (1.5x) and `lesson.bubble` (0.85x) change pitch without changing speed | |
| 4 | Mixes with another app's music (the music keeps playing, effects heard over it), plays with silent mode on, nothing plays in the background | |
| 5 | Permissions: generated manifest has no microphone, foreground-service or background entry (`unzip -p app.apk AndroidManifest.xml` is binary: use `aapt dump permissions app.apk`); `npm run test:legal` passes | |
| 6 | Start latency under 80 ms for taps (loopback recording or `adb shell dumpsys media.audio_flinger`) | |
| 7 | Every bundled `.wav` decodes in a release APK (the self-test shows no `lost: decode-failed`); decoding the `core` set after the first frame costs no visible hitch; memory stays under 32 MB of buffers | |

If a decode fails only in the APK, the engine already retries through `expo-asset` (a local file); note whether that was needed.

**Decision gate** (spec 4.4 D): if a numbered item fails, or the A/B on A1 (`audio-api` against `expo-audio`, same script) shows no gain in cues heard and frame time, stop at the `expo-audio` fixes, set `pickBackend` to return `expo-audio` and write why below.

## 5. Findings per hypothesis

Mark each confirmed, refuted or not tested, with the number that decided it.

| Id | Hypothesis (spec section) | Result |
|---|---|---|
| S1 | Too many native players on Android (sweep: 24 / 16 / 12 as the cap; `adb logcat -s AudioTrack AudioFlinger ExoPlayerImpl`) | |
| S2 | Eviction fights warming (`late` and `lost` counts) | |
| S3 | Main-thread contention from audio | |
| S5 | Rewind races (stress script on `expo-audio`) | |
| S6 | Expo Go iPhone: shared session or AVPlayer limits (I2 against I1) | |
| S7 | The old global press handler did nothing | Confirmed by reading: it is removed |
| S8 | Scheduler gaps drop legitimate repeats (`skip-gap` per cue) | |
| P1 | Audio setup shares the UI thread with animation (A/B 1 above) | |
| P2 | Animated SVG props are expensive on Android (A/B 2 above; the Reanimated Android flag) | |
| P3 | `width` animated bars | |
| P4 | Many entering animations at once | |
| P5 | The typewriter re-renders from JS | |
| P6 | 90 or 120 Hz halves the budget | |
| P7 | The APK was a release build | |

## 5b. Animated layout styles that remain (`scripts/perf-baseline.json`)

`check:perf` lets these stand because they are low-frequency, were not reported, or are not layout in the sense that matters. Each is a candidate once the numbers say layout is the cost: `components/lab/DecayLab.tsx` and `RadiationShieldLab.tsx` (lab graph and slab), `components/profile/PassportCard.tsx` (the flip's height), `components/tutorial/Spotlight.tsx` (the hand's place, 2; the tutorial was reported fast on Android), `components/ui/fast-alphabet.tsx`, `components/ui/sliding-highlight.tsx`, and `components/lesson/visual/SceneFigure.tsx` (an SVG rect's own size, not a view's layout).

## 6. Runs

(One dated section per run: device, build, refresh rate, the tour table, the sound table, the spike table, the decisions taken.)

### Android development build, first run (120 Hz display)

Reported by the owner, not yet from a shared report: sounds fixed (audio-api); lessons smooth, with a frame drop on a correct answer and the feedback sheet; continue slightly laggy, much more so in onboarding; changing screens slower than on the iPhone; chat the smoothest feature; the tutorial drops frames and sometimes does not show. Worst frame 915 ms (map, lessons, onboarding, profile, quests, games, phone) and 1108 ms (shop); 19 sound faults with 77 files decoded. A dev build runs the dev JS bundle, so these are not a verdict. Next: a report from the new "By screen" probe, then the same on the preview APK.

### 2026-11-21: first reports with the by-screen probe (both dev JS bundles, 60 Hz UI thread on both)

| | iPhone, Expo Go | Android, dev build (audio-api) |
|---|---|---|
| UI frames over 1.2x / 2x budget | 0.7% / 0.4% | 16.1% / 6.8% |
| Worst frame | 1302 ms (one, at a screen change) | 1133 ms |
| JS stalls over 100 ms | 129 | 562 |
| Frames over 100 ms (hitches) | 6 in the whole run | 20 to 38 on each of lesson, onboarding, Home; 5 to 8 on phone, chat, profile, Feed |
| Slowest screens | onboarding, Home, Games (1 to 2 hitches each) | lesson 38, onboarding 24, Home 20, phone 8, chat 6, profile 5, Feed 5 |
| Sound faults | none | none (the 14 padded files decode; 78 buffers live) |
| Late cues | 35 of 322 plays (first plays of ui.tick, ui.tab, ui.modal-open) | 5 of 207 |

Read: the sound problem on Android is solved. iPhone is smooth and Android is not, on every screen and in the same places (lesson, onboarding, Home), which points at JS-thread cost on a slower CPU under the dev bundle rather than one bad screen. Not yet separated: how much is the dev bundle and how much is the app. Next: the same walk on a release-like JS bundle (`EXPO_PUBLIC_PERF_PROBE=1 npx expo start --dev-client --no-dev --minify`), then the preview APK.
