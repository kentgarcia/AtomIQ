# MOTION.md: living illustrations in this project

> Read by the `rossark-motion-skill` first. Part 1 is the method and stays as it is; Part 2 is this project and overrides the skill's defaults.

---

## Part 1. The method

**The goal:** anything drawn (a character, a plant, a flame, a street, a logo, a chart) feels alive and calm. Nothing teleports, nothing bounces, nothing shouts.

### Principles
1. **Never teleport:** interpolate everything; never swap drawings.
2. **Calm by default:** strong curves, no bouncy overshoot.
3. **Small amplitudes:** when unsure, halve it.
4. **Arcs and pivots:** each moving part is a layer rotating around its joint (stem base, hinge, neck, hook).
5. **Overlap and follow-through:** tips and trailing parts move later and further; give each part the same wave with a growing phase delay.
6. **Variety without chaos:**
   - repeated items get a seeded phase, speed and size;
   - nothing moves in sync, and there's no random value per frame.
7. **One main action per scene, plus two or three idle loops.** Side things stay quiet.
8. **Opacity only to appear or disappear.**
9. **The layout never moves:** motion lives inside the drawing.
10. **Reduced motion:** loops freeze on a good frame 0, and one-shots show their final frame.
11. **Nothing runs unseen:** pause off screen, when hidden and in the background.
12. **Enough frames:** anything under ~100 ms flickers at 30 fps; render and export at 60 when you can. Blinks close in ~110 ms and reopen in ~190 ms.
13. **Interface rules:**
    - frequency decides how much (often seen = barely moves; rare moments get the delight);
    - every motion has a purpose;
    - shared elements travel, never teleport;
    - interface moves stay under 300 ms;
    - exits are faster than entrances;
    - nothing appears from scale 0;
    - interruptions continue from the current value.

### The engine
- **Clocks:** a loop clock for idle life, a one-shot clock for a scene that tells an action. One per character, group or scene.
- **Tracks:** keyframes `[ms, value, 'out'?]` read with `track(t, keys)`. The last key equals the first. `track` stops at every key, so use it for one move (a blink, a lid). For acting (a chain of poses), use `flow(t, keys)`, which passes through the keys without stopping and never overshoots.
- **Helpers:**
  - `wave` (−1 to 1), for sway and breathing;
  - `loop` (0 to 1), for drift and falling;
  - `bell`, to fade in and out;
  - `seg`, for one beat of a one-shot;
  - `seeded(i)`, for per-item variety.
- **Curves:**
  - travel uses ease-in-out `(0.77, 0, 0.175, 1)`;
  - open and arrive use ease-out `(0.23, 1, 0.32, 1)`;
  - leaving uses ease-in;
  - endless loops are linear.

### Quick recipes
| Subject | Recipe |
|---|---|
| Character | breathing 1–2 units over 3–5 s; a blink every 3–4 s; pupils glide; head tilt 3–6° |
| Waiting to be tapped | a jiggle every ~270 ms: squash 2%, widen 2%, the bulge trading sides |
| Floating figure | rises in from 30% of its height below, drifts 5% down and up, leaves rising |
| Tail, hair, ears | rotation around the root, phase delayed along the chain, 4–10° |
| Plant | sway 1.5–4° around the base over 3–6 s; leaves on seeded phases |
| Cloth, flag | a wave that travels along the length, growing away from the fixed edge |
| Fire | a lean of 2–4° and a 3–6% stretch on two waves of different periods |
| Smoke, steam | rises 8–14 units and fades in and out with `bell` |
| Water | ripples grow and fade; floating things bob 1–2 units and rock 2° |
| Rain, snow | seeded `loop`s; snow sways sideways |
| Sky | clouds drift over 20–60 s with parallax; sun rays take 30–60 s per turn |
| Lights | a glow of 2–5% over 2–4 s; stars twinkle at seeded times |
| Machines | gears turn linearly by ratio; a clock hand steps with ease-out |
| Phone | ±3° bursts, then a pause |
| Icon, logo | plays once on appear, then rests |
| Chart | a one-shot draw-on, with bars staggered 40–80 ms |

### Acting (a whole character)
- **Every channel:** key pose (`flow`) + idle (`wave`s, never off while on stage) + follow-through (the parent read 90–140 ms earlier) + accents (a `wave` inside a `seg` window).
- **Arms:** an upper arm and a forearm share a round elbow; the forearm points at shoulder angle + elbow bend.
- **Head turns:** slide the face toward the turn (eyes 10, nose 13 in a 100-wide head) and the ears the other way. Blink on the turn.
- **Weight:** the hips shift and carry the upper body, and the legs angle to keep the feet under it.
- **Landing:** hover, then fall with gravity and stretch; squash hard (0.8) on contact and keep the volume (`width = 1 / height^0.6`).
- **In the air:** limp feet (toes down, one knee folded, trading slowly). The shadow stays on the floor and scales with the height.
- **Props:** enter from off screen already moving and roll by distance / radius. The eyes follow them. A kick hits at the middle of the swing; the prop leaves as a throw, spinning, with a short squash.
- **Asymmetry:** the arms never mirror each other.
- **Camera:** a view from a little above is a whole build, not a tweak: the head is 40–50% of the height, the torso is short and narrower than the head, the legs are short, the feet are round from above, and the shadow is a wide oval with the feet in its lower half. Keep it in one `build` object. A flat view keeps a thin pill shadow.
- **Framing:** on a phone, as big as the screen allows, with the feet low.

### From a reference video
- Contact sheets at the full frame rate (`tools/sheet.sh`).
- Measure motion with numbers (`tools/track_edges.py`): a 2% jiggle or a 5% float doesn't show to the eye.
- Sample colors from pixels (`tools/sample_colors.py`).
- Go part by part: feet, shadow, hands, head.
- Compare proportions as ratios of one unit (head widths). "Stretched" means a ratio is far off.
- Compare your render with the reference at the same moments.
- Don't publish a copy of someone else's art.

### Performance
- Everything is a function of one clock's time.
- Draw many items in one SVG or `Canvas`.
- Reset repeating animations to 0 before starting, and cancel them on cleanup.
- Declare curves at the top of the module.

### Workflow
1. Read Part 2 and the art file's header comments.
2. List what could live in the drawing.
3. Pick one main action and two or three idle loops.
4. Split the art into layers at their pivots.
5. Put the numbers in tokens.
6. Check frame 0, the final frames and the loop seams. For a character, look at a contact sheet of every 4th frame of your own render.
7. Run the checks.
8. Hand off: what moves, and what hasn't been seen on a real device.

---

## Part 2. This project (AtomIQ lessons)

### Where the code is
- **Platform:** React Native (Expo SDK 58), `react-native-svg` + `react-native-reanimated` 4.
- **Motion engine:** `components/motion/motion-core.ts` (pure curves, `track`, `flow`, `wave`, … as worklets; testable under Node) and `components/motion/motion.ts` (the Reanimated clocks on top). Copied from the skill's `templates/react-native/` and split so the math runs without React Native.
- **Lesson art:** figures are stored as data (`SceneShape[]`, 100 units wide, y down), drawn by `components/lesson/visual/SceneFigure.tsx`. Authoring helpers are in `scripts/content-migration/curriculum/scenes.mjs`. The database holds values only, so motion is data too: an optional `motion` on a shape (see below), never code in the DB.
- **Mascot:** Shrodi, the orange fox scientist, is drawn as data in `components/mascot/shrodi-art.ts` (palette, poses, `frameOf(pose, t)`, the node tree) and rendered by `components/mascot/Shrodi.tsx`. The head shapes (head base, white inner base with the eye whites fused in, the ear) are the designer's layers in `assets/images/mascot/layers/*.svg`, baked into `shrodi-shapes.ts` by `python3 scripts/bake-shrodi-layers.py` (which also rotates the tilted layer art upright by 10.5°, gives both eyes the same white oval, and mirrors the right ear for the left; the head is drawn `HEAD_SCALE` (1.25x) larger than its natural size so the body reads small, and the tail is drawn at `TAIL_SCALE` of its size) (edit the layer, re-run, never hand-edit the baked file). The eye white belongs to the inner base; the pupil is the only eye and the glasses are rings on top. The same tree renders offline: `node scripts/render-shrodi.mjs <dir> [dark]` writes a contact sheet of every mood (convert with `magick`, look at it before changing the art). Moods: idle, wave, happy, cheer, think, oops. The old PNGs in `assets/images/mascot/` are still used elsewhere (onboarding, empty states).
- **Animated pieces to copy from:** `Shrodi.tsx` (a drawn character: one loop clock, one pose value gliding between moods), `SceneFigure.tsx` (`MovingCircle`, `MovingRect`), `LessonFinish.tsx` (the star pops).

### Scene motion (data)
`motion` on a `circle` or `rect`:
- `{ kind: "orbit", cx, cy, period }`: revolves around (cx, cy), linear. Frame 0 is the authored position. Circles only.
- `{ kind: "pulse", period, amount? }`: scales about its centre by up to `amount` (default 0.06, max 0.12).
- `{ kind: "float", period, dy? }`: bobs `dy` units (default 1, max 2).
- Optional `phase` (0 to 1) offsets one item from the next.
- `period` must divide `SCENE_LOOP_MS` (60000) so the shared loop never jumps (2000, 2500, 3000, 4000, 5000, 6000, 7500, 10000, 12000, 15000, 20000, 30000, 60000).
- One clock per figure. It is frozen (frame 0) with reduced motion, when the screen is not focused, and when no shape has motion.

### The owner's rules
- 2026-11: use `rossark-motion-skill` and `duolingo-character-style` for the lesson animations and visuals.
- 2026-11: micro-interactions, transitions and reward animations (press and selection pops, bubbles, finish stamps, stat reveals, quest claims, chests) follow `duolingo-motion-style`, whose base is the option pop, node bubble, finish screen and claim animation already in the app. Routine interface moves (tier A there) keep the under-300 ms, no-overshoot rule; earned moments (tiers B to D) are the exception and use the measured keyframe stories with a landing.

### Rig limits
- Shrodi is an outline-free drawing in flat colour (EX-10). No SVG gradients: they rendered black on a device (cause not found), so `test:mascot` forbids them. Depth, if wanted, comes from extra flat shade shapes. His idle life (breathing, blinks, glances, ears, tail) never stops; a mood is a pose the body glides into (450 ms), not a swap. Every idle period divides `SHRODI_LOOP_MS` (9000) so the loop closes; `test:mascot` checks it. He is decorative on lesson screens (hidden from screen readers); meaning is always also in text.
- Left arm: positive rotation is outward. The right arm takes the negative (tested).
- Scenes are flat shapes with a same-hue rim one shade darker (`toneRim`), not black outlines. Every tone's rim reaches 3:1 on the figure surface in light mode (`test:visuals`). Dark mode uses the bright fill itself.
- Interface moves (card enter, feedback, progress) stay under 300 ms, ease-out. A lesson card is seen hundreds of times, so it barely moves.
- Lesson redesign (docs/features/LESSON_VISUAL_SPEC.md): option rows cross-fade face/border/lip in 160 ms; the progress bar glides 300 ms; the feedback dock rises 180 ms; finish stars settle 320 ms with a 280 ms ring flash. All ease-out, all skipped (frame 0 / final value) with reduced motion.

### How changes are checked
- `npx tsc --noEmit`, `npm run lint`, `npm run check:theme-colors`, `npm run test:mascot`, `npm run test:visuals`, `npm run test:curriculum-content`, `npm run validate:content`.
- Look at a contact sheet of any art change (`scripts/render-shrodi.mjs`).
- Not yet seen on a real device: the new lesson screens (frame, dock, MYTH/FACT, preview, finish), the scaled head layer, frame rate with Shrodi plus an orbiting scene on screen, and reduced-motion behaviour.
