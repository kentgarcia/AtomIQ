# 019 — Consolidate duplicated EASE_OUT and duration tokens

- **Status**: TODO
- **Commit**: 45c9f92
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 5 files, ~25 lines

## Problem

`EASE_OUT` and related durations are hand-typed in 4+ files — a cohesion finding per AUDIT.md §7 ("Five hand-typed cubic-beziers that almost match is a consolidation finding"):

```ts
// app/(tabs)/index.tsx:113 — current
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// app/(tabs)/profile.tsx:44 — current
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// app/(tabs)/leaderboard.tsx:38 — current
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// app/explorer/atom-maze.tsx:256 — current
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
```

Plus `PRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1)` at `app/(tabs)/index.tsx:109` and `app/mythbuster/index.tsx` (after plan 005), and magic durations `260`, `550`, `150`, `200`, `100` scattered without tokens.

Curve and duration should live as shared tokens. Plans 015-018 all reference `EASE_OUT` — without consolidation the executor will re-define it a fifth time, and a future tweak will miss a file.

## Target

Create a single motion token module and make all consumers import it:

```ts
// target — theme/motion.ts (new)
import { Easing } from "react-native-reanimated";
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);
export const PRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1);
export const DURATION = {
  press: 150,
  small: 180,
  medium: 260,
  modal: 250,
  flip: 400, // was 550, now within 200-500Modal budget
} as const;
export const SPRING = { damping: 18, stiffness: 220 } as const;
```

Then in consumers:

```ts
// target — app/(tabs)/profile.tsx:31
import { EASE_OUT, DURATION } from "@/theme/motion";
// remove local const EASE_OUT = ...
// use layout={LinearTransition.duration(DURATION.medium).easing(EASE_OUT)}
```

## Repo conventions to follow

- Tokens live in `theme/` — exemplar: `theme/tokens.ts` and `theme/index.ts` already export `spacing`, `fontFamilies`, `Palette`. Add `theme/motion.ts` and re-export from `theme/index.ts` (or `theme/tokens.ts`) to keep import path `@/theme/motion` or `@/theme`.
- Existing token pattern: `import { useTheme, type Palette, fontFamilies } from "@/theme"` — follow same barrel, e.g. `import { EASE_OUT } from "@/theme/motion"`.
- Do not invent parallel easings — copy the exact beziers from AUDIT.md §2: `--ease-out: cubic-bezier(0.23,1,0.32,1)`, `--ease-in-out: cubic-bezier(0.77,0,0.175,1)`, `--ease-drawer: cubic-bezier(0.32,0.72,0,1)`.

## Steps

1. **Create `theme/motion.ts`** with the exports above (beziers via `Easing.bezier`, durations, spring). Match the exact beziers from AUDIT.md — do not approximate.

2. **Re-export** from `theme/index.ts` (or `theme/tokens.ts`):
   ```ts
   export * from "./motion";
   ```

3. **Replace local definitions**:
   - `app/(tabs)/index.tsx:109,113` — delete `PRESS_EASING` and `EASE_OUT` consts, add `import { EASE_OUT, PRESS_EASING, DURATION } from "@/theme/motion"`, and replace `duration: 260` with `DURATION.medium`, `duration: 550` with `DURATION.flip`, `duration: 150` with `DURATION.press`, `duration: 200` with `DURATION.small`.
   - `app/(tabs)/profile.tsx:44` — delete `const EASE_OUT = …`, add import, replace `260`/`550`/`180`/`150` with `DURATION.*`.
   - `app/(tabs)/leaderboard.tsx:38` — same.
   - `app/explorer/atom-maze.tsx:256` — same.
   - `app/mythbuster/index.tsx` — after plan 005 it already has `EASE_OUT`/`PRESS_EASING` locals at top — replace with import from `@/theme/motion`.

4. **Verify no `Easing.bezier(0.23` remains outside `theme/motion.ts`** via `grep -rn "bezier(0.23" app/ theme/`.

5. **Keep `LinearTransition.duration(DURATION.medium).easing(EASE_OUT)`** pattern — already used at `profile.tsx:324` and `leaderboard.tsx:389`.

## Boundaries

- Do NOT change any `withTiming`/`withSpring`/`LinearTransition` durations beyond swapping the literal for the token (e.g. `260` → `DURATION.medium`); do NOT retune curves.
- Do NOT move non-motion code, and do NOT add new dependencies.
- Do NOT rename `EASE_OUT` to `easeOut` or change casing — keep as documented.
- If `theme/motion.ts` already exists at commit `45c9f92`, merge rather than overwrite and STOP if conflict.

## Verification

- **Mechanical**: `npx tsc --noEmit` 0 errors; `grep -rn "bezier(0.23" app/ theme/ --include="*.ts" --include="*.tsx"` shows only `theme/motion.ts`. `npx eslint theme/motion.ts` 0 errors.
- **Feel check**: No visual change — run profile flip, home node press, leaderboard podium pulse, mythbuster card entrance; all timings feel identical to before (tokens are the same values, just shared).
- **Done when**: `app/(tabs)/index.tsx`, `profile.tsx`, `leaderboard.tsx`, `explorer/atom-maze.tsx`, `mythbuster/index.tsx` all import `EASE_OUT` from `@/theme/motion` and no file defines `Easing.bezier(0.23` locally.

