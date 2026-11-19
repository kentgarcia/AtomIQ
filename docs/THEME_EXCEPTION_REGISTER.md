# Theme Exception Register

Companion to [`DARK_MODE_COMPLIANCE_SPEC.md`](./DARK_MODE_COMPLIANCE_SPEC.md) §9–§10.
Every fixed color that is **not** a mode-aware theme role must be listed here with a
reason, an owner, and a visual test. Anything not listed is a defect.

Gate: `npm run check:theme-colors` (`scripts/check-theme-colors.mjs`).
Runtime proof: `npm run test:theme` (`scripts/test-theme-colors.mjs`).

---

## 1. How exceptions are declared

There are two mechanisms:

| Mechanism | Where | Effect |
| --- | --- | --- |
| File exception | `FILE_EXCEPTIONS` in `scripts/check-theme-colors.mjs` | The whole file is skipped by the checker. Reserved for invariant artwork. |
| Inline allowance | `// theme-allow: <reason>` on the offending line | Suppresses the checker for that line only. Must still be registered below. |

Brand/accent hues and inverse/on-color white are not flagged by the checker, but are
governed by the rules in §4 and §5.

---

## 2. File-level exceptions

| ID | File | What is invariant | Reason | Owner | Visual test |
| --- | --- | --- | --- | --- | --- |
| EX-01 | `components/atom-maze/styles.ts` | Atom Maze game artwork: stage chrome, HUD panels, Game Boy-shell treatment, battle sprites, per-maze stage colors | The maze is an illustrated game board. Its palette is part of the game's art direction and is intentionally independent of OS appearance; the surrounding screen shell (`app/explorer/atom-maze.tsx`) still follows the theme. | Mobile / Design Systems | Open **Explorer → any maze**. Verify the board, sprites, and HUD are legible and unchanged in light and dark. Verify the intro/instructions screen and result screens follow the mode. |

---

## 3. Inline (`theme-allow`) allowances

| ID | Location | Value | What it is | Reason | Owner | Visual test |
| --- | --- | --- | --- | --- | --- | --- |
| EX-03 | `app/explorer/encyclopedia-entry.tsx:276,489–493` | `#EF4444 → #DC2626` gradient; `rgba(255,255,255,0.18–0.3)`, `rgba(0,0,0,0.18)` | Red **myth** gradient plus translucent button/tint overlays sitting on it | The gradient is a fixed danger-identity art fill; the overlays are inverse glass tints. Deriving them from a page surface would break the treatment. | Mobile / Design Systems | Open an encyclopedia entry with a myth block. Confirm the gradient, speaker buttons, and title remain readable in both modes. |
| EX-04 | `app/explorer/atom-maze.tsx:640–642` | `#FFF7ED → #FEE2E2 → #FECACA`, `#ECFDF5 → #DCFCE7 → #BBF7D0`, `#FEFCE8 → #FEF3C7 → #FDE68A` | Light result-celebration gradients for defeat / victory / complete | Celebration screens are a deliberate light “reward card” moment; card text and stats are still theme roles. | Mobile / Design Systems | Finish or fail a maze. Confirm all three result gradients render correctly and their text/stats are legible in both modes. |
| EX-05 | `app/explorer/atom-maze.tsx:2388` | `#E2E8F0` | Question icon in the arena HUD chip | The HUD chip sits on the dark arena art, so it needs inverse light ink in both modes. | Mobile / Design Systems | Enter a maze battle. Confirm the HUD question chip icon is visible against the arena in both modes. |
| EX-06 | `app/explorer/journey-node.tsx:143,179` | `#E74C3C → #C0392B`, `THEME.success → #27AE60` | Myth-vs-science section gradients | Red/green identity gradients for the “What People Think” / “What Science Says” blocks; text on them is inverse white. | Mobile / Design Systems | Open a myth journey node. Confirm both section gradients render and their white text is legible in both modes. |
| EX-07 | `app/(tabs)/index.tsx:1319` | `#FFBC00 → #FF7B00` | Home hero / level-up amber gradient | Brand accent gradient, not a surface. | Mobile / Design Systems | Home tab → trigger level-up or view the hero. Confirm the amber gradient keeps its hue and its content is readable in both modes. |
| EX-08 | `app/explorer/atom-maze.tsx:2013,2081` | `#0B1020 → #1E1B4B → #7F1D1D`, `#DC2626 → #F97316` | Arena defeat backdrop and defeat chip | Dark dramatic art gradients used under HUD elements. | Mobile / Design Systems | Lose a maze battle. Confirm the defeat backdrop and chip keep their art treatment and text is legible in both modes. |
| EX-10 | `components/mascot/shrodi-art.ts` (`SHRODI_COLORS`) | Shrodi's fur `#FB923C` / shade `#EA580C` (brand orange 400 / 500), muzzle, lab coat `#DCE8FF`…`#8FA8E6`, glasses and pupils `#3C3C3C`, nose, mouth, tongue | The mascot's character colours (and the coat staying pale in dark mode) are brand identity, intentionally independent of the OS appearance. Fur is pinned to the brand orange tokens by `npm run test:mascot`. Flat colour only: SVG gradients rendered black on device. The screens that show him (lesson preview, run feedback, finish) still follow the theme. | Mobile / Design Systems | Open any lesson in light and dark mode. Confirm Shrodi's fur, white muzzle, pale-blue coat and dark glasses look the same in both and read against the page background. |
| EX-11 | `components/lesson/visual/duo-palette.ts` (`HUES`, `NEUTRAL`) | Brand orange `#EA580C`/`#C2410C`, fox `#FF9600`/`#D97D00`, feather green `#58CC02`/`#46A302`, bee `#FFC800`/`#D9A800`, cardinal `#FF4B4B`/`#D93B3B`, macaw `#1CB0F6`/`#1899D6`, neutral grey `#AFAFAF`/`#8E8E8E` (light) and `#7A8A93`/`#566269` (dark) | Faces and lips of the lesson figures (scenes, atom builder, atom motif): a proton is the same red in light and dark. Flat colour only, no gradients. Every lip reaches 2:1 on the card in light and every face 3:1 in dark (`npm run test:visuals`). | Mobile / Design Systems | Open a lesson with figures in light and dark. Confirm every colour reads against its card, protons are red, neutrons grey, electrons blue, and the darker lip shows under each shape. |
| EX-12 | `components/npc/npc-palette.ts` (`OFFICIAL`, `FACE`, `CUSTOM`, `MUTE_*`) | The seven NPC teachers' skin and hair trios, outfit colours from the Duolingo-style official palette, eye white `#FFFFFF`, pupil `#3C3C3C`, and the cool pastel ramp `#4A4680` to `#DEDAFF` used for a locked teacher | A teacher's look is character identity and stays the same in light and dark. Flat colour only (no gradients, no alpha shading). Outfits are checked against the white and dark page backgrounds, and the muted version is never grey, by `npm run test:npc`. Every screen that shows a teacher (path, lesson preview, story card, finish) still follows the theme. | Mobile / Design Systems | Open Unit 1's info panel and a lesson preview in light and dark. Confirm Ada's pink skin, curls, glasses and blue sweater look the same in both and every garment reads against the page. Open a locked unit and confirm the teacher is cool pastel purple, not grey. |
| EX-13 | `components/lesson/visual/object-art.ts` and `components/feed/blog-art.ts` (the blog's full scenes, built from the same families) (`SNOW`, `EEL`, `GLASS`, `ANCHOVY`, `BEE`, `FOX`, `CRUMB`, `COFFEE`, `SEA`, `LEAF`, `RED`, `PLUM`, `PINK`, `SKIN`) | Colour families `[light, base, dark]` from the official Duolingo-style palette, e.g. bee `#FFE070`/`#FFC800`/`#E6A800`, macaw `#7AE1FE`/`#1CB0F6`/`#1899D6`, feather green `#A5ED6E`/`#58CC02`/`#46A302`, cardinal `#FF7878`/`#FF4B4B`/`#D93B3B`, skin `#FFCBA3`/`#F5B092`/`#E8946F` | The flat pictures of things in lessons (a hand, a cell, an atom, a cat, a flame) are illustration, not interface. A banana is yellow and a flame is orange in light and dark, so the hues are fixed. Flat colour only (no gradients), at most one lighter and one darker step per family, and transparency only on a pale shine bar. | Mobile / Design Systems | Open lesson 1 (Atoms are everywhere) in light and dark: the hand, cell and atom figure, the four-picture question, the sort and order cards and the zoom stops. Pictures keep the same colours in both modes and stay readable on the white and the dark card. |
| EX-14 | `app/daily-streak.tsx` (`COUNT_FILL`, `COUNT_SHADOW`) | White `#FFFFFF` fill and a hard black `#000000` drop shadow (no blur) on the streak number | The number sits on the fire animation (`Fire.lottie`), which is orange in light and dark, so the number is white with a black shadow in both modes to stay readable on it. | Mobile / Design Systems | Open the daily streak screen in light and dark with a streak above 0. Confirm the number reads clearly over the fire in both. |
| EX-15 | `components/lab/shield-art.ts` (`MATERIAL_ART`, `RADIATION_ART`) | Shield materials as face / lip / mark: paper `#F6EDD3`/`#D9CBA3`, plastic `#3DC5B8`/`#2AA194`, aluminum `#D3DCE3`/`#AEBAC4`, concrete `#A9A39E`/`#8A847F`, lead `#5E6E7E`/`#425060`; radiation alpha `#FF4B4B`, beta `#1CB0F6`, gamma `#FFC800` (each with a lip and a light) | The Radiation Shield Lab's picture: lead is blue-grey and concrete grey whatever the OS appearance, and each kind of radiation keeps its colour so the learner can follow it from the source to the detector. Flat colour only (no gradients, no alpha shading). The page, controls and text still follow the theme. | Mobile / Design Systems | Open Games → Lab → Radiation Shield in light and dark. Confirm each shield material and each particle reads against the page, and the lead slab is distinct from the concrete one. |
| EX-16 | `app/explorer/platformer.tsx` and `components/platformer/ResultPanel.tsx` (`BLACK`), `components/platformer/BossIntro.tsx` and `BossVictory.tsx` (`BAR_COLOR`, `BAR_TEXT`), `components/platformer/sprites.ts` (`FLASH_HIT`, `FLASH_HURT`, `HUD_ICON_COLOR`, `HUD_SHADOW_COLOR`) | Black `#000000`, fully transparent at the top of the fade and opaque at the bottom; the battle's flash over a fighter, white `#FFFFFF` on an enemy that is hit and red `#FF4B4B` on the hero when hurt | The Atom Maze platformer's world fills the screen and its ground fades to black behind the touch controls. The fade is part of the game picture (the dark ground the thumbs rest on), so it is black in light and dark; the flashes are tints of the fighters' own pictures, the same in light and dark; the pause icon's white fill and the timer's white text with its dark shadow are drawn over the game picture too. The boss introduction's letterbox bars are black and the boss's name on them white (`BAR_COLOR`, `BAR_TEXT`), a cinematic over the game picture in light and dark. The buttons, pills and text on it still follow the theme. | Mobile / Design Systems | Open Games → Atom Maze → Reactor Trail in light and dark. Confirm the ground fades to black at the bottom in both and the control buttons read on it; touch an enemy, answer right and then wrong, and confirm the white and red flashes read on the fighters in both. |

---

## 4. Brand / accent hue literals

Brand hues are allowed to stay literal (they are identity, not surfaces). They must be
used as **fills with an on-color foreground** or as accents on a theme-provided surface —
never as a page/card background, body text, border, or divider.

The canonical families live in `theme/tokens.ts` (`brand`, `role`, `warm`) and are
re-exported through `theme/palettes.amber` where practical.

| Family | Representative values | Typical use |
| --- | --- | --- |
| Amber / AtomIQ orange | `#FFCA5F`, `#FFBC00`, `#FF7B00`, `#FF8C00`, `#E67E22`, `#FFA000`, `#FFC107`, `#FFD700`, `#F59E0B`, `#FDE68A`, `#FACC15`, `#FFC800` | primary buttons, badges, XP/gold icons, waves |
| Success green | `#2ECC71`, `#10B981`, `#22C55E`, `#81C784` | correct answers, completed states |
| Danger red | `#EF4444`, `#DC2626`, `#F87171`, `#E53935` | errors, wrong answers, defeat |
| Info blue | `#1CB0F6`, `#4285F4`, `#6A82FB`, `#5E72E4`, `#64B5F6`, `#3B82F6` | links, info chips, gradients |
| Purple | `#8B5CF6`, `#7C3AED`, `#6366F1` | science/category accents |
| Brown-on-cream ink | `#7C4A00`, `#9A5A00`, `#92400E`, `#7C4A00` | text on amber/cream headers (fixed, because the header fill is fixed) |

**Owner:** Mobile / Design Systems.
**Visual test:** for each screen using an accent, toggle light/dark and confirm the
accent fill retains its brand hue and the foreground on it keeps ≥ 4.5:1 contrast.

---

## 5. Inverse / on-color white rule

`#FFFFFF` (and equivalent `theme.colors.onPrimary` / `theme.colors.inverseText`) is
allowed **only** when it is foreground ink or an icon/tick on a saturated accent fill,
or a border/ring that deliberately separates artwork from a card. It is never used as a
light-mode card, input, sheet, or page background.

Examples: white icon on an amber primary button, white rank numeral on a podium medal,
white text on the myth red gradient, white check on a success chip.

**Owner:** Mobile / Design Systems.
**Visual test:** confirm every white foreground sits on an accent/dark art fill whose
contrast passes in both modes, and that no white panel appears in dark mode.

---

## 6. Verification

```bash
npm run check:theme-colors   # static gate — must print "passed (68 files scanned)"
npm run test:theme           # runtime role/palette/createStyles/withAlpha tests
npx tsc --noEmit             # type safety
npm run lint                 # 0 errors required
```

When adding a new intentional fixed color:

1. Prefer a theme role (`theme.colors.*`, `theme.palettes.*`).
2. If a literal is genuinely required, add `// theme-allow: <short reason>` on the line.
3. Add a row to §3 or §4 with the file:line, reason, owner, and a concrete visual test.
4. Re-run the four commands above and include the exception in review.

---

## Retired roles (no exceptions)

Per [`NEUTRAL_THEME_ORANGE_ACCENT_SPEC.md`](./completed/NEUTRAL_THEME_ORANGE_ACCENT_SPEC.md) the
following are removed and `check:theme-colors` fails on them in `app/` and `components/`:
`pageGradientTop/Bottom`, `creamTint`, `creamBorder`, `amber*` roles, `palettes.amber`,
`accents.indigo`, and the indigo / warm-header / navy literals listed in the script.
There are no indigo exceptions: the Guide character is bitmap artwork, not a themed color.
Page backgrounds must use `theme.colors.background`; remaining `LinearGradient` uses
are artwork, medals and celebration effects only.
