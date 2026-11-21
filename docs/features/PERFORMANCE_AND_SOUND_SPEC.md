# Performance, animation and sound across devices

**Status:** IN PROGRESS 2026-11-21. **Built (typecheck, lint, `test:sfx` 51, `test:perf` 11, `check:sfx`, `check:theme-colors`, `test:legal`, `check:phone`, `check:tutorial` pass; Android and iOS bundles export; nothing has been heard or measured on a device yet):** the sound seam (`SfxBackend`, `pickBackend`, the `expo-audio` engine with a player cap, warm-by-screen sets, `useSfxSet`, a single load path with one retry, batched rewinds, long status interval; the `react-native-audio-api` engine, Android only, guarded `require`, decoded buffers within a 32 MB budget; the outcome log `sfx-diag.ts`; the dead global press handler removed; `check:sfx` import rules), the measurement kit (the perf probe, its HUD and collector, the sound stress and self-test scripts, the `preview` profile's `EXPO_PUBLIC_PERF_PROBE=1`) and `docs/qa/PERF_AND_SOUND_PASS.md`, the device runbook. `react-native-audio-api` 1.0.1 is installed, pinned, and **without its Expo config plugin** (the plugin adds foreground-service permissions and an iOS background-audio mode by default). **Also built (phase 2, the parts that are right whatever the numbers say; unseen on a device):** `useFillStyle` / `useFillPxStyle` (`components/ui/progress-fill.ts`, maths `progress-fill-core.ts`) replacing every animated-`width` bar (onboarding bar, "Building your path", the lesson bar, the level-up bar, the Atom Maze loading bar and level HUD, the quest rows); the device tier and motion budget (`services/device-profile-core.ts` + `device-profile.ts` over `expo-device`, `useMotionBudget`; `EXPO_PUBLIC_DEVICE_TIER=high|mid|low` forces one), used by Shrodi (frame 0 under 64 dp and when the budget has no idle motion, a 30-step idle on mid), `Burst` (fewer stars, never under four) and the `expo-audio` player cap; and `npm run check:perf` (`scripts/check-perf.mjs`, rules in `scripts/lib/perf-rules.mjs`, ratchet in `scripts/perf-baseline.json`: no new animated style may return a layout key). **Not built:** the runtime tier drop (5.4), the shared Shrodi clock, the typewriter on the UI thread, entrance staggering, the tutorial change and the Reanimated Android flag (a build setting, to A/B in `PERF_AND_SOUND_PASS.md`): each waits for a number. **Next:** the owner runs the passes in `PERF_AND_SOUND_PASS.md` on an Android development build, then the preview APK and the iPhone (Expo Go, `--no-dev --minify`); the numbers decide what phase 2 does and whether the audio-api engine is adopted. Everything below this line that says "hypothesis" is still one until that doc has a number against it. Sections 4.4 and 12 describe what exists; the sets are in `SFX_SETS` and the engine pick is `pickBackend`.
**Written as a spec first:** after a device pass on an Android APK (preview build) and an iPhone in Expo Go (where the app was first developed): the UI and layout held up on Android; three problems were reported (section 1). Every cause in sections 4 and 5 is **a reading of the code, not a measurement**: phase 0 exists to turn each one into a number before anything is rewritten, and a hypothesis that does not show up in the numbers is dropped, not fixed.
**Direction decided 2026-11-21 (owner's research):** the sound engine moves to **react-native-audio-api** (sounds decoded once into memory and replayed through cheap sources, built for many short overlapping effects, with sample-accurate scheduling), **on Android only for now**. It has native code, so it cannot run in Expo Go ([getting started](https://docs.swmansion.com/react-native-audio-api/docs/fundamentals/getting-started/): it needs a development build), and the iPhone can only be tested in Expo Go (no Mac, no Apple developer build). So **iOS stays on `expo-audio`**, hardened by the fixes in 4.4 A, until an iOS build path exists. See 4.4 D. Sources: [expo-audio docs](https://docs.expo.dev/versions/latest/sdk/audio/) (recommend React Native Audio API for advanced control), [expo/expo PR #52389](https://github.com/expo/expo/pull/52389) (proposed guidance for short effects; merge status not checked), [React Native Audio API: why](https://docs.swmansion.com/react-native-audio-api/docs/next/fundamentals/why-react-native-audio-api/). The one thing still open is compatibility with this app's exact versions (Expo SDK 58, RN 0.88), which phase 0 settles with a spike before any code depends on it.
**Owner:** AtomIQ engineering
**Applies to:** `services/sfx.ts`, `services/sfx-core.ts`, `services/media*.ts` (gates), `components/motion/*`, `components/mascot/*`, `components/onboarding/*`, `components/tutorial/*`, `components/lesson/LessonRun.tsx` and the progress bars, `components/celebration/*`, `components/platformer/*`, `app/_layout.tsx`, `package.json` (Reanimated flags), `eas.json`, new check scripts.
**Builds on:** `docs/features/SFX_SPEC.md` (cue catalog, phase 5 "device pass" was never done), `docs/features/SFX_EXPANSION_SPEC.md`, `components/motion/MOTION.md` (project motion rules win over any skill), `docs/features/ONBOARDING_SPEC.md`, `docs/features/TUTORIAL_SPEC.md`, `docs/features/LESSON_CASCADE_SPEC.md`, `docs/critical/MEDIA_POLICY.md`, `docs/qa/ANDROID_RESPONSIVE_UI_UX_SPEC.md`.

## 1. What was reported

| # | Report | Where |
|---|---|---|
| 1 | Some sound effects do not play from time to time. On Android there are more of them, and many effects never play. | Expo Go on iPhone (occasional); Android APK (frequent) |
| 2 | Animation is slower on Android. The onboarding, the opener of the app, takes the biggest drop, and other screens are slower too. | Android APK |
| 3 | The tutorial (Shrodi's tour) is much faster on Android than on the iPhone in Expo Go. | Both |

The goal is not "make Android match the iPhone". It is that **every supported device holds the animation budget in section 3 and plays every cue that the media policy allows**, with the same look and sound the design already has.

### Non-goals

- No redesign. Timelines in the `*-core.ts` files (stamp, option pop, cascade, finish...) keep their numbers. If a fix needs a different way to draw the same motion, the motion looks the same.
- No new sounds, no volume slider (still `SFX_SPEC.md`).
- No iOS-specific or Android-specific features. The fixes are shared; where a number has to differ by device it comes from one table (section 7).
- Not a content or database change. `content.db` is untouched, so nothing here needs a publish.

## 2. Read this first: what each environment can tell you

The three test environments are not equal, and mixing them up is how "Android is slow, iPhone is fine" and "the tutorial is faster on Android" can both be true without anything being wrong in the tutorial.

| Environment | JS | Native | What it is good for |
|---|---|---|---|
| Expo Go on iPhone, `expo start` | **Dev bundle**: React dev mode, unminified, extra checks, dev warnings, source maps. Several times slower JS than a release build. | Expo Go's own binary: every native module of the SDK, but **not** this app's build config, and it shares one process and audio session with Expo Go itself. | Fast iteration. Never a performance verdict. |
| Android preview APK (`eas build -p android --profile preview`) | Release bundle in Hermes, minified, no dev checks. | This app's own build. | The honest picture of a phone. Runs the real native audio and Reanimated paths. |
| Expo Go with a release bundle: `npx expo start --no-dev --minify` | Release-like JS. | Expo Go's binary. | The closest an iPhone gets without a Mac or an Apple developer build. Use it as the iPhone "perf" column. |

So the third report is probably **not a tutorial bug**. The tutorial is the lightest piece of motion in the app: its dim is plain `View`s with transform-only moves (`components/tutorial/Spotlight.tsx`, `tutorial-fx-core.ts`), no SVG and no animated layout. On the iPhone it runs in a dev bundle and polls `measureInWindow` every 100 ms while a control settles. On the APK it runs in a release bundle. Both facts point the same way. Phase 0 checks it with the `--no-dev` column before anything in the tutorial is touched (section 6).

By the same logic, the Android slowdown on the onboarding is **real**, because the Android build is the faster JS environment and it is still slower. That says the cost is not JS speed. It is something the Android build does that the iPhone does not: the native audio players and the way SVG props are updated (sections 4 and 5).

## 3. Budgets and how they are measured

### 3.1 Animation budget

| Measure | Target | Hard floor |
|---|---|---|
| UI-thread frames on a 60 Hz display | 95% of frames within 16.7 ms | 90% |
| On a 90 or 120 Hz display | frames within 11.1 / 8.3 ms for the same share, **or** a documented cap to 60 fps for that effect | no frame over 2x budget during an entrance |
| JS-thread stalls (a frame the JS thread is busy for more than 100 ms) | none during onboarding, a lesson card change, or the lesson map scroll | at most 1 per screen entrance |
| Time to first interactive frame of onboarding after the splash hides | under 1.0 s | 1.5 s |
| Dropped frames in the 3 s "Building your path" step | under 5% | 10% |

Many Android phones run 90 or 120 Hz, so the same code that is smooth at 60 Hz can read as "slower" on a fast screen simply because the frame budget is half. Record the refresh rate of every test device. If the device is 120 Hz and the effect is decorative (an idle loop), capping its update rate is a legitimate fix (section 5.4).

### 3.2 Sound budget

| Measure | Target |
|---|---|
| Cues that the gates allow and the scheduler accepts, and that are then **not heard**, in a scripted run (section 4.2) | 0 on the APK, 0 in Expo Go with the release bundle |
| Start latency, `playSfx` call to first audible sample | under 80 ms for taps, under 150 ms for the rest, measured with a loopback recording or `adb shell dumpsys media.audio_flinger` timestamps |
| Live native players at any time | at most the platform cap in section 7 (a starting value of 24 on Android, 32 on iOS, tuned by phase 0) |
| Audio setup cost on the UI thread at launch | under 50 ms in one slice, never more than one slice per frame |

### 3.3 Test matrix

Run phase 0 and each later acceptance on the same set, so numbers are comparable. Write the device model, OS version, refresh rate and RAM into the result.

| Id | Device | Build | Notes |
|---|---|---|---|
| A1 | The Android phone used in this report | preview APK | The reference. |
| A2 | A low-end Android (3 to 4 GB RAM, 60 Hz) | preview APK | Add one if the project owns or can borrow one; otherwise A1 with "Developer options: animation scale 1x, background process limit: at most 2" is the stand-in. |
| I1 | The iPhone used in this report | Expo Go, `--no-dev --minify` | The perf column. |
| I2 | Same iPhone | Expo Go, dev (`expo start`) | Only to keep the "occasional silent cue" repro, not for timing. |
| A3 | Same Android phone as A1 | Android development build (`eas build --profile development`, or `npx expo run:android` on this machine with the Android SDK), with hot reload | Where the Android sound engine is iterated. Replaces Expo Go for Android work only; it is a dev bundle like I2, so never a timing verdict either. A1 stays the verdict. |

Tools: Android Studio profiler or `adb shell dumpsys gfxinfo com.dostpnri.atomiq framestats` for jank; `adb logcat` for audio errors (section 4.3); the React Native perf monitor (shake menu > "Show Perf Monitor", dev client or Expo Go) for UI and JS FPS; Reanimated's `useFrameCallback` timing probe added in phase 0 (section 3.4) so a number can be taken on any device, including the iPhone.

### 3.4 The measurement kit (phase 0 builds it)

1. **`components/dev/PerfProbe.tsx`**: a dev-only overlay, off by default, opened from the Dev admin button next to the SFX lab (`components/dev/DevAdminFab.tsx`). It runs a `useFrameCallback` on the UI runtime, counts frames over 1.2x and 2x of the display's frame time, and shows UI FPS, JS FPS (a `requestAnimationFrame` counter), the live audio player count and the last 20 cue outcomes (4.2). It reads the display's refresh rate once so the budget in 3.1 is right on 90 and 120 Hz phones.
2. **`services/sfx-diag.ts`** (4.2): the cue outcome log.
3. **A scripted tour** (`docs/qa/PERF_AND_SOUND_PASS.md`, written in phase 0): the exact path to walk on each device, so two people get comparable numbers: cold start to onboarding step 1, the five question pages, "Building your path", the taste lesson, welcome; then Home map scroll, open a lesson preview, three lesson cards of each of two types, finish screen; Shop open and a purchase; Phone > Chats thread; Atom Maze level 1 for 60 s; Myth Buster quick round. Each stop has a stopwatch note, a jank number from the probe, and a "cues heard / cues expected" tally.

## 4. Sound

### 4.1 What the code does today

`services/sfx.ts` keeps **one native `AudioPlayer` per bundled file** (127 files, 138 cues, all 16-bit mono WAV, 7 MB in all), plus extra players for cues whose `pool` is above 1 (`ui.press` 2, `ui.tick` 3, `lesson.star` 3, platformer coin 3, and so on). Players are created through `createAudioPlayer`, kept in a least-recently-used map (`MAX_LIVE_PLAYERS = 64`), and each play reserves a slot, waits for the player to load if it is not loaded, sets volume and rate, rewinds if needed, and calls `play()`. After the play ends it pauses and `seekTo(0)` in the background so the next play is instant.

At launch, `initializeSfx()` (called from the root effect in `app/_layout.tsx`) warms **every file of `ui` (29) and `lesson` (15)**, three at a time every 16 ms. Entering Phone, Myth Buster, the platformer and others warms more. A native player is not a small object, and what it costs depends on the platform:

- **Android (expo-audio, Media3 ExoPlayer).** From the library source in `node_modules/expo-audio/android`: each `AudioPlayer` builds its own `ExoPlayer` **on the main looper** (`setLooper(context.mainLooper)`), builds its own **`MediaSession`** in the constructor (`buildBasicMediaSession`), starts a **coroutine that wakes every `updateInterval` ms** (default 500 ms) for as long as the player lives, and listens for the audio becoming noisy. Every command (`prepare`, `play`, `pause`, `seekTo`, `volume`, `setPlaybackRate`) therefore runs on the Android main thread, which is also the **thread that Reanimated and the UI render on**. Each ExoPlayer that has prepared a PCM source also holds an `AudioTrack`, and Android limits the number of tracks a process (and the mixer) can hold at once.
- **iOS (expo-audio, AVPlayer).** One `AVPlayer` per file as well, with an audio session shared with Expo Go while testing there.

### 4.2 Step one is to find out why a cue is silent

A cue can fail to be heard for six different reasons, and today they all look the same ("it did not play"). Some of them are not faults at all:

| Reason | Where | A fault? |
|---|---|---|
| Gate: Sound Effects off, route policy, screen reader, Read Aloud speaking, app in background | `canPlayCue` in `media-core.ts` | No, by design |
| Scheduler: `gap` (same cue too soon), `burst` (more than 6 starts in 100 ms for `voice` and `tap`), `duck` (a `voice` cue while a stinger plays) | `createSfxScheduler` | No, by design, but the numbers may be too aggressive; see below |
| Load timeout: the player was evicted or never warmed, `whenLoaded` waited 1.5 s and `play()` was then dropped | `whenLoaded` | **Yes** |
| Native refusal: `createAudioPlayer` or `play()` threw (out of tracks, out of sessions) | the `catch` in `playSfx` logs a `console.warn` only | **Yes** |
| Stale slot: a play was overtaken (`gen`), the rewind raced the next play, or the player finished and ignored a second `play()` | `rewindLater`, `slot.rewound` | **Yes** |
| Evicted while reserved: the least-recently-used walk removed a player another cue still needed | `evictIfNeeded` | **Yes** |

**Phase 0 adds `services/sfx-diag.ts`**: a ring buffer of the last 200 cue outcomes, `{ cue, at, outcome }` where outcome is one of `played`, `gate:<reason>`, `skip:gap|burst|duck`, `late:<ms>` (the player had to load first), `lost:load-timeout`, `error:<message>`, `evicted`, plus counters per outcome and the live player count. It costs one array push per call and is compiled in always; the overlay shows it. `playSfx` already returns early in each of these branches, so the change is writing one line at each. Add `npm run test:sfx` cases that run the scheduler over a fixed burst and assert the reasons.

The scripted run (3.3) then ends with a table: cues expected from the script, cues heard, and every miss attributed to a reason. **The fix list in 4.4 is ordered by what that table shows**, not by the order below.

### 4.3 Likely causes, with how to confirm each

| # | Hypothesis | Why it fits | Confirm with |
|---|---|---|---|
| S1 | **Too many native players alive on Android.** 44 are created at launch and more as screens warm their groups, up to 64, each an ExoPlayer with its own session and (once prepared) an `AudioTrack`. Past the device's limit, new players or new tracks fail and `play()` is dropped. This matches "more files work on iPhone, fewer on Android, and it gets worse the further into the app" and the user's remark that the number of broken sounds *increases* on Android. | Source above; the player count is unbounded by anything except `MAX_LIVE_PLAYERS`. | `adb logcat -s AudioTrack AudioFlinger ExoPlayerImpl MediaSessionService` while walking the script; look for `createTrack_l`, `status -12`, `could not create track`, or a drop in sound after player count passes N. Sweep `MAX_LIVE_PLAYERS` at 64, 32, 24, 16 and chart "cues lost" against it (use `mcp__easel__chart` or the probe's CSV export). |
| S2 | **Eviction fights warming.** The warm step creates a player per file in a group and calls `evictIfNeeded`, which removes the least recently used file. With 44 launch files plus a group warm, the first files used in a screen can be exactly the ones just evicted, so `play()` hits a player that is not loaded yet (`late` or `lost:load-timeout`). | `warmFiles` and `evictIfNeeded` both live in `sfx.ts`; `pinSfx` exists as a patch for one such case (the finish jingle). | The `late:` and `lost:` counters in 4.2. |
| S3 | **Main-thread contention.** All player work runs on the Android main thread. Warming 44 players while the onboarding's entrance animations run, and a pause and a `seekTo(0)` after every play, take time from the thread that draws. A busy main thread delays both the sound and the frame, so a sound can arrive late enough to feel missing, and an animation can hitch exactly when a sound starts. | Same thread as Reanimated's UI work. | Probe: UI frame time spikes that line up with `playSfx` calls and with warm steps; Android Studio profiler "System trace" on `main`. |
| S4 | **Periodic wake-ups.** Every live player runs an `updateInterval` coroutine (default 500 ms), 64 of them waking twice a second to do nothing. | Source above. | Count wake-ups in a trace. Cheap to fix whether or not it matters (4.4). |
| S5 | **Rewind races.** The post-play `pause()` + `seekTo(0)` runs on a timer; a second play that lands between the end and the rewind takes the `await seekTo(0)` path, which adds a delay on the main thread. A finished player that gets `play()` without a seek can stay silent. | `rewindLater`, `slot.rewound`. | `late:` counter, and a stress cue (`ui.press` 10 times in 600 ms). |
| S6 | **Expo Go on iPhone: shared audio session and AVPlayer limits.** Expo Go is one process for many apps' worth of modules; the audio session is set once and can be interrupted (a call, Siri, another app). AVPlayer instances in large numbers can also be refused. This is the "occasional" case. | Reported as occasional rather than constant, and at lower rate than Android. | Reproduce on I2 and I1: if it vanishes on I1 (release JS) it is timing; if it stays, it is the session. Log `AppState` changes and `setAudioModeAsync` results in `sfx-diag`. |
| S7 | **The global press handler is probably a no-op.** `installGlobalUiSfxHandlers` sets `Pressable.defaultProps.onPressIn`. React 19 (this app is on 19.3) no longer reads `defaultProps` for function components, and RN 0.88's `Pressable` is a function component wrapped in `memo`. The buttons that do click have their own `playSfx("ui.press")` (`components/ui/button.tsx`, `icon-button.tsx`, `pressable-icon-button.tsx`, `lesson/TextButton.tsx`). That means **a plain `Pressable` anywhere else is silent**, and the comment in the code ("every Pressable clicks") is not true. | `grep -n defaultProps node_modules/react-native/Libraries/Components/Pressable/Pressable.js` finds nothing. | Press a bare `Pressable` in the dev build with the diag overlay open: no `ui.press` row appears. |
| S8 | **Scheduler numbers may be too tight.** `gap` is per cue and some are long (stingers 800 ms; `chat.end` 500; `ui.shop-open` 500). A repeat inside the window is dropped without a trace today. | `CUES` in `sfx-core.ts`. | `skip:gap` counts per cue after the scripted run; raise a cue's gap only where the repeat was a fault, not a double tap. |

### 4.4 Fixes, in the order to try them

Each step is shippable on its own and each is judged by the 4.2 table.

**How the steps fit together now.** D (the new engine) is the main fix for Android and for the "player per file" design. A, B and C are not wasted by it: **B and C are engine-independent and always apply; A is what `expo-audio` needs, and `expo-audio` is the iPhone's engine for the foreseeable future** (the iPhone can only run Expo Go, where the occasional silent cue was seen), so A is a permanent part of the plan, not a stopgap, and its warm-by-screen **sets** are reused by the new engine to decide which files are decoded when.

**A. Make the player count small and honest (the fallback engine: works everywhere, including Expo Go).**
1. Replace the single `MAX_LIVE_PLAYERS = 64` with a per-platform cap from the device table (section 7), starting at **24 on Android and 32 on iOS**, and enforce it before creating a player, not after (`evictIfNeeded` runs after the new one exists today, so the peak is always cap + 1).
2. **Stop warming whole groups at launch.** `initializeSfx` warms only a small **core set** that every screen needs in its first seconds (`ui.press`, `ui.tab`, `ui.select`, `ui.cancel`, `ui.modal-open`, `ui.modal-close`, `lesson.answer-correct`, `lesson.answer-wrong`, `reward.pop`, `reward.coin`, `lesson.whoosh`, `lesson.bubble`'s file, `lesson.blip`; about a dozen files), and does it **after the first onboarding frame** (`InteractionManager.runAfterInteractions` plus a 300 ms floor), not in the root effect while the splash is still hiding.
3. **Warm by screen, release by screen.** Replace `warmSfxGroup("phone")` and friends with named **sets** in `sfx-core.ts` (`SFX_SETS`: `core`, `onboarding`, `lesson-run`, `finish`, `shop`, `phone`, `chat`, `scanner`, `camera`, `platformer-<ground>`, `mythbuster`, `quests`), each a list of cues. A screen calls `useSfxSet("lesson-run")` (a hook next to `use-cascade-sfx.ts`): on mount it warms the set a few files per tick, on unmount it marks the set's files evictable, never removes them at once (the next screen may use the same file). The platformer already does this by cue (`warmSfxCues`), so it becomes one set per ground instead of the full list.
4. **`updateInterval` to its largest sensible value** on every effect player: `createAudioPlayer(source, { updateInterval: 60_000 })`. The code only needs `isLoaded`, `playing` and the load event, none of which depend on the interval, so this removes S4 in one line. Verify `playbackStatusUpdate` still fires on load and on end after the change (it is event-driven for state changes; the interval only drives the position tick).
5. **`keepAudioSessionActive: true`** on effect players (a short cue should not tear the iOS session or the Android focus up and down for every play), and set the audio mode once (already done).
6. **No work on the main thread that can wait.** Move the post-play `pause + seekTo(0)` to one batched pass per 250 ms for all finished slots instead of one timer per play. For files shorter than 80 ms (taps, ticks, swatch) skip the rewind and let `pickSlot` take the "free but needs a seek" path only when the pool is exhausted, because a 53 ms file that is replayed sounds the same whether or not it was rewound first if the seek is done before `play()` and awaited (measure first; if the seek is the late part, keep the rewind for these).
7. **One load path, no silent drops.** If `whenLoaded` times out, do not call `play()` on a player that never loaded: record `lost:load-timeout`, drop the player from the pool (so the next play makes a fresh one), and retry the play once. A cue that is late by 200 ms is better than one that is lost; one that arrives 1.5 s late (a stinger after the moment) is worse than none, so a retry is only for cues in the `feedback`, `tap`, `reward` and `panel` categories and never for `stinger` or `voice`.

**B. Remove the thing that does not work.** Delete `installGlobalUiSfxHandlers` and its call (S7). Add `check:sfx` rule: a file under `app/` or `components/` that uses `Pressable` or `TouchableOpacity` from `react-native` for something that looks like a button either imports `Button`, `IconButton`, `PressableIconButton`, `TextButton` or calls `playSfx` in the same file (heuristic, warning first). Decide with the owner whether a bare `Pressable` should click; if yes, the click goes into a `ui/` wrapper component (`SfxPressable`), not into a global patch.

**C. Tune the scheduler from data.** Read `skip:gap` and `skip:burst` from the script table. Where a legitimate rapid repeat was dropped (for example `lesson.pick` and `lesson.drop` with gap 60 in a fast sort), lower the gap; where a double fire was real, keep it. Every change is one number in `CUES`, covered by `test:sfx`.

**D. The primary engine: React Native Audio API behind the same API (direction decided, gated by the phase 0 spike).** `playSfx(cue, options)` and everything above it (catalog, gates, scheduler, cascade and stamp timelines, 244 call sites) stay as they are. The runtime is split into a `SfxBackend` interface (`load(file)`, `play(file, { volume, rate })`, `stop(file)`, `release(file)`, `liveCount()`), and `sfx.ts` picks one at start:
   - `ExpoAudioBackend`: today's code, after A.
   - `AudioApiBackend`: **react-native-audio-api** (Software Mansion): one `AudioContext`, every file decoded once into an in-memory `AudioBuffer` (7 MB of WAV is about 14 MB decoded as floats; keep a memory budget of 32 MB and decode by set, section 4.4 A step 3), one cheap `AudioBufferSourceNode` per play, any number of overlapping plays, a `GainNode` per category for volume (so ducking a `voice` cue under a stinger becomes a gain ramp, not a skipped cue), `playbackRate` for the pitch ladders, no per-file player, no per-file session, no per-play seek or rewind, no `updateInterval` loops, and none of the main-thread player commands behind S3 and S5. Two things it adds that the design already wanted: **plays can be scheduled** (`start(when)`, sample-accurate), so a cue can be placed on the frame of its animation instead of fired from a `setTimeout` (principle 3 of `SFX_SPEC.md`), and the "late" and "lost" failure modes of 4.2 mostly disappear because a buffer in memory has nothing to load. It needs a dev or preview build, so it is **not available in Expo Go**. The picker is **explicit, not "whatever is installed"**: `AudioApiBackend` only when `Platform.OS === "android"` and the native module loads; everything else, including every iPhone and Expo Go on either platform, gets `ExpoAudioBackend`. A `require` that fails never leaves the app silent. **Spike first (phase 0, a day, on a throwaway branch and a preview APK on A1).** Pass all of these or the direction is revisited: (1) it installs and builds on Expo SDK 58, RN 0.88, the new architecture and React 19.3, with Reanimated 4.7 still happy (its docs say `react-native-worklets` is only required for its worklet nodes, which this app does not use, so there should be no conflict with worklets 0.13; confirm the build and a run of the onboarding); (2) one decoded WAV plays, 30 overlapping plays of it and 20 different files at once play without dropouts or a frame over 2x budget; (3) pitch: `playbackRate` changes pitch with no time stretch, matching what `shouldCorrectPitch = false` gives today (the pitch ladders, `chat.incoming` at 1.5 and `lesson.bubble` at 0.85 depend on it); (4) audio session: it mixes with other apps (the `mixWithOthers` behaviour effects have today), plays with the iOS silent switch on, never records, and does not play in the background; (5) **permissions**: its Expo config plugin is optional and its microphone entries are only needed for the recorder, which this app does not use, so install it without the plugin (or with no recorder options) and read the generated manifest: no microphone, foreground-service or background-audio entry may appear; `test:legal` and `check:phone` assert the permission list and must still pass; (6) start latency under the 3.2 budget, measured the same way as the other engine; (7) decoding all 127 files takes under the launch budget when done by set and off the UI thread, and peak memory stays under the 32 MB budget on A2. The spike is **Android only** (an A3 development build, then an A1 preview APK for the verdict); it cannot be run on the iPhone, and no iOS result is required for it to pass. Record the package version, its size added to the APK and its licence in `docs/qa/PERF_AND_SOUND_PASS.md`.
   - A custom Android `SoundPool` module is the third option and the most work; only if the spike fails.
   **Rollout of D.** (1) `SfxBackend` interface and `ExpoAudioBackend` first, a pure refactor with no behaviour change and `test:sfx` green; (2) `AudioApiBackend` behind the explicit Android-only pick above (everything else: `ExpoAudioBackend` with step A's cap); (3) a Settings > developer switch and an `ATOMIQ_SFX_BACKEND=expo-audio|audio-api` build override so either engine can be forced for an A/B on the same device with the same script; (4) the audio-api engine becomes the default **for Android** preview and production builds once 4.5 passes on A1 with it. **iOS keeps `expo-audio` in every build**, including a future App Store build, until an iOS build can be tested on a real iPhone with the new engine; shipping an engine to iPhones that was never heard on one is not allowed. Revisit when an Apple developer account and an iOS development build exist (question 3). **Decision gate:** if the spike fails a numbered item, or the A/B on A1 shows no gain in cues heard and frame time over `ExpoAudioBackend` after A to C, stop at A to C and record why.

### 4.5 Sound acceptance

- 4.2 table shows 0 unexplained misses on A1 and I1 for the scripted run, twice in a row, **with each engine** (audio-api on the APK; expo-audio in Expo Go and as the forced fallback on A1).
- `SfxBackend` has one shared conformance test in `scripts/test-sfx.mjs` (a fake backend run through the same plan: gate, schedule, play, stop, release) so the two engines cannot drift apart in behaviour.
- A stress run (the same 10 cues fired 20 times in 2 s) loses nothing that the scheduler did not drop on purpose, and no frame over 2x budget.
- `test:sfx` covers the new cap, the set warm/release rules (in the framework-free core: `SFX_SETS` are data and the plan of which players to keep is a pure function) and the diag counters.
- `check:sfx` passes, plus the new rule from B.

## 5. Animation performance

### 5.1 What the onboarding actually runs

The onboarding is the heaviest first impression the app has, and Android is where it hurts. Per page it mounts: one or two **Shrodi** figures (three stacked `Svg` layers, **12 shapes updated per frame** with `useAnimatedProps` for path data, circle centres and opacity, on a **never-ending loop clock**), a speech bubble whose text **types by a JS `setInterval` and `setState`** (`components/lesson/TypedText.tsx`), an **entering** animation on each of the title, character, bubble and every option (`cascade-fx.ts`), a **progress bar animated by `width`** (`OnboardingBar.tsx`), and, on step one, a drifting sky and twinkling sparkles. "Building your path" adds a second `width`-animated bar, three ticks with rings and a `Burst`. And every sound on that screen is going through the player pool described in section 4, on the same main thread. Hello is unmounted after Get started (`app/onboarding.tsx`), so its loops do not keep running under the questions; that was checked.

### 5.2 Hypotheses, ranked by how likely they explain the report

| # | Hypothesis | Evidence in code | Confirm with |
|---|---|---|---|
| P1 | **Audio setup and playback share the UI thread with animation** (section 4, S3). The onboarding is exactly where launch-time warming and the first cue bursts land. | `initializeSfx` in the root effect; ExoPlayer on `mainLooper`. | Comment out `initializeSfx` and the warm steps in a local build; if onboarding jank drops sharply this is the largest single cause and phase 1 fixes most of it with no animation change. |
| P2 | **Animated SVG props are expensive on Android.** `useAnimatedProps` on `react-native-svg` shapes does not use the fast path that transforms and opacity use. With `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: false` (the default in `react-native-reanimated/src/featureFlags/staticFlags.json`), every changed prop goes through a shadow-tree commit per frame. Shrodi does that for 12 shapes per instance, per frame, for as long as he is on screen, and he is on screen on nearly every onboarding page and in lessons, chats and the feed. | `components/mascot/Shrodi.tsx` (`MovingShape`); `shrodi-art.ts` has 12 `dyn:` nodes. The project already hit the same wall with Lottie and baked it to sprite sheets (`SpriteSheet.tsx`). | Probe on A1: onboarding page with Shrodi `live={false}` against `live`. Then A/B the Reanimated flag (5.3, step 1). |
| P3 | **Animating layout properties.** Five bars animate `width: "%"`: `OnboardingBar`, `PlanStep`, `LessonRun`'s progress, `LevelUpBody`, the platformer `LoadingScreen`. A `width` change is a Yoga layout pass and a native measure on every frame, on Android worse than on iOS. | `grep -rn 'width: `' components` finds exactly those. | Probe: bar animating alone on a blank screen. |
| P4 | **Too many simultaneous entering animations on mount.** 174 `entering`, `exiting` and `layout` props across the app; onboarding pages start four to eight at once, each a Reanimated layout-animation (separate path from `useAnimatedStyle`). | `cascade-fx.ts`, `ShrodiSays.tsx`, `ChoiceStep.tsx`. | Probe the first 700 ms of a question page. |
| P5 | **The typewriter re-renders the bubble from JS every tick.** On a phone with a busy main thread (P1) the JS thread competes with the UI one, so typing and the entrance stutter together. | `TypedText.tsx`: `setInterval` + `setCount`. | JS FPS in the probe while typing. |
| P6 | **A 90 or 120 Hz screen halves the frame budget** and exposes every cost above. | A1's refresh rate, unknown. | Record it (3.3). |
| P7 | **React Compiler and dev tooling on a release build** are not a problem expected here, but an APK built from the wrong profile (a debug-signed dev client) would explain everything. | `eas.json`: `preview` has no `developmentClient`, so it is a release build. | Confirm A1 was installed from `preview` and `adb shell` `run-as` is refused (a debuggable APK would allow it). |

### 5.3 Fixes, in the order to try them (each is measured, then kept or reverted)

1. **Reanimated feature flags (a build setting, no code).** Reanimated 4 reads static flags from `package.json` (`"reanimated": { "staticFeatureFlags": { ... } }`; check the exact key against the 4.7 docs before editing). Build a preview APK with `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: true` and compare P2 on A1. If it helps with no visual or touch regressions, keep it, and note that it is a build-time flag, so it needs a native rebuild and is invisible in Expo Go. Do not change `DISABLE_COMMIT_PAUSING_MECHANISM` without a reason from the numbers.
2. **Audio first (section 4.4 A, steps 1 to 4)**, because it is the cheapest and may be the largest.
3. **Bars: one shared `ProgressFill`** (`components/ui/progress-fill.tsx`) that never animates `width`. It draws a full-width fill clipped by the track (`overflow: "hidden"`, track radius) and moves it with `translateX` from `-(1 - value) * width` (measured once with `onLayout`), so the bar is a transform and the rounded ends stay round. All five call sites switch to it; the `*-core.ts` curves that give the value are untouched. A snapshot-style test pins that the maths gives the same visible width at 0, 0.5 and 1 for a few track widths.
4. **Shrodi: make the idle cheap, keep the moods.** In this order, stopping when the numbers are good:
   1. **Drop the idle update rate.** Quantise the loop clock to 30 steps a second for the shape updates (`stepped()` already exists in `world-fx-core.ts` for the platformer's drifting decorations) while moods keep gliding at full rate through the pose value; blinks and glances at 30 fps are not visible as steps. Cap by device (section 7): 60 on `high`, 30 on `mid` and `low`.
   2. **Move what can move to transforms.** Anything that only translates, rotates or scales (the tail, ears, paws) becomes a native-driven `Animated.View` layer like the body and head already are; keep `useAnimatedProps` only for what genuinely changes shape (eyelids, mouth). Target: 4 animated shapes per Shrodi, down from 12.
   3. **One loop for all Shrodis on a screen.** Several instances share one clock (a `ShrodiClockProvider` per screen) instead of one `withRepeat` each.
   4. **Static by default when off the main moment.** `live` defaults to `false` for Shrodi in lists and small avatars (chat heads, feed posts, contacts); only the hero Shrodis (Hello, question pages, finish, tutorial) animate. Sizes under 64 dp never animate.
   5. **Last resort: bake it.** Render the idle loop and each mood to a sprite sheet the way the chest was (`scripts/bake-lottie-sprites.mjs`, `sprite-core.ts`, `SpriteSheet.tsx`) and play that. It loses the mood glides unless each mood pair is baked, so only do it if 1 to 4 still miss the budget on A2.
5. **Typewriter on the UI thread.** Show text with a masked reveal driven by a shared value (a `width` or `translate` mask over the full laid-out text, no JS tick), keeping `typewriter-core.ts` as the timeline source. It also removes the layout jump when a line wraps mid-typing. Only if P5 shows up in the JS FPS numbers.
6. **Entrance cost.** Cascade one thing per frame is a visual choice, but mounting them in one frame is not: stagger the **mount** (not the animation) of off-screen option rows below the first four, and use `useAnimatedStyle` driven by one shared clock per page (`useDelayedClock` already exists) instead of a layout animation per element, where the page has more than five. Do this page by page, starting with the five onboarding question pages and the lesson item card, and only where the probe shows the first 700 ms over budget.
7. **Stop work off screen.** Anything that loops (Shrodi, SceneFigure `motion`, AppIcon badges, the sky) already freezes when the screen is not focused (`useIsFocused`) or with reduced motion. Extend the same rule to **covered but still focused** (a modal open on top, the feedback sheet in a lesson, the tutorial dim up): a `useAnimationsPaused()` hook that reads the modal/overlay count already tracked for the tutorial (`useTutorialBusy`) and the app state.
8. **Platformer and the other game loops** (`app/explorer/platformer.tsx`, Myth Buster): they step a core on a `requestAnimationFrame` clock and write one array shared value per frame; that design is good. Only measure them in phase 0 and fix what the numbers show (the first suspects are the number of sprites the array drives per frame on A2 and the `Burst` particle counts). No change is proposed without a number.

### 5.4 One rule for decorative loops

Idle and decorative motion (sky clouds, sparkles, Shrodi's breathing, the "More below" bob) must **cost nothing when it would be dropped anyway**. A shared `useMotionBudget()` returns `{ idleFps: 60 | 30 | 0, maxParticles }` from the device tier (section 7) and from a runtime check: if the probe-style frame callback sees more than 15% of frames over 2x budget for 2 s, it drops one tier for the rest of the session (60 to 30 to 0) and stops, rather than fighting. Event motion (an answer pop, a stamp, a claim) is never throttled by the budget: it is short, it carries meaning, and it is already in the cores with reduced motion as its only off-switch.

### 5.5 Animation acceptance

- Onboarding on A1: 3.1 budgets met for every page; "Building your path" under 5% dropped frames.
- Lesson card change, finish screen, Home map scroll, Shop, level-up dialog on A1: no frame over 2x budget during an entrance, 90% within budget.
- A2 (or the stand-in): no page below the hard floor.
- The look is unchanged: the existing option-pop, stamp, cascade and stat-reveal core tests still pass with no number changed (`test:option-pop`, `test:stamp`, `test:stat-reveal`, `test:onboarding`, `test:celebration`, `test:burst`, `test:mascot`).
- Reduced motion still shows the final frame everywhere.

### 5.6 The learner's animation level (built 2026-11-21, unseen on a device)

The first Android reports (docs/qa/PERF_AND_SOUND_PASS.md §6) showed the app over its frame budget on every screen while the iPhone was fine, so the learner gets a switch, **Settings > Animations**, with three levels. **Max is the app as it was** and nothing in it changed.

| Level | What plays | What does not |
|---|---|---|
| Max | everything, as designed (the device tier may still thin idle loops and bursts on a slow phone, §7) | |
| Reduced | every moment the learner causes: a pop, a stamp, a sheet sliding in, a claim, a page settling | anything that runs on its own: idle life (Shrodi, teachers, scene figures, fireflies, clouds), loops (shine sweeps, the chest glow, bobbing cues, twinkles, the rays of a level-up); bursts throw half their particles |
| Disabled | nothing moves: every moment is simply there (the existing reduced-motion paths) | all of it |

A phone the tier calls `low` starts on Reduced; every other phone starts on Max; a choice always wins. The system's own "reduce motion" setting wins over the level and acts as Disabled. Sound and haptics are not part of the level.

How it is built, so it can be kept: pure rules in `components/motion/motion-level-core.ts` (`test:motion-level`); the saved choice in `services/motion-level.ts`; two hooks in `components/motion/use-reduced-motion.ts` that replace Reanimated's `useReducedMotion` everywhere (that one reads only the system setting, once, so it can never see the level): `useReducedMotion()` is "every animation off" (Disabled or system) and `useIdleStill()` is "nothing on its own" (Reduced, Disabled or system). `useLoopClock` and `useMotionBudget` apply the level themselves; the loops that do not use them (`ScrollCue`, `Sparkles`, `ShineSweep`, `StatTile` shine, `ChestCard` nudge, `ColorSwatches`, `DailyFactCard`, `BuildAnAtomLab` spin) call `useIdleStill()`. At Disabled the root layout also mounts Reanimated's `ReducedMotionConfig`, which switches off the animations that follow the system setting (layout animations, `withTiming`). `npm run check:perf` fails on an import of Reanimated's `useReducedMotion`. **Not yet done:** judging what Reduced saves on a device (the probe, same walk, once per level), and tuning Reduced further (shorter page cascades, fewer simultaneous entering animations) if its numbers are not enough.

**The tour has no animation at all** (the same day): the dim, the hole, the pointing hand and Shrodi's bubble are simply there; see TUTORIAL_SPEC.md.

### 5.6b The animation page in onboarding (built 2026-11-21, unseen on a device)

A new learner on a slow phone is asked about animation before anything else: `speed`, right after Hello (`SpeedStep.tsx`; rules `speedAdvice` in `onboarding-core.ts`, `test:onboarding`). It shows only when the device tier is `mid` (Reduced recommended) or `low` (Disabled recommended); `high` (every iPhone, a strong Android) and a learner whose animation is already off never see it, and the choice is made once, when onboarding opens. The three levels are the lesson's option rows with the recommended one picked; Continue keeps the pick, a tap applies and saves it at once (the same store as Settings > Animations, so the crash prompt and Settings agree). The page is deliberately still. To see it on an iPhone or a fast Android: turn on the perf probe's "Onboarding animation page" switch (or set `EXPO_PUBLIC_DEVICE_TIER=mid`/`low`), then reach onboarding again with Settings > Delete Account.

### 5.7 The crash prompt (built 2026-11-21, unseen on a device)

**Is the level automatic?** Only at the very first start, and only by device tier: Max everywhere, except a phone the app rates `low` (memory under 3.5 GB, Android 8 or older, or an old year class), which starts on Reduced. After that the learner's choice (Settings > Animations) wins. Nothing adapts while the app runs.

**After a crash it asks.** A JavaScript app cannot see its own crash, so a flag is kept (`crash-guard-core.ts`): true while the app is in front, false once it goes to the background. Leaving the usual ways (swipe away, back, the system tidying up in the background) goes through the background first, so those are not crashes; a start that finds the flag still true is one (a native crash, the system killing it for memory in front, a freeze that was force-closed). Then `CrashPrompt` shows a moment after start, once per crash: **Reduced** is recommended after a first crash on Max; **Disabled** after two in two weeks or when Reduced did not hold; nothing once Disabled. Any answer, and the X, mark that crash answered, so it is never asked twice. It limits itself to animation because that is the one setting that lightens a struggling phone. Known limit: a force-stop of a frozen app while it is still in front looks the same as a crash (it is one, to the learner). A development build cannot tell a reload from a crash, so it ignores the flag; the perf probe has a "Pretend the app crashed" button, and `EXPO_PUBLIC_CRASH_PROMPT=1` turns real detection on in dev.

## 6. The tutorial (report 3)

Not a defect to fix on Android. What to do:

1. **Verify the cause** with the I1 column: run the tour in Expo Go with `--no-dev --minify`. If the iPhone is then comparable to Android, the report was the dev bundle and nothing in the tutorial changes.
2. **If the iPhone is still slow in release JS**, the two costs to look at are the 100 ms `measureInWindow` poll while a control settles (`TUTORIAL_FX.pollMs` in `tutorial-fx-core.ts`; `TutorialLayer.tsx` loops `measureTarget` on a timer) and the crossfade of two screen-sized bordered dims. Cheaper options, in order: measure on layout events and on `focus` instead of on a timer (`onLayout` of the target plus one measure after it settles, with the timer kept only as a fallback for scrolled content); raise `pollMs` to 200 and `restPollMs` to 1000; render the dim from a single pre-rendered `View` and move the hole by transform (the file header already notes why not to animate size or place).
3. The tutorial stays the **reference for what cheap motion looks like**: Views, transforms and opacity only. New motion in the app is reviewed against it (section 8).
4. The tour also drives sound (`reward.pop` and the hand): it benefits from section 4 with no change of its own.

## 7. One table for per-device numbers

New `services/device-profile.ts` (framework-free `device-profile-core.ts` for the decisions, `test:device-profile`): returns a tier from facts the app can read without new permissions: `Platform.OS`, `Platform.Version`, `expo-device`'s `totalMemory` and `deviceYearClass` if `expo-device` is already a dependency (check; otherwise use `Platform.constants` and the measured frame rate, not a new package), the display refresh rate read once from the probe, and a running jank measurement (5.4).

| Tier | Rule of thumb | `maxLivePlayers` | `idleFps` | `maxParticles` | Notes |
|---|---|---|---|---|---|
| high | iOS, or Android with 6 GB or more and a recent year class | 32 | 60 | full | |
| mid | Android 4 to 6 GB | 24 | 30 | 75% | default for Android until measured |
| low | Android under 4 GB, or the session dropped a tier | 16 | 0 (static idle) | 50% | |

The tier **never changes the design**; it changes only these three numbers. Reduced motion (the OS setting) still wins over every tier and is not a tier. The values above are starting points: phase 0 and 1 replace them with measured ones.

## 8. Keeping it fixed: gates and rules

- **`npm run check:perf`** (new, `scripts/check-perf.mjs`, fails the build): no `useAnimatedStyle` or `useAnimatedProps` returning `width`, `height`, `top`, `left`, `margin*` or `padding*` outside an allow-list (with a one-line reason, the way `FILE_EXCEPTIONS` works in `check-theme-colors.mjs`); no new `createAudioPlayer` or `expo-audio` import outside `services/sfx.ts` and `services/media.ts` (already in `check:sfx`, kept); no `warmSfxGroup` call with a group name in `app/` (screens use sets); no `withRepeat(..., -1)` or `useLoopClock` in a component without a `live`/focus gate in the same file (heuristic, warning).
- **`MOTION.md` gets a "what it costs" page**: transforms and opacity are free, `useAnimatedProps` on SVG is not, layout properties are not, particles and entering animations are counted per screen. Every new motion spec (`duolingo-motion-style` output) states which of those it uses.
- **Every spec that adds a sound** (`SFX_EXPANSION_SPEC.md` style) names its set (`SFX_SETS`), so a new cue cannot be left out of the warm plan.
- **Acceptance per release**: the scripted run on A1 and I1, results filed in `docs/qa/PERF_AND_SOUND_PASS.md` (one dated section per run, with the 4.2 table and the 3.1 numbers). Added to "Before handing off" in `CLAUDE.md` once phase 1 lands: `check:perf`, `test:sfx`, `test:device-profile`.

## 9. Plan

Phases are ordered so that the cheap, high-evidence work comes first and nothing is rebuilt on a guess. Each phase ends with a preview APK run on A1 and the I1 run.

| Phase | Work | Output | Done when |
|---|---|---|---|
| **0. Measure** | `PerfProbe`, `sfx-diag`, the scripted tour doc, a stress cue script, frame-rate and device facts of A1/A2/I1; logcat capture for S1; the two cheap A/B switches (no `initializeSfx`; `live={false}` on Shrodi) as local builds only; `MAX_LIVE_PLAYERS` sweep. **In parallel: the react-native-audio-api spike (4.4 D) on a throwaway branch and preview APK.** | `docs/qa/PERF_AND_SOUND_PASS.md` with a first baseline: cue-outcome table, jank per screen, ranked causes, and the spike's pass or fail per numbered item. Hypotheses P1 to P7 and S1 to S8 each marked confirmed, refuted or not tested. | The ranked cause list exists with numbers, the spike has a go or no-go, and 4.4 and 5.3 are reordered to match. |
| **1. Sound and the main thread** | If the spike passed: `SfxBackend` interface and `ExpoAudioBackend` refactor, `AudioApiBackend`, runtime pick and the A/B switch (4.4 D), scheduled plays for the animation-bound cues. Always: 4.4 B (remove the global handler), C (scheduler from data), and A (cap, core set after first frame, sets, update interval, load path) for the fallback engine. Reanimated flag A/B (5.3 step 1). | `SFX_SETS`, `useSfxSet`, the backend files under `services/`, changes in the call sites that warmed groups; `test:sfx` extended with the conformance test. | 4.5 met on A1 and I1 with each engine; onboarding jank re-measured (this alone may close most of report 2). |
| **2. The cheap animation wins** | `ProgressFill` and its five call sites; Shrodi quantised idle, transform layers, shared clock, static-by-default in lists; `useMotionBudget`, `device-profile`. | `components/ui/progress-fill.tsx`, `components/motion/use-motion-budget.ts`, `services/device-profile*.ts`; `check:perf`. | 5.5 met on A1 for onboarding and lessons. |
| **3. Only if needed** | Typewriter on the UI thread; entrance staggering; tutorial measuring on layout (section 6); Shrodi sprite bake. | One PR per item, each justified by a number from phase 0 to 2 that is still over budget. | Each item's number is under budget, or the item is dropped with the reason written down. |
| **4. Lock it in** | `MOTION.md` cost page, `CLAUDE.md` handoff list, QA doc template, results on A1/A2/I1 filed. | | The pass is repeatable by someone who did not write it. |

Estimated effort (one engineer who knows the code): phase 0 about 2 days, phase 1 about 3, phase 2 about 3, phase 3 per item 1 to 3 days, phase 4 half a day. Phase 1 and phase 2 can run in parallel after phase 0 if the sound and animation work are split, because they touch different files except `Shrodi.tsx` and the root layout.

## 10. Risks

- **Fewer live players means an occasional first play is late** (a player created on demand loads first). Mitigation: the core set stays warm, sets warm before their screen's first sound (on route entry, not on first use), and `late:` is visible in the diag so a cue that is always late is added to its screen's set.
- **`ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`** changes how prop updates reach the native view, and it is still marked experimental in Reanimated; it can break touch hit areas or flicker with some libraries. It ships only after a pass of the whole script on A1 and a clean `check` of the tutorial's touch holes (they depend on measuring and hit areas).
- **`react-native-audio-api`** is a new native dependency and cannot run in Expo Go, so **Android and iPhone will run different engines** and behave slightly differently (timing, pitch rounding, ducking by gain versus by skipping); a sound bug can be real on one platform and absent on the other, and the iPhone side is only ever heard in Expo Go. Android work also moves from Expo Go to a development build (A3), which is a one-time setup and a rebuild whenever a native dependency changes. The shared conformance test, the forced-engine switch and the rule that Expo Go results are never a sound verdict are the guards. It must not widen the permission list (spike item 5), and it is a young library: pin the exact version, read its changelog before every upgrade, and keep `ExpoAudioBackend` working so a bad release can be rolled back by a build flag rather than a rewrite. Decoded buffers live in memory for the whole session, so the 32 MB budget and decode-by-set are part of the design, not an optimisation.
- **Quantised idle motion** can look steppy on a 120 Hz screen if the quantum is too coarse; judge on A1 at its real refresh rate, with the idle cap at 60 where it is free.
- **Dev builds hide all of this.** Anyone who tunes by feel in Expo Go (dev bundle) will optimise the wrong thing. Section 2 is the guard; the probe and diag are there so a number, not an impression, decides.

## 11. Questions for the owner

1. What is the **model, Android version, RAM and refresh rate** of the Android phone used for the report? It decides the tier defaults and whether A2 is needed.
2. Should a **bare `Pressable`** click (S7), or only the app's own buttons? Today only the own buttons do, whatever the code comment says.
3. **Answered 2026-11-21: the owner accepts the split (audio-api on Android, expo-audio on iOS), provided Claude can maintain it; see section 12.** As asked: `react-native-audio-api` cannot run in Expo Go, and you can only test the iPhone in Expo Go. The plan therefore uses it **on Android only** and keeps `expo-audio` on iOS, with Android sound work done in a development build (A3, set up once, hot reload kept). Do you accept that Android and iPhone use different sound engines for now? The alternative is to skip the new engine and rely on the `expo-audio` fixes alone (4.4 A to C), which keeps one engine everywhere but may not clear Android's losses; the spike's A/B on the Android phone is what shows whether that is enough. (A path to hear the new engine on an iPhone needs an Apple developer account and an EAS iOS development build; say if that is ever possible.)
4. Is it acceptable that on a `low` tier the idle motion of mascots and decorations **stops** (frame 0 is a good drawing, as with reduced motion) instead of running at a lower rate?
5. Can iPhone testing move to **`expo start --no-dev --minify`** for performance judgments, with plain `expo start` kept for building?

## 12. Maintenance: keeping the split easy for a Claude session to own

The owner accepted the split (question 3, answered 2026-11-21) on the condition that Claude can maintain it. So the design is judged on one thing: **a session that has read only `CLAUDE.md` and this section can change a cue, switch an engine, diagnose a silent sound or upgrade the dependency without rediscovering anything.** The rules:

### 12.1 One seam, small files

| File | What it is | Rule |
|---|---|---|
| `services/sfx-core.ts` | Catalog, scheduler, sets (`SFX_SETS`), pool and cap rules. Framework-free. | No engine import, ever. |
| `services/sfx-backend-core.ts` | `SfxBackend` interface and `pickBackend({ os, moduleLoaded, override }) => "audio-api" | "expo-audio"`, a pure function. | Framework-free, unit-tested. The Android-only rule lives here and nowhere else. |
| `services/sfx-backend-expo-audio.ts` | `ExpoAudioBackend`: today's pool code after 4.4 A. | The only file besides `media.ts` that imports `expo-audio`. |
| `services/sfx-backend-audio-api.ts` | `AudioApiBackend`. | The only file that imports `react-native-audio-api`, and only through a guarded `require` inside a function (a missing native module in Expo Go throws on load; the guard turns that into "not available", never a crash or a silent app). |
| `services/sfx.ts` | `playSfx` and friends: gates, scheduler, diag, then `backend.play(...)`. | Engine-agnostic. 244 call sites never change. |
| `services/sfx-diag.ts` | Outcome ring buffer and counters (4.2). | Every early return in `playSfx` and both backends writes one outcome. |

`check:sfx` is extended to enforce the import rules above (by file name), plus the existing WAV format check.

### 12.2 Tests are the memory

- `test:sfx` has (built): the `pickBackend` table (android + module, android without, ios, web, each override, an unknown override), the eviction, warm and buffer-budget plans (pure), the retry rule, the set coverage rule (every cue is in a set) and the diag counters. **The backend conformance test is not a node test**: the two adapters import native modules, so the conformance run is the probe's on-device "Sound self-test" and "Sound stress" on whichever engine is active, read from the outcome log (`PERF_AND_SOUND_PASS.md`).
- No test needs a device. Anything that does is a line in `docs/qa/PERF_AND_SOUND_PASS.md`, never a hidden assumption.

### 12.3 Runbook (copy into `docs/qa/PERF_AND_SOUND_PASS.md` in phase 0)

| Situation | Do this |
|---|---|
| "A sound doesn't play" | Open Dev admin > Perf probe, repeat it, read the last cue outcomes. `gate:` or `skip:` means by design (change a gate or a `gap` number in `CUES` only if the repeat was legitimate). `late:`, `lost:` or `error:` is an engine fault: check which backend is active (the probe shows it) and run the stress script on it. |
| Force an engine for an A/B | `ATOMIQ_SFX_BACKEND=expo-audio` or `audio-api` at build time, or Settings > developer switch. `audio-api` on iOS or in Expo Go is refused and logged, never honoured. |
| Add or change a cue | One row in `CUES`, the file in `SFX_FILES` and `sfx.ts` sources if new, and the cue in the `SFX_SETS` of every screen that plays it (a cue in no set is a `check:sfx` error). Nothing in either backend changes. |
| Upgrade `react-native-audio-api` | Pin the exact version (no `^`). Read its changelog. Rebuild A3, run `test:sfx`, run the scripted tour on A1 with both engines, compare the 4.2 table with the last filed one. If it regresses, set the default back to `expo-audio` with `pickBackend` (one line) and file why. |
| Expo SDK upgrade | Check `expo-audio` and the audio-api peer range first; `test:sfx` and the spike checklist (4.4 D) are the upgrade gate. |
| Audio-api breaks a build | Remove only `sfx-backend-audio-api.ts`'s `require`; the guarded pick then returns `expo-audio` everywhere. The app still has sound. |
| iPhone becomes testable on a development build | Add `ios` to the allowed list in `pickBackend`, run the spike checklist on it, update question 3. Only then. |

### 12.4 Where this is recorded for the next session

- `CLAUDE.md` (Other notes): a short entry pointing here with the three facts a session must not forget: the split, the guarded require, and "Expo Go is never a performance or sound verdict".
- Claude's project memory: the owner's test environments and the accepted split, so they are not asked again.
- This spec's status line is updated at the end of each phase (what is built, what is measured, what is still a guess), the way `SFX_SPEC.md` does.


### 5.8 Building the tabs in the background (built 2026-11-21; FAILED and REMOVED 2026-11-22: see `RENDER_COST_SPEC.md`)

> Superseded 2026-11-21: warm-up needs about 12 s of idle on Home and stops under any lesson, so a normal learner never gets it. The cost is native (views, vector drawing, picture decode), not something to move to idle time. The plan is `docs/features/RENDER_COST_SPEC.md`; item A2 there removed this code (done).

**Finding.** Shared reports from an iPhone 12 (Expo Go) and a Galaxy S21 (development build, 120 Hz) show the same pattern: the first open of Community, Quests, Profile, Awards and Shop is a 280 to 650 ms frame, once per screen, at every animation level; on Android the Phone tab also hitches (100 to 200 ms) on every return. The owner ran the minified bundle (`--no-dev --minify`) and Android was no faster, so the cost is real mount work (module evaluation, a big tree, image decoding), not the dev bundle, and animation levels do not remove it.

**Change.** Tabs are lazy; `useTabWarmup` (`hooks/use-tab-warmup.ts`, rules `services/tab-warmup-core.ts`) turns each tab's `lazy` off one at a time (Feed, Phone, Quests, Profile, Games), the first 3 s after the tabs appear and the next every 1.2 s, each on an idle thread (`requestIdleCallback`) and only while the tabs are in front (not under a lesson or a game). Expo Router's tab navigator preloads a screen whose `lazy` turns false. Home is always built. What moves is the cost, not its size: it is paid while Home is idle instead of when the learner taps.

**What to watch.** (1) Home should not hitch while a tab builds; if it does, lengthen the gaps. (2) Built tabs stay mounted and re-render on store changes while hidden; if the shared report shows more JS stalls with warm-up on, freeze blurred tabs next (`freezeOnBlur`). (3) A tab built while hidden must not play sounds or install moments: the Phone, Quests, Feed and Profile already wait for focus. **A/B:** the probe's "Build tabs in the background" switch (applies from the next start); the report's Switches line says which was on.

**First reading with warm-up on (Galaxy S21, 120 Hz, dev build, and iPhone 12, Expo Go).** On Android Quests (worst frame 42 ms), Profile (42 ms) and Awards (17 ms) opened without a hitch, where Profile had cost 384 ms and Quests and Awards a first-open hitch before: the build-ahead works for them. Community (542 and 651 ms, the second on a REVISIT), Phone (100 to 267 ms on every visit) and the Shop (530 to 668 ms during try-ons, iPhone 99 ms) still hitch, and a hitch on a revisit is not mount cost: it is work done each time the tab gains focus. The walk was also too quick for warm-up to finish (it needs about 10 s of idle on Home, and a lesson or a game stops it), so for an A/B wait about 12 s on Home before opening any tab. iPhone still showed 270 to 340 ms on first open of Quests, Awards and Profile; whether warm-up had finished there is not known.

**Per-focus work fixed (same day).** (1) The Feed rebuilt every post card on every focus and after every reaction: `getFeed` returns new objects each time and every card is a `memo` over its item, and `now` changed every call. `reuseItems` (`feed-ui-core.ts`) keeps unchanged items as the same objects (and the same array when nothing changed), and the cards' "now" is rounded to the minute (`minuteOf`), so a refocus inside a minute re-renders nothing. (2) The Phone tab re-renders several times per visit (focus, the progress read, the install batch) and handed every `AppIcon` a new press handler each time, which defeated its `memo` and re-rendered all icons with their SVG pictures. `sameIconView` (`phone-core.ts`) compares only what is drawn, the icon calls the newest handler through a ref, and the screen's `openApp` / `finishApp` are stable wrappers over the newest `open` / `finished`. Not measured yet. **Second reading (after the "wait 12 s on Home" walk).** Android: Quests 133, Profile 133, Awards 192, Community 217 to 550, Phone 233 to 283, Shop 667. The walk still went through lessons, which stop the warm-up, so it cannot say whether a tab was built before its first visit. The report now has a "TABS BUILT IN THE BACKGROUND" section (each tab with the time it was built, `recordWarmed`): a first visit earlier than that tab's time is a cold build. **Feed focus work (same day).** Opening Discover ran a reconcile, a weekly-ranking read and a rank check on every focus, all behind the first frames. They now run 350 ms after the page is shown, on an idle thread, and not again inside 20 s (`focusWorkDue`, `FOCUS_WORK_GAP_MS`; live events and every node completion already keep the feed current, and pull to refresh still runs them at once). Not measured yet.

**Left alone:** the Shop's try-ons (React side is already memoized; the cost looks like the native SVG of the big preview avatar on Android: profile it before changing), and the lesson's 150 to 340 ms frames at 120 Hz.
