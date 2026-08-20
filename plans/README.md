# Animation Plans — AtomIQ

Plans written from the animation audit (find-animation-opportunities pass). Each plan is
self-contained: a model with zero context can execute it. Stamp commit for all plans:
`36e3fe3` (batch 001-004), `58ecc8d` (batch 005-014).

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

**Verification**: all four worktrees pass `npx tsc --noEmit` and `npm run lint` (0 errors; 19 pre-existing warnings). The single `services/content-db.ts` TS2307 seen during execution was an artifact of the worktrees missing the untracked `types/` shim — resolved by copying it in, not a regression. All four changes review-approved against the `review-animations` bar (see execute session).

**Batch 2 (005-014)**: executed as one sequential batch in `../AtomIQ-plan-mythbuster-motion` (branch `plan/mythbuster-motion`, node_modules symlinked, `types/` + WIP `app/mythbuster/index.tsx` copied in); all ten merged onto the main working tree and review-approved against the `review-animations` bar. One review finding (008 pressed the lip/face via animated `top`/`bottom` layout props) was fixed in the worktree before merging — the lip is static and the face press uses `transform: translateY`, so all motion is transforms/opacity. Main tree passes `npx tsc --noEmit` (0 errors) and `npx eslint app/mythbuster/index.tsx` (0 errors; 3 pre-existing warning). Known follow-up (non-blocking, accepted): 006's card entrance leaves ~300ms empty backdrop before the new card rises in (~560ms question-to-question); a later pass could overlap the entrance with the exit tail.

**Integration note**: each worktree also contains the repo's uncommitted WIP (applied so plans matched the code they were written against). To merge a plan, take only its files' diff from the worktree (`git diff <worktree> -- <files>`) onto the main working tree — the diffs are isolated per plan file.

## Recommended execution order

1. **001** — the game's primary gesture is the only non-physical interaction in the
   app; smallest diff, highest feel-per-line.
2. **002** — two silent teleporting fills; visible on the app's main learning loop.
3. **003** — the day's payoff moment; tiny diff.
4. **004** — first-run CTA; app-wide component the rest of the product will build on.
5. **005** — defines `EASE_OUT` / `PRESS_EASING` in `app/mythbuster/index.tsx`; every
   later plan in the batch consumes them. Execute first, apply the rest in order.
6. **006** — the game's most-felt teleport (every statement swap).
7. **007** — progress fill jump, on the main learning loop.
8. **008** — press motion on every tap.
9. **009** — streak-banner vanish.
10. **010** — timer wiggle personality.
11. **011-014** — delight additive pass (score pop, stat count-up, mascot pop, screen
    fades); any order, after 005.

## Dependencies

- **Batch 1 (001-004)**: none — all four touch disjoint files (`app/mythbuster/index.tsx`,
  `app/quiz/[id].tsx` + `app/missions.tsx`, `components/ui/button.tsx`) and can be
  executed in any order, including in parallel. 002 is the only multi-file plan.
- **Batch 2 (005-014)**: 005 is the foundation (easing consts); 006, 007, 008, 009,
  010, 011, 013, 014 all reference `EASE_OUT` (and 008 uses `PRESS_EASING`).
  012 uses neither const but touches the same file. All ten touch ONLY
  `app/mythbuster/index.tsx` — execute them as one sequential batch in a single
  worktree (per-plan parallel worktrees would produce same-file conflicts).
- Plan 012's stat computation note: reuse the results-branch math
  (`correctAnswers`/`wrongAnswers`/`accuracy`) at component top level — do not
  duplicate mode-filtering logic.

## Status updates

Mark plans DONE here as they land. Re-run `improve-animations reconcile` after any
related refactor to refresh stale `file:line` references.