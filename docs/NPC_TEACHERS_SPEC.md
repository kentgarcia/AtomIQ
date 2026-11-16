# AtomIQ: NPC Teachers Specification

**Status:** Implemented in part (2026-11-16): see "Implementation status" below. Nothing here has been run on a device.
**Date:** 2026-11-16
**Owner:** AtomIQ product, design and engineering
**Applies to:** a new `components/npc/`, `scripts/content-migration/schema.sql`, `content/types.ts`, `content/curriculum/`, `components/lesson/` (preview, story cards, finish), `app/(tabs)/index.tsx` (path), `app/explorer/`, `tools/studio/`, `scripts/lib/curriculum-rules.mjs`, `docs/THEME_EXCEPTION_REGISTER.md`
**Builds on:** `docs/LESSON_RESTRUCTURE_SPEC.md` (units, path, cards), `docs/LESSON_VISUAL_SPEC.md` (lesson look), `components/mascot/` (Shrodi), `components/motion/MOTION.md`
**Style source:** the project skill `.claude/skills/duolingo-character-style` (rules measured from Duolingo's public brand guide; its numbers are in `reference/measurements.md`)

## Implementation status (2026-11-16)

**Built.** The drawing and rig (`components/npc/npc-art.ts`, `npc-palette.ts`, `npc-roster.ts`, renderer `Npc.tsx`); `SpeechBubble`, `TeacherBanner`, `MeetSheet`, `UnitTeacher`; the "Teacher lines" setting (`teacher-lines.ts`, Settings switch); data (`npcs`, `npc_lines`, `units.teacher_npc_id`, schema version 3, `scripts/content-migration/add-npcs.mjs`, `content/npcs`); rules R1 to R6 in `curriculum-rules.mjs` with tests; EX-12 registered. Surfaces: the teacher banner and Meet sheet inside the Home unit info panel, the speech-bubble intro on the lesson preview (Shrodi still waves when a unit has no teacher), the teacher on story cards (Shrodi when a story names no speaker), and the finish screen (Shrodi and the teacher stand together in the celebration scene and the teacher's sign-off is one line of text; there is no separate chip, so the screen keeps to two characters). Ada teaches Unit 1; the other six are in the roster and the database, waiting for their units. `npm run test:npc` (24 tests) covers the art rules.

**Deferred.** Explorer journey narrators (phase 5), a Studio tab for editing teachers, full-body teachers, and Shrodi/teacher shared scenes. The content is a draft: it is not published and `sync-content` only refreshed the bundle metadata.

**Deviations from the text below.**
- Hair style `cropped` is named `crop`; no stubble option. Hal (white crop hair, moustache) and the others were re-tuned after the design sheet (Sage's outfit is coral, Hal's shirt is blue jay).
- The outfit-contrast rule is relaxed to: at least 1.4:1 against white and 3:1 against `#131F24`, because the official pastels cannot meet more and still stay in the palette.
- A pose change is a short cross-fade of two stacked figures, not a glide between poses.
- The muted ("locked") version pushes the clothes down the pastel ramp in steps until their lightness differs from the skin's by at least 0.1, instead of using one fixed shift, because one shift hid either Hal's or Ray's hands.
- The banner sits inside the expanded unit info (the Home card is a floating sticky header), not as a separate path row.
- Story cards carry `data.speaker`; the migration sets it to the unit's teacher.

## 1. Goal

Shrodi is the mascot: he cheers, reacts and guides. The path itself has no people in it. This spec adds a cast of **NPC teachers**, one per field of nuclear science, so the journey through the units feels like walking between people who know their subject.

1. **One teacher per field.** Ada teaches atoms, Hal teaches radioactivity, and so on (roster in §5). A unit has one teacher; a teacher can own several units later.
2. **The teacher is the voice of the teaching, Shrodi is the voice of the feedback.** Teachers introduce lessons, tell the story cards and sign off. Shrodi keeps correct, wrong, finish and the Guide. The two never swap jobs, so learners always know who is talking about what.
3. **Drawn in one style.** Every teacher is built from the same few rounded shapes, flat colour and one shade step, following the Duolingo character skill (§4), and is data, not a bespoke drawing. Adding a teacher is adding a row of values.
4. **The journey has a cast.** Teachers appear on the path (unit banners, locked units), in lessons (preview, story cards, sign-off) and in Explorer journeys, in the same style and the same size classes everywhere (§6).
5. **Nothing is lost for learners who ignore them.** Teachers are optional flavour: all meaning stays in text, they are hidden from screen readers, and a learner can turn their speech lines off (§8).

### Non-goals

- Replacing Shrodi. He stays the mascot, the Guide and the voice of feedback.
- Copying any Duolingo character, name or logo. The style is borrowed; the cast is original (§4.5).
- Voice acting, lip sync or per-teacher text-to-speech voices in the first pass (open decision O4).
- Branching dialogue, relationships, gifts or any game layer on the teachers. They teach.
- New learning content. Lines of speech are voice, not facts (rule R3, §7.3).
- Animated cutscenes. A teacher moves like Shrodi does: idle life plus gliding between poses.

## 2. Evidence base and its limits

Same convention as the lesson specs: "Checked" means a source was read for this spec, "To verify" means general knowledge that must be confirmed before it is quoted anywhere learners or marketing see it.

| Claim | Status |
|---|---|
| Duolingo's shape language rules (three rounded shapes, no outlines, one shade step, flat perspective, arm socket hidden, circle hands) | Checked: the skill's `SKILL.md` and `reference/measurements.md`, taken from Duolingo's public illustration guide. |
| A named on-screen guide can help learning when it directs attention to the right part of the material, and does little when it is only decoration | To verify: pedagogical-agent and persona-effect literature (Mayer, Moreno, Lester). Results are mixed. This is why teachers speak only where they add something (R3, §7.3) and never sit on a screen as ornament. |
| Linking a topic to one recurring person helps learners return to it | To verify. Treated as a design bet, not a finding. §11 measures it. |
| Seven teachers is not too many to tell apart | Not evidence-based. It is a design limit: §4.4 forces each teacher to differ in at least four attributes, and a test enforces it. |

## 3. Current baseline

| # | Observation | Where |
|---|---|---|
| B1 | The only character is Shrodi. Every story card, preview and feedback moment is him. | `components/mascot/Shrodi.tsx`, `TeachCard.tsx`, `LessonPreview.tsx` |
| B2 | The path shows a unit as a title and nodes. Nothing on it says who or what the field is about. | `app/(tabs)/index.tsx` |
| B3 | Story cards say "Story" and a tag. Nobody tells them. | `components/lesson/cards/TeachCard.tsx` |
| B4 | Explorer journeys are lists of nodes (myth, article, encyclopedia) with no narrator. | `app/explorer/journey.tsx` |
| B5 | The Guide maps questions to lessons and journeys, but it is one voice for every topic. | `services/guide/` |
| B6 | The rig for a living character exists and is tested: pure art data, an offline SVG serializer, three stacked SVG layers, native view transforms for body and head, one loop clock. | `components/mascot/*`, `scripts/render-shrodi.mjs`, `scripts/test-mascot.mjs` |
| B7 | Content today has one unit (Inside the Atom) authored in the DB; units 2 to 7 are specified but empty. | `content.db`, `LESSON_RESTRUCTURE_SPEC.md` §4.1 |

## 4. Character style: the Duolingo skill applied

### 4.1 Frame and shapes

Every teacher is drawn in the skill's frame: **head 100 units wide, centre (0, 0), y down.** Everything below is in those units, so a teacher scales to any size by one transform on the group.

- Only **rounded rectangles, circles and rounded triangles**. No outlines. No gradients (they rendered black on a device, and the project forbids them, see `MOTION.md` "Rig limits"). No transparency to fake shade.
- **At most one shade step** per colour: a solid darker colour, not an alpha overlay.
- **Never grey** for skin, clothes or any "sad" or "locked" version (§6.4 uses the skill's cool pastel ramp).
- **Flat perspective:** a floor shadow is a pill, never an oval.
- Few colours: per teacher, skin trio, hair, clothes pair, one accent (§4.3).

### 4.2 Proportions (head width = 100)

Taken straight from the skill's table. These are the numbers the tests check (§9).

| Part | Value |
|---|---|
| Head | Tombstone or tall capsule, 100 wide, 115 to 125 tall (default 100 x 122, y -66 to 56). |
| Neck | Rounded rectangle, 28 wide, 12 to 25 showing between chin and torso. |
| Bust torso | Tombstone, 144 wide, top at y 68, half-circle top. |
| Full-body torso | Rounded square, corner radius about 0.45 of the width, about 1.45 x the head. |
| Arm | One capsule, **38 thick** (about the neck's width), same thickness shoulder to wrist. Bent arm: two capsules with one shared round elbow, segments 55 to 80, within 25% of each other. |
| Shoulder | The arm's round end fully **inside** the torso, at about (±46, 118). The arm is drawn behind the torso, so no ball shows. |
| Hand | Circle, **radius 25** (half the head width). Fingers only where the gesture needs them: capsules 16 wide, at most four digits. |
| Eyes | White standing pills about 30 x 40, centres about 39 apart, at y about -8. Pupil a dark pill 13 x 20 in the **upper** part, with a shine dot. No eyebrows. |
| Nose | One or two rounded rectangles in the feature colour. |
| Mouth | The least geometric shape: a stroke, a white tooth shape, or open with teeth and tongue. May be pulled to one side. |
| Hair | One or two big shapes; always some hair above the ear. |

Layer order, back to front (skill §9): back hair, arms that go behind the torso, neck, torso and collar, head and face and front hair and glasses, things a hand goes over, front sleeves (merged with the torso), held objects, gripping hands, things in front of hands.

### 4.3 What a teacher is made of: `NpcSpec`

A teacher is **a row of values**. One builder, `buildNpc(spec)`, turns it into the same kind of layered shape tree Shrodi uses.

```ts
type NpcSpec = {
  skin: { base: string; shade: string; feature: string };   // trio, e.g. #FFCBA3 / #F5B585 / #E99B5F
  head: "tombstone" | "capsule";
  headWidth: number;          // 92..108 (variety, §4.4)
  eyes: "pill" | "round" | "glasses-round" | "glasses-square" | "dots";
  nose: "single" | "double";
  hair: { style: "bob" | "curls" | "crop" | "bun" | "bald-sides" | "wrap"; color: string; shade: string };
  facialHair?: "stubble" | "moustache" | "beard";           // nose stays skin-coloured
  outfit: { kind: "sweater" | "coat" | "vest" | "shirt" | "hoodie"; color: string; shade: string; collar?: string };
  accent: { kind: AccentKind; color: string };               // the field's prop and trim colour
  prop: PropKind;             // held or worn, from the table in §5
};
```

Pure data with no imports, so Node tests and the Studio preview (a web page) can use it. The values live in the content database (§7.1); the geometry lives in code (`components/npc/npc-art.ts`).

### 4.4 Variety rules

The skill says vary head width and height, eye style, nose and hair between characters while the construction stays the same. Made testable:

- Any two teachers differ in **at least four** of: skin trio, head shape or width, eye style, nose, hair style, hair colour, outfit kind, outfit colour, prop.
- No two teachers share an outfit colour. Outfit colours are official-palette hues (§4.6).
- Silhouette test: filled in one colour, each teacher is identifiable from the head and shoulders outline plus the prop. `render-npcs.mjs` writes a silhouette sheet for review (§10, phase 0).

### 4.5 Originality

Teachers must not be Duolingo characters or near copies. The skill forbids Duo, Lily, Zari, Bea, Vikram and the rest. Rules: no teacher reuses a Duolingo character's name, hair-and-clothes combination or signature prop, and `test:npc` checks the names against a blocklist. The review in phase 0 compares each sheet against the brand guide's characters by eye.

### 4.6 Colour

Official palette names and hex values from the skill are used for clothes and accents. Skin trios beyond the two the guide gives (light `#FFCBA3 / #F5B585 / #E99B5F`, warm `#F5B092 / #E8946F / #D97856`) are **tuned by eye in phase 0 and are not from the guide**. Hair colours the palette lacks (a warm dark brown) are listed as custom values.

Like Shrodi (EX-10) and the figure palette (EX-11), teacher colours are **fixed**: Ada is the same in light and dark mode. They are registered as **EX-12** (§7.4). They sit on theme cards and the page background, never on a fixed one, and the checks keep that contrast (§9).

## 5. The cast

Seven teachers, one per planned unit, so the cast grows with the curriculum: a teacher exists in the data as soon as their unit does, but is only *met* when that unit is authored and published (rule R1, §7.3). Names are original, short and easy to say aloud.

| # | Teacher | Field (unit) | Who they are | Signature prop (and what it carries) | Clothes (official palette) | Skin trio / hair | Eyes | Teaching voice and the idea they own |
|---|---|---|---|---|---|---|---|---|
| 1 | **Ada** | Atoms (Inside the Atom, Unit 1) | Young, curious, always mid-question | Marble in the hand that becomes an atom model (nucleus and shells) | Macaw `#1CB0F6`, shade Whale `#1899D6` sweater | Light-pink, curls Grizzly `#A56644` | Round glasses | Asks "what is it made of?". Owns *atoms are mostly empty space*, *isotope does not mean radioactive*. |
| 2 | **Hal** | Radioactivity (Unit 2) | Older, patient, tells stories | Pocket watch (half-life) | Bee `#FFC800`, shade Camel `#E7A601` cardigan | Tan, hair Squid `#EBE3E3` (warm off-white, not grey), moustache | Round, small | Slow and exact. Owns *half-life is not half gone, then gone*, *radioactivity is natural*. |
| 3 | **Ray** | Radiation meets matter (Unit 3) | Practical, a little blunt | Lead-lined clipboard and a hand-held counter | Beetle `#CE82FF`, shade Betta `#9069CD` vest over a shirt | Deep, bald-sides with short crop | Square glasses | Owns *irradiated is not contaminated*, *not all radiation is the same*. |
| 4 | **Mina** | The body (Unit 4) | Warm, reassuring, a clinician | Stethoscope round the neck | Feather Green `#58CC02`, shade Tree Frog `#58A700` coat | Brown, bun, Cardinal `#FF4B4B` pin as accent | Pill | Calm about risk. Owns *any dose is not deadly*, *radiation does not glow green*. |
| 5 | **Kofi** | Energy from the nucleus (Unit 5) | Energetic engineer | Hard hat with a reactor-core sticker | Fox `#FF9600`, shade Guinea Pig `#CD7900` hoodie | Warm, short crop, beard | Dots | Builds things. Owns *a reactor is not a bomb*, *fission versus fusion*. |
| 6 | **Tess** | Technology at work (Unit 6) | Quick, good with gadgets | Small vial with a glowing tracer drop | Whale `#1899D6`, shade Humpback `#2B70C9` scrubs | Tan, wrap, tiny round glasses | Round | Shows uses. Owns *irradiated food is not radioactive*, *nuclear medicine*. |
| 7 | **Sage** | Safety, waste and society (Unit 7) | Thoughtful, the one who weighs both sides | Notebook and pen | Turtle `#A5ED6E`, shade Tree Frog `#58A700` sweater | Light, long bob in a warm dark brown (custom value, §4.6) | Pill | Fair-minded. Owns *waste is not unmanageable forever*, *what "clean" means*. |

(Rows are a proposal. Open decision O5 covers names and look. Section 4.4's four-attribute rule has to hold for the final cast; the test enforces it.)

Beyond the units, a field can get a teacher without a unit: the periodic table and the encyclopedia are covered by Ada until a better owner exists (O2).

## 6. Where teachers appear (the journey)

### 6.1 Who speaks when

| Moment | Speaker | Why |
|---|---|---|
| Correct, wrong, feedback dock | **Shrodi** | Unchanged: the mascot reacts. |
| Finish screen | **Shrodi** cheers; the teacher adds a one-line **sign-off** chip | Keeps the celebration with the mascot and gives the teacher the last word. |
| Lesson preview | **Teacher** with a one-line intro | They introduce what you are about to learn. |
| Story card | **Teacher** tells it | Stories get a person. |
| Unit banner on the path | **Teacher** bust, name, field | The journey has a face per field. |
| Locked unit | **Teacher** in the muted version (§6.4) | A tease, never grey. |
| Explorer journey | **Teacher** of the journey's field narrates the node intros | Journeys have a narrator. |
| Guide tab | **Shrodi** | One guide for everything. |

At most **two character instances** on screen at once (a rule from `MOTION.md`); the finish screen is the only place that has two (Shrodi plus a small teacher chip, and the chip is still).

### 6.2 Size classes

One drawing, scaled; the same four sizes everywhere so the style reads at each:

| Size | dp | Used for | Form |
|---|---|---|---|
| Chip | 44 to 56 | Story card header, finish sign-off, replay banner | Bust, still pose (idle without arms moving) |
| Banner | 72 to 88 | Unit banner, journey header | Bust, idle life |
| Hero | 140 to 170 | Lesson preview, "meet the teacher" sheet | Bust with arms, full pose set |
| Full body | 180 to 220 | Meet sheet, unit-complete screen | Short full body (§4.2) |

Each form passes the skill's size test at its smallest ship size: hands, elbows and expression still read. Phase 0 reviews all four.

### 6.3 Screens

- **Path unit banner.** The unit title row gets the teacher's bust (Banner size) on the left, the unit title and "Taught by Ada" under it, and a 3D `Card` around it. Tapping opens the **Meet sheet** (Hero or Full body, two lines about them, what the unit covers). The unit's nodes stay as they are. The banner stays under `check:tab-bar`.
- **Lesson preview.** The teacher at Hero size beside a 3D speech bubble (a `Card` with a rounded-triangle tail, §7.2) holding one line: "Let's find out what's in a marble." This replaces Shrodi on this screen so only one character shows. A close button and the existing Start button are unchanged.
- **Story cards.** The Chip-size teacher replaces the small Shrodi, the badge reads the tag as today, and the title stays. The body is unchanged (60 words or fewer).
- **Finish.** Shrodi as built, plus under the stars a one-line sign-off chip with the teacher's Chip.
- **Explorer journey.** The journey screen header shows the field's teacher (Banner) and each node intro is one line from them.
- **Unit complete.** (New, optional.) The first time a unit's checkpoint is passed, a short screen with the teacher at Full body and a line about what comes next. Skippable.

### 6.4 Locked or muted teachers

A teacher whose unit is locked shows in the skill's **muted "before" version**: every colour mapped by lightness onto the cool pastel ramp `#4A4680` (dark) to `#DEDAFF` (light). Never grey. Eye whites and teeth stay white. Clothes are pushed about one step darker than the skin so hands do not vanish. The test (§9) asserts no muted colour is grey and that skin and clothes stay distinguishable.

### 6.5 Poses

A teacher has the poses they need to teach, each built from the skill's "tested poses" so the hands land somewhere readable (on the face, at the silhouette edge, on an object, or in the air), never as a stray dot on the chest.

| Pose | Used for | Arms and hands | Face |
|---|---|---|---|
| `idle` | Resting | Hanging 9 to 15 degrees out, hands low (hidden on a bust) | Neutral, slight smile |
| `greet` | Preview, meet sheet | One arm raised, fanned fingers (the wave, used because the wave is the point) | Happy |
| `explain` | Story, intro line | One arm out with the prop, other hanging | Open mouth, pupils toward the prop |
| `point` | "Look at this" | Index capsule along the fist (skill's pointing hand) | Neutral |
| `think` | Before a question | Hand on chin (skin one shade darker over the face) | Gaze up and aside, small pupils |
| `proud` | Sign-off | Thumbs up (fist plus thumb capsule) | Happy, cheek cut |
| `cheer` | Unit complete | Both arms up in a V, circle hands | Big smile |
| `sorry` | Failed checkpoint | Hand on forehead (the sigh pose) | Worried: steeper lid plus cheek cut |

Expressions use the skill's eye cuts only: tired is a flat lid, sad a slanting lid, worried a steeper lid plus cheek cut, happy a cheek cut from below, wide-eyed a smaller pupil. Closed eyes are one stroke in the skin's dark tone, never black.

## 7. Design

### 7.1 Data model

A schema bump (so `CONTENT_SCHEMA_VERSION` rises and the publish bump suggestion is **major**, see CLAUDE.md). All values; no geometry.

```sql
CREATE TABLE npcs (
  id          TEXT PRIMARY KEY,          -- shipped id, e.g. 'npc-ada'
  name        TEXT NOT NULL,             -- 'Ada'
  title       TEXT NOT NULL,             -- 'Atom teacher'
  field       TEXT NOT NULL,             -- 'atoms'
  bio         TEXT NOT NULL,             -- two lines, plain text
  spec        TEXT NOT NULL,             -- NpcSpec JSON (§4.3)
  position    INTEGER NOT NULL
);
ALTER TABLE units ADD COLUMN teacher_npc_id TEXT REFERENCES npcs(id);

CREATE TABLE npc_lines (
  id          TEXT PRIMARY KEY,
  npc_id      TEXT NOT NULL REFERENCES npcs(id),
  kind        TEXT NOT NULL,             -- 'meet' | 'lesson_intro' | 'sign_off' | 'tease' | 'journey_intro'
  lesson_id   TEXT REFERENCES lessons(id),
  journey_id  TEXT,
  text        TEXT NOT NULL,             -- 20 words or fewer, plain text
  pose        TEXT NOT NULL DEFAULT 'explain'
);
```

- Story cards name their teller with `data.speaker` (an npc id). A story card without one falls back to the unit's teacher.
- Npc ids and line ids are **shipped ids**: once published they cannot be renamed or deleted without a recorded retire reason.
- `content_translations` already exists for later localization; lines and bios are plain text so they fit it.
- `content/npcs/index.ts` is a thin facade over the tables like the other content facades; `contentRepository` hydrates `spec` into `NpcSpec`.

### 7.2 Code

- `components/npc/npc-art.ts`: pure. `buildNpc(spec)` returns `{back, head, front}` layers like `buildShrodi`, `POSES`, `frameOf(pose, t)`, `toSvg(tree, frame)` (offline serializer, used by the sheet script and Studio), `mutedSpec(spec)` (the pastel ramp), and the proportion constants of §4.2. No imports, so Node can test it.
- `components/npc/Npc.tsx`: renders the tree as stacked `Svg` layers exactly the way `Shrodi.tsx` does: one loop clock, one pose value gliding between poses (never swapping drawings), body bob and head tilt as **native view transforms**, arms and pupils as **geometry only** (`useAnimatedProps` on points and cx/cy). **No animated SVG `transform` strings and no SVG gradients**, the two device failures behind the Shrodi rules. Still (frame 0) with reduced motion, when the screen is not focused, or when `live` is false.
- `components/npc/SpeechBubble.tsx`: a 3D `Card` with a rounded-triangle tail on the speaker's side, a line of text, and `ReadAloudButton` (never `expo-speech` directly, see `docs/MEDIA_POLICY.md`).
- `components/npc/MeetSheet.tsx`: the Meet sheet.
- `components/npc/index.ts` and `content/npcs/`.
- `scripts/render-npcs.mjs <dir>`: contact sheet of the cast (every pose at the four size classes, light and dark page, plus a silhouette sheet and the muted versions) so art changes can be *looked at*.
- `scripts/test-npc.mjs` (`npm run test:npc`).

### 7.3 Content rules (added to `scripts/lib/curriculum-rules.mjs`, run by `validate:content` and on Studio saves)

| Rule | What it checks |
|---|---|
| R1 | Every published unit has a `teacher_npc_id` that exists. A teacher with no published unit is allowed in the data but is never shown on the path. |
| R2 | Every lesson has exactly one `lesson_intro` line from its unit's teacher; every unit has a `meet` line and a `sign_off` line. |
| R3 | A line is 20 words or fewer, plain text, and states **no fact that is not in that lesson's cards**. Lines are voice, not content. A facts-in-lines check is done by a person at review time; the validator flags numbers, units and element names in a line that do not appear in the lesson's cards. |
| R4 | No two teachers have an identical `spec` and the variety rule of §4.4 holds. |
| R5 | Story card `speaker`, if set, is an npc id from the same unit's teacher or an explicitly listed guest. |
| R6 | Npc ids and line ids obey the shipped-id retire rules. |

### 7.4 Theme exception

EX-12 in `docs/THEME_EXCEPTION_REGISTER.md` and `FILE_EXCEPTIONS` in `scripts/check-theme-colors.mjs` for `components/npc/npc-palette.ts` (the official palette constants and the muted ramp). Teacher colour values themselves live in the database; the file lists only the palette the validator accepts (`#RRGGBB` values from the official names, plus the documented custom skin and hair values). Fixed hues, flat colour only, no gradients.

### 7.5 Studio

Content Studio gets an **NPCs** tab: edit `NpcSpec` fields with the character previewed by `toSvg` (the same serializer, so Studio shows what the app draws), edit lines per kind, and see the variety check live. Saves run the same rules as `validate:content`. This is phase 5; before then, `scripts/content-migration/npcs.mjs` seeds the cast from code (repeatable, takes a backup first).

### 7.6 Voice

First pass: text only, with the existing `ReadAloudButton` on every line. Per-teacher voice (pitch and rate through the shared media runtime) is open decision O4.

## 8. Accessibility and responsiveness

- Teachers are decorative: the drawing is hidden from screen readers (like Shrodi). The line is real text with an accessibility label "Ada says: …", so screen-reader learners get the same words.
- Every line has Read Aloud through the shared runtime. A **Settings** switch "Teacher lines" hides speech bubbles and chips (the lesson itself is unchanged; the preview falls back to the plain title card).
- Contrast: a teacher is a picture and carries no text. Speech text uses theme roles on a theme `Card`, so the existing text-contrast rules apply. Outfit colours must reach 3:1 against the page background and the card in both themes, or the teacher gets a one-step darker outfit shade in dark (tested, §9).
- Reduced motion: frame 0 everywhere. A pose change on a still teacher is a cut, not a glide.
- Font scale 1.3: the speech bubble wraps and grows, never clips; the chip hides its line and keeps the picture.
- Touch: the unit banner and the Meet sheet button are at least 48 dp.
- Performance: at most two instances per screen; chips are still (no loop clock); banners run idle life only when focused.

## 9. Tests and gates

- **`scripts/test-npc.mjs`** (`npm run test:npc`), run by hand like the mascot tests. It renders `buildNpc` for the whole cast and checks the skill's measurable rules:
  - Only rounded rectangles, circles and rounded triangles; no `linearGradient`, `radialGradient` or `stop`; no stroke on any body shape (outlines); no alpha used for shade.
  - Arm thickness is within 10% of the neck width and at most 0.42 of the head width; the arm's round shoulder end is fully inside the torso; the arm is drawn before the torso.
  - Hand diameter is within 10% of half the head width; finger capsules are 1/3 of the hand diameter and no hand has more than four digits.
  - Bent arms have two segments within 25% of each other.
  - Eyes are white standing pills (taller than wide); the pupil sits in the upper half of the eye; a shine dot is present; no eyebrows exist.
  - There is hair above the ear for every hair style.
  - The sleeve of a hand-over-face pose uses the skin shade, not the base skin.
  - Variety: every pair of teachers differs in at least four attributes (§4.4); every outfit colour is distinct.
  - Names are not on the Duolingo blocklist (§4.5).
  - Every colour is `#RRGGBB`; clothes, accents and eye whites come from the official palette or the documented custom list.
  - **Muted version:** no colour has `r ≈ g ≈ b` (never grey); every muted colour is within the pastel ramp's lightness range; eye whites and teeth stay white; clothes are at least one lightness step darker than the skin.
  - Contrast: outfit and skin reach 3:1 against the light page (`#FFFFFF`) and the dark surface (`#131F24`) in the body positions where they touch it.
  - Poses blend: every numeric pose channel is finite and in range; every idle period divides the loop (like `SHRODI_LOOP_MS`).
  - A story-card teacher chip and the unit banner pass the size test: at each ship size, the hand circle diameter in dp is at least 18 and the pupil width at least 2.
- **Source scan (extend `test:visuals`):** `components/npc` never draws SVG gradients and never animates an SVG `transform` string.
- **Content:** `test:curriculum` and `test:curriculum-content` extended for rules R1 to R6.
- **Phase-end gates** (as for the lesson spec): `npx tsc --noEmit`, `npm run lint`, `npm run check:theme-colors`, `npm run check:icons`, `npm run check:tab-bar`, `npm run test:npc`, `npm run test:mascot`, `npm run test:visuals`, `npm run test:curriculum`, `npm run validate:content`, then a look at the screen in light and dark **on a device**.
- **Not covered by any test:** whether the characters look good. That is a person looking at the contact sheet and then at a phone.

## 10. Phases

| Phase | Scope | Done when |
|---|---|---|
| **0 Design sheet** | `render-npcs.mjs` plus the kit from the skill (`reference/kit.mjs`) ported into `npc-art.ts`. Draw Ada and Hal, four sizes, light and dark, silhouettes, the muted version. Review against §4.4 and the brand guide's characters. Tune skin trios by eye. **Skin, faces and hands approved by the owner before any app code.** | A reviewed sheet exists and the owner signs off Ada and Hal. |
| **1 Rig and cast of two** | `Npc.tsx` (idle life, poses, still mode), `buildNpc`, `frameOf`, `toSvg`, `test:npc`, EX-12. | `test:npc` passes; Ada and Hal render in a dev screen at all four sizes. |
| **2 Data** | Schema bump, `npcs.mjs` seed, `content/npcs`, `units.teacher_npc_id`, `npc_lines`, rules R1 to R6, Studio JSON editing only. | Ada owns Unit 1 in the DB; `validate:content` enforces R1 to R6; a version can be published. |
| **3 Surfaces** | Unit banner and Meet sheet, speech bubble, lesson preview, story card chip, finish sign-off. Settings switch. | Unit 1 shows Ada in every place of §6.3 except journeys. |
| **4 The rest of the cast** | Hal, Ray, Mina, Kofi, Tess, Sage, authored with their units; muted version on locked units; unit-complete screen. | A locked unit shows its muted teacher; the variety test passes for all seven. |
| **5 Journeys and tools** | Explorer journey narrators, Studio NPC tab, a pass for dark mode, reduced motion, font scale and a11y. | Smoke matrix passes; reduced motion shows no movement; font scale 1.3 does not clip. |

Phases 0 and 1 can ship alone (nothing is shown). Phases 2 and 3 can ship without 4.

## 11. Success measures

Measured with the existing activity tracker; none is a target until a baseline exists.

- **Return to a field:** share of learners who open a second lesson within the same unit within 7 days, before and after teachers.
- **Story card completion:** share of story cards finished (not skipped) with and without a teller.
- **Preview to start:** share of previews that proceed to the first card.
- **Settings:** share of learners who turn "Teacher lines" off (a high number means the lines are noise).
- **Qualitative:** on a device, five learners shown the cast can name the teacher for a given topic after one session (a design bet, not a metric).

## 12. Out of scope, parked for later

- Per-teacher voices, lip sync, sound cues (O4).
- Teachers in games (Atom Maze, MythBuster) and in the Guide's answers ("Ask Ada").
- Character customisation, unlocks or collectibles.
- A teacher for the periodic table and the encyclopedia (Ada covers them for now).
- Guest characters for specific stories (a historical figure card) as real people. The skill forbids copying Duolingo characters; likenesses of real people are a separate legal and tone question.
- Localised names and lines (the tables are ready, the work is not scheduled).

## 13. Risks

| Risk | Mitigation |
|---|---|
| The characters look wrong in a way tests cannot see | Phase 0 stops for owner approval; every later art change gets a contact sheet. |
| Too many characters on a screen (performance, clutter) | Hard cap of two instances; chips are still. |
| Teachers add noise for learners who just want to practise | Lines are one short line each, optional by setting, never block a card. |
| Teacher lines drift into unreferenced claims | Rule R3 and the review step. |
| A seven-person cast feels like a lot to author for one unit today | Only Ada ships with Unit 1; the others arrive with their units (phase 4). |
| SVG features that fail on device (gradients, animated transform strings, clip paths) | Same constraints as Shrodi; the source scan; flat shapes with no clip paths in the first pass. |

## 14. Open decisions

Recommendations in bold. They are the defaults if the owner does not answer.

| # | Decision | Options |
|---|---|---|
| O1 | What does "journey" mean here? | **Both: the learning path and Explorer journeys, with the teacher visible on each (§6).** / Path only. |
| O2 | How many teachers? | **One per unit (7), authored with their units; Ada covers the periodic table and encyclopedia.** / Three field teachers (atoms, radiation, energy and society). |
| O3 | Does Shrodi leave the lesson preview? | **Yes, the teacher takes the preview (one character per screen); Shrodi stays for feedback and finish.** / Both side by side. |
| O4 | Teacher voices? | **None in the first pass (text and Read Aloud only).** / Pitch and rate per teacher through the media runtime. |
| O5 | Names and looks in §5 | **Approve as a starting point; tune by eye in phase 0.** / Supply your own. |
| O6 | Bust only or short full body too? | **Bust everywhere; full body only on the Meet sheet and unit-complete.** / Bust only. |
| O7 | Fixed hues for teachers (EX-12) or theme roles? | **Fixed official-palette hues, like Shrodi: identity beats theming.** / Theme roles (they would change with light and dark). |
