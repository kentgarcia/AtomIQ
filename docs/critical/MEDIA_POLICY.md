# Media policy

Implements `ATOMIQ_FEEDBACK_SUMMARY_SPEC.md` §4.1 (shared media behaviour), §4.2 (tab-bar clearance) and §4.5 (option contrast).

**Code map**

| Concern | File |
| --- | --- |
| State machine, route policy, gates, text builders (framework-free, unit-tested) | `services/media-core.ts` |
| Runtime: controller instance, preference store, AppState / screen-reader / route lifecycle, music channel | `services/media.ts` |
| expo-speech adapter (never called from screens) | `services/speech.ts` |
| Hooks | `hooks/use-read-aloud.ts` (`useReadAloud`, `useMediaPreferences`) |
| The one Read Aloud control | `components/ui/read-aloud-button.tsx` |
| Sound effects: the cue catalog and scheduling (framework-free) / the runtime | `services/sfx-core.ts` / `services/sfx.ts` |
| Tests | `npm run test:media`, `npm run test:sfx`, `npm run check:sfx` |

The sound library (`assets/sfx/<group>/*.wav`), the cue catalog and where each cue plays are specified in `docs/features/SFX_SPEC.md`. Screens call `playSfx("group.name")`; `check:sfx` keeps `require`s of effect files and `expo-audio` imports inside `services/sfx.ts` and `services/media.ts`. `canPlayCue` in `media-core.ts` is the one gate (it generalises `canPlayUiClick` / `canPlayGameSfx`).

## 1. Preferences (single source of truth)

`soundEffects` (existing `SOUND_ENABLED` key), `music`, `readAloud` live in one in-memory store hydrated from AsyncStorage. Settings, lessons, quizzes, Guide and games all read it. UI clicks, game effects, music and Read Aloud consult it through the gates in `media-core.ts`, so they cannot drift.

Settings exposes **Sound Effects** and **Read Aloud**. `music` is persisted and enforced, but there is no Music toggle yet because no track is bundled (see §6).

## 2. Read Aloud

One controller, one utterance at a time, app-wide. Every screen uses `<ReadAloudButton ownerId=… text=… />`.

**What each screen reads**

| Surface | Before answering | After answering |
| --- | --- | --- |
| Random quiz, lesson assessment | question + "Option A: …" choices | "Correct./Not quite." + explanation |
| Lab step | task + options | verdict + explanation |
| Lesson myth card, MythBuster (lesson) | "Myth: …" | reality + explanation |
| MythBuster game | "Myth: statement" | (stops on swipe) |
| Atom Maze | current question + choices | (stops on answer) |
| Lesson micro-learn | current slide text | n/a |
| Encyclopedia list/entry | term + definition / section | n/a |
| Schrodi/Guide | the current assistant message | n/a |

**Controls.** Tap = play when idle, stop when this control is active. Tapping again after it finished = replay. Pause is intentionally not offered: Android TTS cannot pause reliably, so a pause control would behave differently per platform.

**Visible states (identical everywhere):**

| State | Icon | Meaning |
| --- | --- | --- |
| idle | speaker | tap to read |
| loading | spinner | accepted, engine not started yet (cancellable) |
| speaking | stop | audio playing |
| error / unavailable | warning | engine failed or missing; auto-resets to idle after 2.5 s, tap retries |

State is never colour-only (icon, spinner and caption change). The glyph colour on the active fill is derived from contrast, not hard-coded white.

**Guarantees (all covered by `test:media`):**

- A new request stops the previous one; only the owner of the channel ever reports `loading`/`speaking`, so two controls can never both claim to be playing.
- Callbacks are tagged with a request id. A late `onStopped`/`onDone` from a replaced utterance is ignored (previously this flipped the new utterance's button to idle).
- A stuck `loading` (engine never starts) becomes `error` after 6 s. A silently dead utterance is healed by a liveness probe.
- Leaving a screen: `useReadAloud` stops its owner on unmount or when `ownerId` changes (next question, next slide). Any pathname change stops speech (`setMediaPathname`). Backgrounding stops speech; it never resumes on its own. Android back pops the route, which unmounts the owner.
- Answering stops narration (`stop("answered")`).
- Turning Read Aloud off stops speech and hides every speaker button.

## 3. Sound effects

| Surface | UI click | Correct/wrong/game-over |
| --- | --- | --- |
| Tabs, Guide, Encyclopedia, other | yes | n/a |
| Lesson | yes for buttons (option rows stay silent and play the answer cue) | yes |
| Quiz, MythBuster, Lab, Atom Maze | no (they play their own feedback) | yes |

Lesson assessments, Lab steps and lesson myth cards now play the same correct/wrong cue as the standalone quiz (previously they were silent). Effects play only while the app is in the foreground. While a screen reader is active, redundant UI clicks are suppressed; feedback effects still play. Reduced-motion does not change audio.

## 4. Background music

Allowed only when the `music` preference is on, the app is foregrounded and the route policy allows it (MythBuster, Atom Maze). It pauses on backgrounding or leaving those routes and resumes when allowed again. `registerMusicTrack(source)` is the single extension point.

## 5. Tab-bar clearance (§4.2)

- `useTabBarInset()` is the measured bar height + gap + safe-area inset. Every tab screen pads its last item with `inset + 16–24`.
- The bar's gradient fade is bounded by the reserved band (previously a fixed 180 px fade washed out the last row).
- Visibility goes through the inset provider (`useHideTabBar`, a layout effect, released on unmount). Guide mode hides the bar this way instead of via navigation params, which applied a frame late. The bar also hides while the keyboard is open. When hidden, the reserved inset shrinks to the system inset.
- Gate: `npm run check:tab-bar` (static wiring + computed clearance across compact/standard/short/tall/tablet viewports and gesture vs three-button insets).

## 6. Known gaps

- No music track is bundled, so the music channel is policy-only until one is registered.
- On-device verification still needed: TalkBack interaction with the Read Aloud button, Samsung/Google TTS differences, and the Guide landing at the bottom of the scroll on a real three-button-navigation device.
