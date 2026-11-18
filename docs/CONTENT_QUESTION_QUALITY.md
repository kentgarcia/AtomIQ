# Content question quality

Spec reference: `ATOMIQ_FEEDBACK_SUMMARY_SPEC.md` section 4.3 (question completeness and context).

Every learner-facing question must read as a complete, understandable thought from the current screen alone. This is enforced by a machine pass and a short human review.

## Commands

| Command | What it does |
| --- | --- |
| `npm run validate:content` | Read-only check of `content/database/content.db`. Exit code 1 on any error. Add `--warnings` to list warnings, `--json` for machine output, `--db <path>` to check another file (for example `assets/database/content.db`), `--strict-review` for the release gate that also makes unverified content references errors. |
| `npm run test:content` | Unit tests for the rule engine (`scripts/test-validate-content.mjs`). No database needed. |
| `node --no-warnings scripts/content-migration/fix-question-context.mjs [--dry-run]` | Repeatable migration that lists every question fix as `id: old -> new`, checks the old text still matches, re-checks that the correct answer is unchanged, and applies all changes in one transaction. |

Rules live in `scripts/lib/content-rules.mjs`. The validator is `scripts/validate-content.mjs`.

## Surfaces covered

- `quiz_questions` (all quizzes)
- `mythbuster_questions` (MythBuster, and also the Atom Maze boss pool and Endless mode, which draw from this table and shuffle options)
- `lesson_steps` of type `assessment`, `lab` (task and scenario), `myth_buster`, plus placeholder checks on `micro_learn`, `briefing`, `debrief`
- `maze_rooms.questions` and any inline `mazes.boss.questions` (scramble clues get structural checks only; the game does not currently render them)
- `myths` (the Myth-or-Fact statements and realities)
- curriculum v2: `items`, `lesson_cards` and `content_references` (rules in `scripts/lib/curriculum-rules.mjs`)

## Rules

Severity is `error` (fails the run) or `warn` (reported for humans, does not fail).

| Rule | Severity | Catches |
| --- | --- | --- |
| `stem-fragment` | error | Stem starts lowercase or with and/or/but/because/that/whose/then/also/of; ends with `:` but is not an imperative ("Nuclear fusion involves:"); has no terminal punctuation; condition with no question ("If half-life is 5 years, remaining after 15 years?"); shorthand like `vs`, `w/`. |
| `not-a-question` | error | Multiple-choice/lab stem that is neither a question nor an instruction (Select/Choose/Identify...). |
| `truncated` | error / warn | Ends in an ellipsis, hyphen, dash, comma or semicolon, or on a dangling article/conjunction. Missing terminal punctuation in explanations is a warning. |
| `stem-too-short` | error | Under 15 characters (8 for `fill_blank`). |
| `missing-context` | error | Names no subject ("Which of these?", "What about it?", "Which statement is true?"); starts with an antecedent-less pronoun (It/They/This/These...). A pronoun is fine when an earlier sentence in the stem supplies the subject. |
| `depends-on-previous-step` | error | "In the previous question", "the above example", "based on what you just learned". |
| `missing-visual` | error | Refers to an image/diagram/chart "above/below/shown" when no image or visual is attached. |
| `placeholder` | error | TODO/TBD/FIXME, lorem ipsum, `{{ }}`/`{name}`/`%s`, empty `[ ]`, `[insert ...]`, `undefined`/`NaN`/`[object Object]`, `N/A`, an option that is only "null"/"-"/"?", and `___` outside `fill_blank`. |
| `dangling-punctuation` | error | Unbalanced brackets or quotes, stray leading punctuation, `,?` or `:.`, space before punctuation, doubled punctuation. |
| `options-shape` / `empty-option` | error | Fewer than 2 options, non-string options, empty options. |
| `duplicate-option` | error | Two options equal after case/punctuation normalisation. |
| `question-equals-option` | error | An option identical to the question text. |
| `option-letter-prefix` | error | Option starts with "A." or "B)" (the UI adds its own labels). |
| `position-dependent-option` | error / warn | "Both B and C", "Option A" (always error). "All/None of the above" is an error in shuffled pools (MythBuster, Atom Maze) and a warning elsewhere. Use "All of these" / "None of these". |
| `stem-option-mismatch` | error | Stem asks for ONE answer ("Name one...") but an option says "All of these". |
| `answer-type` / `answer-range` | error | Correct answer is the wrong type, an index outside the option list, or a lab answer that is not an option id. |
| `true-false-shape` | error | `true_false` options are not exactly `["True", "False"]`. |
| `explanation-missing` | error | Empty explanation. |
| `explanation-restates-answer` | error | Explanation only says "Correct answer: X." or repeats the option. |
| `explanation-contradicts-answer` | error | A true/false explanation that opens with "True"/"False" opposite to the stored answer. |
| `explanation-mismatch` / `explanation-thin` / `option-too-long` | warn | Explanation opens with a different option's text; explanation under 20 characters; option over 160 characters. |
| `conflicting-duplicate` | error | The same question appears twice and one copy marks as correct an answer the other copy lists as wrong. |

Heuristics are deliberately conservative. If a rule flags healthy content, fix the rule and add a negative test fixture in `scripts/test-validate-content.mjs`; do not distort the content.

## Human review checklist

Run `npm run validate:content`, then read a sample (about 10 per pool, always including newly added items) with this checklist:

1. Cover the options with your hand. Can a beginner tell what is being asked from the stem alone?
2. Does the stem avoid depending on a previous screen, an unseen diagram, or "the above"?
3. Is the stem a full sentence or a clear instruction, not a note ("What is prompt vs delayed neutrons?")?
4. Are acronyms and jargon expanded or explained somewhere on the same screen (LET, ALARA, NPT)?
5. Is exactly one option correct, and does the stored answer point at it? Re-check after any option edit or reorder.
6. Are the wrong options plausible but clearly wrong, and free of "All of the above" or letter references (options get shuffled)?
7. Does the explanation teach why, in a sentence or two, and agree with the answer and stem?
8. Does a visual, if any, match the question and the answer?
9. Is the fact accurate and current? Mark doubtful items for a subject-matter reviewer; do not guess.
10. Would the question still make sense if it were drawn on its own (random quiz, Endless Atom Maze, boss fight)?

## Known follow-ups (outside the automated rules)

- Some true/false items make strong claims that need subject-matter review (for example "Every gram of nuclear material worldwide is recorded and tracked").
- Atom Maze scramble clues are noun phrases by design and are not rendered today; revisit if scramble rounds ship.
- The MythBuster hard/medium explanations were rewritten in this pass and should get a subject-matter read before release.
