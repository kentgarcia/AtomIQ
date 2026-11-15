# Visual Lesson Blocks

**Status:** Implemented (first release)  
**Spec:** `docs/ATOMIQ_FEEDBACK_SUMMARY_SPEC.md` section 5.1  
**Code:** `content/types.ts`, `content/visual-blocks.ts`, `components/lesson/visual/*`  
**Authoring script:** `scripts/content-migration/add-visual-blocks.mjs`  
**Tests:** `npm run test:visuals`

Visual blocks are a first-class lesson content type: structured data with a learning objective, teaching text and accessibility text, rendered by the app. They are not decoration. A figure that cannot state what the learner should understand does not ship.

## 1. Where blocks live

A block is an entry of the optional `visuals` array in a step's JSON `data` (table `lesson_steps`):

```json
{ "title": "...", "content": "...", "keyPoints": ["..."], "visuals": [ { "id": "visual-half-life-decay", "kind": "process_flow", ... } ] }
```

- `visuals` is additive. Steps without it behave exactly as before.
- Only `micro_learn` steps render `visuals` today. In the lesson, a micro_learn step with visuals gets one extra slide ("SEE IT") after the main content and before the key points. Briefing steps auto-advance after three seconds, so they cannot host a figure; debrief is a reward screen. `BriefingStep` and `DebriefStep` accept the field in the types for later use.
- The content database round-trips the field untouched (`services/content-db.ts` passes `data` through). The Content Studio keeps unknown fields when it saves a step, so `visuals` is not stripped. The studio has no visual editor yet: author with the script below or edit the step JSON.

## 2. Schema

Every block has these fields (all required unless marked optional):

| Field | Meaning |
|---|---|
| `id` | Unique, stable, kebab-case. Unique across the whole database. |
| `kind` | `diagram`, `process_flow`, `model`, `comparison_cards`, `annotated_illustration`, `real_life_example`. |
| `learningObjective` | What the learner can do or explain afterwards. Write this first. |
| `title` | Short name. |
| `explanation` | The teaching text, shown as normal body text. |
| `altText` | What the figure shows, for screen readers. |
| `plainText` | A plain-text equivalent that fully conveys the content. |
| `caption` | Optional. One line, e.g. "Simplified and not to scale." |
| `source` | `{ type: "original", note }` or `{ type: "reference", publisher, title, year?, url?, note?, verify? }`. Required for `comparison_cards` and `real_life_example`; strongly recommended for every other kind (the validator warns). |
| `credit` | Optional credit line for illustration or imagery. |
| `responsive` | Optional `{ stackBelow?, tabletLayout? }` hint (section 5). |

### Kind-specific fields

- **`diagram`, `model`, `annotated_illustration`**: `scene`, `callouts` (at least 2), optional `key`.
  - `scene = { height, shapes }`. The scene is always 100 units wide; `height` is 20 to 120. Shapes: `rect`, `circle`, `line` (optional `arrow`, `dash`, `width`) and `text`. Each takes an optional `tone` (`primary`, `accent`, `success`, `warning`, `danger`, `info`, `neutral`) and rect and circle take `fill` of `solid`, `soft` or `none`.
  - `callouts = [{ id, label, detail, x, y }]`: numbered markers drawn on the figure and listed under it (or beside it on tablets). The label and detail live in normal text, so they scale with the OS font size.
  - `key = [{ tone, label, swatch? }]`: explains hues. Each entry is a shape swatch plus a text label so meaning never relies on colour alone.
- **`process_flow`**: `steps = [{ label, detail?, value?, meter? }]` (at least 2). `meter` is 0 to 1 and draws a proportion bar.
- **`comparison_cards`**: `items = [{ label, value, detail?, numeric?, tone? }]` (at least 2), optional `scale` (`log`, `linear`, `none`) and `scaleNote`. A scale needs a positive `numeric` on every item. For a range, use the middle as `numeric` and say so in `scaleNote`.
- **`real_life_example`**: `headline`, `whatYouSee`, `theScience`, `whyItMatters`, optional `facts` and optional `scene`.

## 3. Authoring rules

1. **Objective first.** If you cannot write the learning objective in one sentence, you do not need the figure.
2. **Alt text, plain text and caption are three different things.**
   - `altText` describes what the picture shows, in one or two sentences ("Two nuclei side by side..."). It must not repeat the title.
   - `plainText` is the full equivalent. Someone who only reads it must learn everything the figure teaches. It must mention every callout, key entry, step and card by its exact label (the validator checks this).
   - `caption` is a short note about the figure itself (scale, simplification). It is not a second description.
3. **Explanation is teaching text, not a restatement of the picture.**
4. **Source and credit policy.**
   - Facts, numbers or imagery from outside: cite a `reference` source only when you are certain of the publisher and title (IAEA, NRC, UNSCEAR, NCRP, EPA, Codex and similar). Set `verify: true` when the numbers are typical or rounded and should be re-checked before wide release.
   - If you are not sure of a citation, do not invent one: use `{ type: "original", note }` and say in the note what it was summarised from and what to verify.
   - Use ranges and "about" for approximate values. Never present a guessed number as exact.
5. **Hues are decoration, labels carry meaning.** Illustration hues map to theme roles. Outlines, labels and surfaces always use neutral theme roles, so the figure works in light and dark mode.
6. **Keep in-figure text short.** It is hidden when space is tight; everything in it must also be in a callout, key or the plain text.
7. **Sizes.** Keep scene text 4.6 units or larger and keep shapes inside the 100 by `height` frame (the validator checks bounds).

## 4. Rendering and accessibility

`VisualBlockView` validates the block, then draws it:

- Title, "You will learn" line, figure, explanation, collapsible **Text version** (the plain text), caption, source and credit.
- Scene kinds, `process_flow` and `comparison_cards`: the figure is one accessible element with `accessibilityRole="image"` and the `altText`. `real_life_example` is text-first, so its sections are read as ordinary text; the alt text applies to its optional scene.
- The Text version toggle is a 48 dp button with `accessibilityState.expanded`.
- Read Aloud for the visuals slide reads each block's title, explanation and plain text (`getVisualSpeechText`).
- Malformed blocks never crash: they render whatever of title, explanation and plain text survives. A render error is caught by a boundary and falls back the same way.
- Animation is optional (cards and flow steps fade in) and disabled under `useReducedMotion()`.

## 5. Responsive behaviour

`useVisualLayout` uses `useResponsiveLayout()` from `theme/layout.ts` plus the measured width of the block.

- The SVG uses a `viewBox` and scales to the block width.
- The block switches to a stacked layout when the OS font scale is 1.3 or more, or when the block is narrower than `responsive.stackBelow` (default 280 dp). When stacked, non-essential text inside the SVG is hidden and the numbered legend under the figure carries the labels.
- Tablet (600 dp and wider): scene figures sit beside their legend, unless `tabletLayout: "stacked"`. Process flows go horizontal when there are four steps or fewer and 520 dp is available.
- Comparison cards use 1 column with large text, 2 on phones and up to 3 on tablets.
- The "SEE IT" slide scrolls inside the lesson card, and uses the lesson screen's safe-area insets.

## 6. Authoring workflow

1. Add the block to `BLOCKS` in `scripts/content-migration/add-visual-blocks.mjs` (it has geometry helpers for particle clusters and rings).
2. `node scripts/content-migration/add-visual-blocks.mjs --dry-run` to validate and preview. Then run it without `--dry-run`. It is idempotent: blocks are matched by `id` and replaced in place, nothing is duplicated, and the write is one transaction on the master database.
3. `npm run test:visuals` to validate every block in the database, then `npm run sync-content` to bundle.

## 7. Content candidates

| Candidate | Kind | Lesson (micro_learn step) | Block id | Status |
|---|---|---|---|---|
| Atom structure | model | `meet-the-atom` / `micro-learn` | `visual-atom-carbon-12` | Authored |
| Isotopes (C-12 vs C-14) | model | `what-is-isotope` / `micro-learn` | `visual-isotopes-c12-c14` | Authored |
| Alpha, beta, gamma penetration | diagram | `radiation-shielding` / `micro-learn` | `visual-penetration-alpha-beta-gamma` | Authored |
| Half-life and decay | process_flow | `radioactive-decay` / `micro-learn` | `visual-half-life-decay` | Authored |
| Radiation dose comparison | comparison_cards | `background-radiation` / `micro-learn` | `visual-dose-comparison` | Authored (`verify`) |
| Medical imaging (PET, Tc-99m) | real_life_example | `medical-applications` / `micro-learn` | `visual-pet-scan` | Authored |
| Radiotherapy | real_life_example | `medical-applications` / `micro-learn` | `visual-radiotherapy-beams` | Authored |
| Simple reactor | diagram | `nuclear-energy-explained` / `micro-learn` | `visual-simple-reactor` | Authored |
| Defence in depth | process_flow | `nuclear-safety-systems` / `micro-learn` | `visual-defence-in-depth` | Authored |
| Sterile insect technique | real_life_example | `industrial-agricultural-uses` / `micro-learn` | `visual-sterile-insect-technique` | Authored |
| Food irradiation | real_life_example | `industrial-agricultural-uses` / `micro-learn` | `visual-food-irradiation` | Authored (`verify`) |
| Isotope tracers in water | real_life_example | `environmental-protection` / `micro-learn` | `visual-water-isotope-tracers` | Authored |
| Crop mutation breeding | real_life_example | `industrial-agricultural-uses` | n/a | Candidate |
| Fission chain reaction | process_flow | `nuclear-fission` | n/a | Candidate |
| Fusion vs fission | comparison_cards | `nuclear-fusion` | n/a | Candidate |
| Radiation units (Bq, Gy, Sv) | comparison_cards | `measuring-radiation` | n/a | Candidate |
| Time, distance, shielding | annotated_illustration | `measuring-radiation` | n/a | Candidate |

Authored blocks that cite typical values or a standard (`verify`) should be reviewed by a subject-matter owner before the next broad beta.
