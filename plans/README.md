# Animation Plans — AtomIQ

Plans written from the animation audit (find-animation-opportunities + full app audit). Each plan is
self-contained: a model with zero context can execute it. Stamp commit for all plans:
`36e3fe3` (batch 001-004), `58ecc8d` (batch 005-014), `45c9f92` (batch 015-019).

| # | Plan | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| 001 | Myth Buster swipe dismisses on fling velocity | HIGH | Interruptibility | DONE — executed in worktree `../AtomIQ-plan-001` (branch `plan/001-fling-velocity`) |
| 002 | Progress-bar fills glide (quiz header + missions hero) | MEDIUM | Missed opportunities | DONE — executed in worktree `../AtomIQ-plan-002` (branch `plan/002-progress-fills`); Site A required a plan correction (hooks placement), applied and re-executed |
| 003 | "Claimed" pill pops in on mission claim | MEDIUM | Missed opportunities | DONE — executed in worktree `../AtomIQ-plan-003` (branch `plan/003-claim-pop`) |
| 004 | Shared Button gets spring press scale | MEDIUM | Physicality / Cohesion | DONE — executed in worktree `../AtomIQ-plan-004` (branch `plan/004-button-press`) |
| 005 | Adopt the app's motion tokens in Myth Buster | MEDIUM | Easing & duration / Cohesion | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`); foundation for 006-014 |
| 006 | Animate the statement card into place instead of teleporting | HIGH | Physicality & origin | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`) |
| 007 | Make the game progress bar glide via scaleX | MEDIUM | Performance / Missed opportunities | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`) |
| 008 | Give MYTH/FACT presses the app's 150ms press motion | MEDIUM | Physicality & origin / Cohesion | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`); review correction applied (press lip/face → transform translateY) |
| 009 | Let the streak banner exit instead of vanishing | MEDIUM | Interruptibility / Missed opportunities | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`) |
| 010 | Give the timer's last-3-seconds warning a physical wiggle | LOW | Easing & duration | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`) |
| 011 | Pop the score badge on XP gain | LOW | Missed opportunities | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`) |
| 012 | Count the results stats up on the summary card | LOW | Missed opportunities | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`) |
| 013 | Pop the results mascot into view | LOW | Missed opportunities | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`) |
| 014 | Fade between the game's three screens | LOW | Missed opportunities | DONE — executed in worktree `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`) |
| 015 | Replace profile flip height layout animation with transform-friendly layout | HIGH | Performance | DONE — executed in worktree `../AtomIQ-plan-batch3` (branch `plan/batch3`), merged |
| 016 | Tone down tab bar press to 0.97 and remove spring bounce | HIGH | Purpose & frequency / Physicality | DONE — executed in worktree `../AtomIQ-plan-batch3` (branch `plan/batch3`), merged |
| 017 | Give Edit Profile modal a spatial entrance from its trigger | MEDIUM | Physicality & origin | DONE — executed in worktree `../AtomIQ-plan-batch3` (branch `plan/batch3`), merged |
| 018 | Branch all motion on prefers-reduced-motion | MEDIUM | Accessibility | DONE — executed in worktree `../AtomIQ-plan-batch3` (branch `plan/batch3`), merged |
| 019 | Consolidate duplicated EASE_OUT and duration tokens | MEDIUM | Cohesion & tokens | DONE — executed in worktree `../AtomIQ-plan-batch3` (branch `plan/batch3`), merged |

**Verification**: all four worktrees pass `npx tsc --noEmit` and `npm run lint` (0 errors; 19 pre-existing warnings). The single `services/content-db.ts` TS2307 seen during execution was an artifact of the worktrees missing the untracked `types/` shim — resolved by copying it in, not a regression. All four changes review-approved against the `review-animations` bar (see execute session).

**Batch 2 (005-014)**: executed as one sequential batch in `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`, node_modules symlinked, `types/` + WIP `app/mythbuster/index.tsx` copied in); all ten merged onto the main working tree and review-approved against the `review-animations` bar. One review finding (008 pressed the lip/face via animated `top`/`bottom` layout props) was fixed in the worktree before merging — the lip is static and the face press uses `transform: translateY`, so all motion is transforms/opacity. Main tree passes `npx tsc --noEmit` (0 errors) and `npx eslint app/mythbuster/index.tsx` (0 errors; 3 pre-existing warning). Known follow-up (non-blocking, accepted): 006's card entrance leaves ~300ms empty backdrop before the new card rises in (~560ms question-to-question); a later pass could overlap the entrance with the exit tail.

**Batch 3 (015-019)**: executed as one sequential batch in `../AtomIQ-plan-batch3` (branch `plan/batch3`, node_modules symlinked, WIP copied); all five merged onto the main working tree and review-approved. `npx tsc --noEmit` 0 errors, `npx eslint` on touched files 0 errors (6 pre-existing warnings). `grep -rn "bezier(0.23" app/ theme/` now shows only `theme/motion.ts`. Review: 015 removes `height` layout jank, 016 makes tab bar crisp, 017 adds modal scale from trigger, 018 keeps `opacity` for reduced-motion, 019 consolidates tokens — all `transform`/`opacity` only, `EASE_OUT`/`DURATION` from `theme/motion.ts`.

**Integration note**: each worktree also contains the repo's uncommitted WIP (applied so plans matched the code they were written against). To merge a plan, take only its files' diff from the worktree (`git diff <worktree> -- <files>`) onto the main working tree — the diffs are isolated per plan file.

## Recommended execution order

1. **019** — foundation: single source of truth for `EASE_OUT`/`PRESS_EASING`/`DURATION` — every later plan consumes it; do first.
2. **015** — profile flip height is the only `height`-based layout animation on a hero card; biggest frame-drop fix.
3. **016** — tab bar is hit tens/day; heavy `scale(0.9)` spring makes core nav feel bouncy.
4. **017** — Edit Profile modal is the profile's primary spatial seam (teleporting white card).
5. **018** — accessibility branching — touches 5 files, should land after the above so its `useReducedMotion` wrappers cover the new motion.
6. **001** — the game's primary gesture is the only non-physical interaction in the app; smallest diff, highest feel-per-line.
7. **002** — two silent teleporting fills; visible on the app's main learning loop.
8. **003** — the day's payoff moment; tiny diff.
9. **004** — first-run CTA; app-wide component the rest of the product will build on.
10. **005** — defines `EASE_OUT` / `PRESS_EASING` in `app/mythbuster/index.tsx`; every later plan in the batch consumes them. Execute first, apply the rest in order.
11. **006** — the game's most-felt teleport (every statement swap).
12. **007** — progress fill jump, on the main learning loop.
13. **008** — press motion on every tap.
14. **009** — streak-banner vanish.
15. **010** — timer wiggle personality.
16. **011-014** — delight additive pass (score pop, stat count-up, mascot pop, screen fades); any order, after 005.

## Dependencies

- **Batch 1 (001-004)**: none — all four touch disjoint files (`app/mythbuster/index.tsx`,
  `app/quiz/[id].tsx` + `app/missions.tsx`, `components/ui/button.tsx`) and can be
  executed in any order, including in parallel. 002 is the only multi-file plan.
- **Batch 2 (005-014)**: 005 is the foundation (easing consts); 006, 007, 008, 009,
  010, 011, 013, 014 all reference `EASE_OUT` (and 008 uses `PRESS_EASING`).
  012 uses neither const but touches the same file. All ten touch ONLY
  `app/mythbuster/index.tsx` — execute them as one sequential batch in a single
  worktree (per-plan parallel worktrees would produce same-file conflicts).
- **Batch 3 (015-019)**: 019 is the foundation (`theme/motion.ts`); 015, 016, 017 all reference `EASE_OUT`/`DURATION` from it. 018 is independent but should land after 015-017 so its `useReducedMotion` branches cover the new motion. Batch 3 touches disjoint files except 015/017/018 all touch `profile.tsx` — execute 019 first, then 015, 016, 017, 018 sequentially in one worktree to avoid `profile.tsx` conflicts. 018 touches 5 files — run it last in the batch.
- Plan 012's stat computation note: reuse the results-branch math
  (`correctAnswers`/`wrongAnswers`/`accuracy`) at component top level — do not
  duplicate mode-filtering logic.

## Status updates

Mark plans DONE here as they land. Re-run `improve-animations reconcile` after any
related refactor to refresh stale `file:line` references.