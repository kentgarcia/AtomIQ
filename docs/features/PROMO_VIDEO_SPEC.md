# AtomIQ — Duolingo-Style Launch Promo Video Spec (Landscape 16:9)

**Date:** 2026-11-22
**Status:** Approved — ready for implementation
**Format:** Landscape 16:9 (`1920 × 1080 px`, `60 fps`, `30.0 s` / `1800 frames`, H.264 MP4 + AAC audio)
**Inspiration & Methodology:** [Leonxlnx/cinetic](https://github.com/Leonxlnx/cinetic) (copy-first, single-timeline picture + words + sound architecture) combined with AtomIQ's own flat Duolingo motion language (`.claude/skills/duolingo-motion-style/SKILL.md`).

---

## 1. Goal & Distribution Targets

Create a punchy, joyful **30-second landscape launch film** promoting AtomIQ for:
1. **Google Play Store Promo Video** (hosted on YouTube as a public landscape 16:9 video, embedded at the top of the Play Store listing).
2. **YouTube / Social Launch Trailer & Landing Page Hero**.

### Core Creative Constraints (Cinetic + Play Store Rules)
- **Clear in the first 3 seconds:** The viewer immediately understands *what AtomIQ is* ("Nuclear science, made playful in 5-minute offline lessons") before they can scroll away.
- **Mute-first legibility:** Every beat communicates 100% through bold kinetic typography and live animated UI — sound elevates the feel, never carries essential information alone.
- **Zero marketing fluff:** Plain, concrete words only (no "revolutionize", "unlock your potential", "next-gen AI", or vague slogans).
- **100% real AtomIQ assets:** Every screen, character, icon, font, and sound effect comes directly from the repo (`assets/`, `components/mascot/shrodi-art.ts`, `tools/publisher/public/art/`). No stock footage, no invented features.
- **Flat, juicy Duolingo motion:** Instant state flips on taps, anticipation → squash & stretch → land → rebound → settle, 4-point sparkles, band-of-light sweeps, and chunky face-and-lip UI depth. Never generic ease-in-out slides or glossy 3D gradients.

---

## 2. Technical Architecture (Cinetic-Aligned)

### Workspace Isolation
Keep all video tooling isolated in **`tools/promo-video/`** with its own `package.json` so **zero video dependencies** ever enter the Expo mobile app's root `package.json`, Metro graph, or Android AAB bundle.

```text
tools/promo-video/
├── package.json              # Remotion 4 + React 19 + TypeScript (isolated from app)
├── src/
│   ├── timeline.ts           # Single source of truth: scenes, frame ranges, copy, SFX cues
│   ├── motion.ts             # Duolingo squash/stretch, pop, stamp, sparkle helpers (pure math)
│   ├── palette.ts            # AtomIQ Play Store palette + Intern variable font loader
│   ├── Film.tsx              # Root 1920x1080@60fps composition + Audio cue track
│   ├── scenes/
│   │   ├── Scene01Hook.tsx
│   │   ├── Scene02Lessons.tsx
│   │   ├── Scene03AtomMaze.tsx
│   │   ├── Scene04MythBuster.tsx
│   │   ├── Scene05SciencePhone.tsx
│   │   ├── Scene06QuestsShop.tsx
│   │   └── Scene07EndCard.tsx
│   └── components/
│       ├── TypeLine.tsx      # Kinetic word/line pop-in (Duolingo bold white + lip shadow)
│       ├── TapCursor.tsx     # Crisp tactile tap ripple + press sink
│       ├── DeviceStage.tsx   # Frameless rounded white UI card (matches Play Store set)
│       └── BgMotifs.tsx      # Translucent drifting atom/flask/sparkle vector motifs
├── scripts/
│   ├── copy-check.mjs        # Verifies word count, reading speed (<= 3.5 wps), no buzzwords
│   ├── mix-audio.mjs         # Optional FFmpeg mix / loudness check (-14 LUFS target)
│   └── contact-sheet.mjs     # Renders 12 keyframe PNGs into one review sheet before MP4
└── out/                      # Gitignored renders (contact-sheet.png, atomiq-promo-16x9.mp4)
```

### Engine Choice
- **Primary engine: Remotion 4** (default engine in `Leonxlnx/cinetic`).
  - Deterministic frame-by-frame React/SVG/CSS rendering (`useCurrentFrame()`), so we can directly mount our exact `Intern-Variable.ttf` font, our new `icon-layered.svg`, our redesigned vector Shrodi (`shrodi-art.ts` driven deterministically by `frame / 60 * 1000`!), the Publisher UI cards, and frame-locked `<Audio>` cues using AtomIQ's real `.wav` SFX.
  - Exports via local Chromium + `/usr/bin/ffmpeg` (already installed on this machine) to H.264 MP4 (`yuv420p`, CRF 18, AAC 192 kbps).
- **Root script shortcut:** Add `"promo:studio"` and `"promo:render"` convenience scripts (or run inside `tools/promo-video`) without installing Remotion in the root `node_modules`.

---

## 3. Visual Language & Safe Zones (`1920 × 1080`)

| Property | Spec |
|---|---|
| Resolution | `1920 × 1080` (16:9 landscape) |
| Frame rate | `60 fps` (total `1800` frames = `30.0 s`) |
| Safe margin | `96 px` left/right, `72 px` top/bottom (keeps all copy & key UI safe from YouTube/Play player chrome and bottom progress bar) |
| Typography | `Intern-Variable.ttf` (`900` Black for headlines `96–128 px`, `800` ExtraBold for sublines `36–44 px`, tight `-2 px` tracking, solid lip text-shadow, **no pill/badge boxes around subtitles**) |
| Color progression | Mirrors our Play Store screenshot carousel so the video and screenshots feel like one unified campaign: Gold `#FABF24` → Sky Blue `#1CB0F6` → Emerald Green `#58CC02` → Coral `#FF7A2F` → Purple `#9069CD` → Teal `#14B8A6` → Brand Gold `#FABF24` |
| Transitions | Fast, punchy **10–14 frame (160–230 ms)** color-wipe / scale-punch cuts on beat — never slow cross-fades |

---

## 4. Copy-First Script & Frame-Locked Storyboard (`timeline.ts`)

Total spoken/on-screen copy: **52 words** across 30 seconds (~1.7 words/sec — super scannable on mute, zero wall-of-text).

### Beat 1 — Hook (`0.0s – 3.5s` · frames `0–210` · Sunny Gold `#FABF24`)
- **On-screen copy:**
  - `0.0s`: `Nuclear science` (snaps in word-by-word)
  - `1.2s`: `that actually makes sense.` (pops with Shrodi cheering)
- **Visual:** Clean golden stage with soft drifting translucent atom orbits. `AtomIQ` icon drops in with squash-and-stretch stamp, then **Shrodi** (`happy_2.png` / animated vector `cheer`) pops up beside the headline with 4-point sparkles.
- **SFX:** `reward/pop.wav` (`0.1s`), `reward/sparkle.wav` (`1.25s`).

### Beat 2 — Bite-Sized Visual Lessons (`3.5s – 8.5s` · frames `210–510` · Gold → Sky Blue `#1CB0F6`)
- **On-screen copy (left half):**
  - `5-minute visual lessons.`
  - Subline: `Guided by your teachers.`
- **Visual (right half — wide frameless rounded UI card):**
  - Starts on the **Lesson Map** (tall yellow `UNIT 1 · INSIDE THE ATOM` card + pulsing active node + `START` bubble).
  - `4.6s`: Tap presses `START` (button sinks 4px onto its lip!) → crisp zoom cut into **Hal's Visual Lesson** (`Made of atoms` vs `Not matter`).
  - `6.5s`: Tap selects **`A glass of water`** → instant green flip + checkmark pop + green **`Excellent!`** footer slides up!
- **SFX:** `lesson/whoosh.wav` (`3.5s`), `lesson/node-zoom.wav` (`4.6s`), `lesson/pick.wav` (`6.5s`), `lesson/answer-correct.wav` (`6.55s`).

### Beat 3 — Play & Battle in Atom Maze (`8.5s – 13.5s` · frames `510–810` · Emerald Green `#58CC02`)
- **On-screen copy (left half):**
  - `Play between questions.`
  - Subline: `Run, jump & battle in Atom Maze.`
- **Visual (right half):**
  - Whip-wipe into **Atom Maze**! Shrodi (`shrodi-cheer.png` / sprite) hops across grass tiles, hits Slime → battle panel snaps up: *"What happens when an atom loses an electron?"*
  - `11.0s`: Tap hits **`Becomes positively charged ✓`** → golden starburst pops between Shrodi & Slime, Slime recoils, **`Direct hit!`** banner lands, and 3 coins arc into the HUD counter!
- **SFX:** `lesson/whoosh.wav` (`8.5s`), `game/platformer-jump.wav` (`9.1s`), `game/platformer-battle.wav` (`9.7s`), `lesson/answer-correct.wav` (`11.0s`), `game/platformer-coin.wav` (`11.4s`).

### Beat 4 — MythBuster (`13.5s – 17.5s` · frames `810–1050` · Coral `#FF7A2F`)
- **On-screen copy (left half):**
  - `Bust nuclear myths.`
  - Subline: `Calm, sourced facts.`
- **Visual (right half):**
  - **MythBuster** card drops in with Ada: *"You become radioactive after getting an X-ray."*
  - `15.2s`: Chunky **`MYTH`** button sinks & flips bright green (`MYTH ✓`) → **`Myth busted!`** banner lands with a crisp bounce!
- **SFX:** `ui/page-next.wav` (`13.5s`), `ui/select.wav` (`15.2s`), `lesson/answer-correct.wav` (`15.25s`).

### Beat 5 — Your Own Science Phone (`17.5s – 21.5s` · frames `1050–1290` · Purple `#9069CD`)
- **On-screen copy (left half):**
  - `Your own science phone.`
  - Subline: `Chat, scan & explore.`
- **Visual (right half):**
  - In-app smartphone glides up; the 12 chunky 3D-lipped app icons (`Chats`, `AtomDex`, `Scanner`, `Field Notes`, `Library`, `Camera`, `Safety`, `Map`, ...) pop in with a 2-frame diagonal stagger!
  - `19.2s`: **Ada's Atom Scanner notification** slides down (*"Scan a banana — Potassium-40!"*) while Shrodi peeks from the bottom-right corner with his Geiger counter (`radiation.png`)!
- **SFX:** `phone/app-open.wav` (`17.5s`), `social/notification.wav` (`19.2s`), `ui/geiger.wav` (`19.8s`).

### Beat 6 — Quests & Avatar Shop (`21.5s – 25.5s` · frames `1290–1530` · Teal `#14B8A6`)
- **On-screen copy (left half):**
  - `Earn diamonds.` / `Style your look.`
  - Subline: `Daily quests & avatar shop.`
- **Visual (right half):**
  - Top **Daily Chest** pops open (`+5 💎` bursts upward!) while the **Avatar Shop** (red-and-white scalloped awning + sky-blue stage + hero avatar) rises underneath!
  - `23.4s`: Tap clicks yellow round glasses → star glasses (`eye-round.svg` → `eye-star.svg`) — avatar swaps glasses on the exact frame with a crisp pop!
- **SFX:** `reward/chest-open.wav` (`21.8s`), `ui/shop-open.wav` (`22.4s`), `ui/try-on.wav` (`23.4s`), `reward/coin-land.wav` (`24.1s`).

### Beat 7 — Offline Payoff & End Card (`25.5s – 30.0s` · frames `1530–1800` · Brand Gold `#FABF24`)
- **On-screen copy:**
  - `25.5s – 27.3s` (3 rapid rhythmic full-frame stamps, 0.55s each):
    - `No account.` → `No ads.` → `100% offline.`
  - `27.3s – 30.0s` (Clean hero lockup, holds cleanly for 2.7s for YouTube end screen / Play Store loop):
    - **AtomIQ layered icon (`icon-layered.svg`)** + bold **`AtomIQ`** wordmark + **Shrodi cheering**
    - Tagline: `Make the atom make sense.`
    - Clean **`Available on Google Play`** badge / callout.
- **SFX:** `ui/tick.wav` ×3 (pitched up per beat at `25.5s`, `26.05s`, `26.6s`), `reward/finish-jingle.wav` (`27.3s`), `reward/sparkle.wav` (`27.8s`).

---

## 5. Audio Design Plan

1. **SFX Layer (100% real AtomIQ `.wav` files):** Every UI tap, answer flip, coin flight, chest open, and stamp drop triggers the real in-app SFX from `assets/sfx/` on the exact frame of contact (per `duolingo-motion-style` §3.3).
2. **Background Music Bed:** Light, upbeat marimba / plucked-synth instrumental loop (~124 BPM, bright & playful like Duolingo promos) ducked `-14 dB` under SFX hits and fading cleanly at `29.6s`.
   - *Note:* We will either bundle a royalty-free CC0/original track (or synthesize a crisp marimba/pluck loop cleanly via WebAudio/Python/Node so there are zero licensing issues — check Decision #2 below!).
3. **Final Mix Targets:** Integrated loudness `-14 LUFS`, true peak `≤ -1.0 dBTP`, verified with `ffmpeg -af loudnorm` / `ebur128`.

---

## 6. Quality & Verification Gates (Before Final Export)

1. **Copy check (`copy-check.mjs`):** Fails on buzzwords, lines > 6 words, or reading pace > 3.5 words/sec.
2. **Keyframe contact sheet (`contact-sheet.mjs`):** Renders 14 representative frames (2 per beat) into one PNG so we visually inspect layout, contrast, alignment, safe zones, and transitions before rendering all 1800 frames.
3. **Mute test:** Watch the rendered MP4 muted from start to finish — story and value prop must read effortlessly without sound.
4. **Audio sync & loudness check:** Confirm every SFX hits on visual contact and total loudness is ~`-14 LUFS` with zero clipping.
5. **App isolation check:** Confirm root `npm run typecheck`, `npm run check:images`, and `npm run check:theme-colors` remain 100% green and unaffected.

---

## 7. Locked Decisions

1. **Duration & pacing:** **30 seconds** (`1920 × 1080 @ 60 fps`, 1800 frames) — punchy Duolingo pacing for Google Play & YouTube.
2. **Background music:** Synthesize a clean, original, license-free **124 BPM playful marimba/pluck loop** mixed under real AtomIQ SFX (`assets/sfx/*.wav`), normalized to `-14 LUFS`.
3. **End card CTA:** **`Available on Google Play`**.
4. **Build setup:** Install **`Leonxlnx/cinetic`** into `.claude/skills/cinetic/`, read its skill instructions, and build **`tools/promo-video/`** with Remotion 4 following both `cinetic` and this spec.
