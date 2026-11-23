# Units 1 and 2: lesson rework

Status: built 2026-11-23 (a draft, not published). All 10 lessons were rewritten in `content/source/units/inside-the-atom/` and `radioactivity/`. Differences from the plan below:

- `why-nuclei-decay` and `half-life` still list three objectives (a validator warning). "Random for one" was NOT moved into Half-life: it would have made that lesson teach four, so each of the two lessons keeps its three objectives as two topics (an idea plus its vocabulary, or its meaning plus the group idea).
- No sort is left in any of the 10 lessons (the items stay in the bank for practice). Predictions are kept only in Meet the atom and Why do nuclei decay?; the other predictions are no longer on a card but stay in the bank.
- Items brought into a lesson from the practice bank (`u1-x-not-atoms`, `u1-l4-choice-share`, `u1-x-unstable-which`) gained `lesson` in their surfaces; no item id was added, retired or renamed. Card ids are lesson-local and some changed.
- The owner played Atoms are everywhere and approved it; the other nine lessons were not tested by the owner and do not need to be (decision 2026-11-23).
- Lesson minutes: Atoms are everywhere and Decay chains went from 4 to 5.
- `scripts/golden/figures-shipped.json` lost the two cards that were removed and re-pinned `why-nuclei-decay/c06`.

Written 2026-11-23.

Applies the Unit 3 rework (same day: one or two topics a lesson, a different shape for each lesson, more teaching before questions, reasons in explanations, no hard sorts, adaptive validator rules) to the two units that already shipped in `1.0.0`. Unit 3 is the pilot that proved the approach; this spec is what is different when the lessons are published ones.

Related: `LESSON_RESTRUCTURE_SPEC.md` (lesson anatomy), `UNIT_2_RADIOACTIVITY_SPEC.md`, `FOUR_UNIT_RELEASE_SPEC.md`, `docs/critical/CONTENT_AND_USER_DATA_RULES.md` (read before touching any id), `docs/features/CONTENT_SOURCE_PHASE5_SPEC.md` (the `.atomiq` lesson files).

## 1. Why

The feedback on Unit 3 was: the lessons are templated, hard to understand, there are 2 to 3 teaching bubbles and the rest are questions, sorts are the hardest part, and the other questions are not explained well. Units 1 and 2 were written first and have the same problems, measured from the database on 2026-11-23:

| What | Units 1 and 2 today |
| --- | --- |
| Same opener | 9 of 10 lessons open with a `predict` item (only Atoms are everywhere does not) |
| Same shape | teach, check, teach, check ... then a run of 3 to 8 questions at the end |
| Teaching per lesson | 88 to 221 words in total (3 to 8 teach cards of about 20 to 30 words) against 5 to 10 questions |
| Longest run of questions | 8 in a row (Alpha, beta and gamma), 5 in Decay chains and Why do nuclei decay |
| Sorts | 8 sorts in 6 of 10 lessons (Isotopes and Stable and unstable nuclei have two each); mostly 2 groups of 3 to 4 things, one of 3 groups of 6 (Radioactivity is natural) |
| Topics | 8 lessons teach two objectives, Half-life and Why do nuclei decay teach three |
| True or myth | 20 in 10 lessons (3 each in Alpha, beta and gamma, Decay chains and Half-life); many only restate the sentence just read |

Unit 1 is also the first thing a new learner meets, straight after onboarding, so it matters most.

## 2. Goals and non-goals

Goals

1. Every lesson teaches one or two things. Three objectives become two lessons' worth, or one is moved or cut (section 5).
2. No two lessons in a unit have the same shape (section 3).
3. A learner who reads the lesson can answer its questions without guessing: the reason is taught before it is asked, and a wrong answer's feedback gives the reason, not only the fact.
4. Sorts are rare, small and easy (section 4).
5. Same facts, same verified sources. No new claim is added without a verified reference; analogies are said to be analogies.

Non-goals

- No change to Unit 3 (done), the lesson screens, the card components, the XP rules or the path (no node is added, removed or reordered, see section 6).
- No new item types, no new mechanic, no new unit.
- Not a rewrite of what the units teach: the objectives stay, only how they are taught changes.
- Practice, checkpoint, test-out, review and the Atom Maze keep drawing from the same item bank.

## 3. Principles (dynamic, not a template)

These replace the fixed rules the lessons were written to. The validator no longer enforces a shape (it has floors and ceilings as errors and targets as warnings, `LIMITS` in `scripts/lib/curriculum-rules.mjs`), so the writer decides each lesson's shape from what it teaches.

1. **Teach first, ask second.** A reading run is measured in words (warning at 150, error at 260 in a row), not in cards. A concept that needs a picture, an analogy and a worked example gets all three; one that is a single fact gets one bubble.
2. **The question matches the teaching.** An item may only use a word, a rule or a reason that the lesson already said on this page or in an earlier lesson (`relies_on`).
3. **Shape follows the content.** Pick the opener and the middle from what the lesson is about, and never reuse the previous lesson's choice. Options, each used where it fits:
   - a puzzle or surprising observation first, answered by the lesson (Unit 3, Detecting radiation);
   - a prediction first, only when the learner can honestly guess from what they know;
   - teach, then one check, repeated (good for steps that build on each other);
   - one long teaching stretch with an analogy, then a short set of questions (good for an idea that needs the whole picture before it can be tested);
   - a worked example where the learner does the last step (Half-life);
   - a lesson that ends on a connected activity or a sim, not a list of questions.
4. **Fewer, better questions.** A lesson has about 4 to 7 scored items, not 5 to 10. An item that only restates the sentence just read is cut or moved to practice. Keep the variety of item types, but do not add a type for its own sake.
5. **Explain the answer.** Every item's `explanation` says why, in one or two plain sentences; every wrong option of a choice carries a `note` that names the misunderstanding. Never "Correct: it is X".
6. **One plain tone in lessons** (the character voices live in chat, feed and blog, `NPC_VOICE_SPEC.md`).
7. **Pictures carry their weight.** At least half of the cards have a figure; reuse the figure library (`components/lesson/visual/figures/`), and an existing figure id never changes meaning.

## 4. Rules for sorts, matches and orders

Sorts were the hardest part. A learner is asked to apply a rule to several things at once, and a single wrong thing resets it.

- Default: no sort. Use a `choice` or a `true_or_myth` for a yes/no, a `match` for pairs.
- A sort is allowed only when (a) the groups were each taught and shown with a picture just before, (b) there are two groups, and (c) there are three to four things, each clearly in one group (no thing that needs a rule the lesson did not give).
- At most one sort a lesson and no sort in two lessons in a row.
- A `match` has at most 4 pairs. An `order` has at most 4 steps and is only used for a real sequence (a decay chain, a sequence of sizes) that was told in that order.
- `radioactivity-is-natural` today has a 3-group sort of 6 things: replace it with two small items or cut it.

## 5. Lesson by lesson

Item ids are shipped keys (section 6): the plan says which items stay in a lesson, which go to practice only, which are rewritten in place (same id, new wording), and where a new item is added with a new id. "Move" means the item leaves the lesson's cards but stays in the bank for practice, checkpoint and the Atom Maze.

### Unit 1: Inside the Atom (Hal)

| Lesson | Topics now | Plan |
| --- | --- | --- |
| Atoms are everywhere (`atoms-are-everywhere`) | made of atoms; too small to see | Keep both. Replace the opening sort ("made of atoms vs light and heat") with a short teach and a yes/no: the sort is the first question of the learner's first lesson. Longer teaching on scale with one picture of the three sizes, then the existing order item. About 5 scored items. |
| Meet the atom (`protons-neutrons-electrons`) | three particles; the tiny nucleus | Keep the stadium prediction (the learner can guess it). Teach the three particles with one picture before the match. Drop the location sort (it repeats the match). Merge the two "not tiny planets" and "how do we know" cards into one deeper card. |
| Elements (`elements-and-the-periodic-table`) | protons set the element; changing protons changes it | Already one idea said twice: tell it once with a worked example (gold and oxygen), then two checks and the fill. Open with a puzzle ("what makes gold gold?") instead of a prediction. |
| Isotopes (`isotopes`) | same protons, different neutrons; isotope does not mean radioactive | Two lessons' worth of confusion. Split the teaching: first the definition with carbon as the worked example, then "not automatically radioactive" as its own beat. Replace the two sorts with one two-group sort of three things at most, or a match. Keep `u1-l4-tom-c13-stable` as the answer to the opening puzzle. |
| Stable and unstable nuclei (`stable-and-unstable-nuclei`) | stable vs unstable; unstable ones can change, and that is natural | Two sorts go; one choice and one true/myth replace them. Merge the two "Radioactivity is natural" cards. End on the connected idea that leads into Unit 2 instead of a run of questions. |

### Unit 2: Radioactivity (Ada)

| Lesson | Topics now | Plan |
| --- | --- | --- |
| Why do nuclei decay? (`why-nuclei-decay`) | spontaneous; random for one, regular for many; parent and daughter | Three objectives: split. Keep spontaneous plus parent/daughter vocabulary here; move "random for one, regular for many" to the start of Half-life, where it is needed. Teaching with the hotspot; at most 5 items. |
| Alpha, beta and gamma (`alpha-beta-gamma`) | particle or wave; what each one is | One topic told three ways. Run of 8 questions goes to at most 3 in a row. Replace the sort with the existing match and the radiation-id sim as the end activity; keep the three "same / pieces / light" true/myths only where each answers a different mistake. |
| Half-life (`half-life`) | meaning; the 100, 50, 25 pattern; a group, not a timer | Three objectives. Teach meaning and the pattern in one worked example the learner finishes (do not predict the numbers before they are shown); "group, not a timer" becomes the bridge from the random-nucleus idea moved here. Three true/myth items cut to one. |
| Decay chains (`decay-chains`) | a daughter can decay again; nothing vanishes | Keep the chain order item (it is a real sequence). Teach nothing-vanishes with a picture of the changed nucleus; one check, not three true/myths. |
| Radioactivity is natural (`radioactivity-is-natural`) | natural sources; radioactive is not always dangerous | The longest lesson (8 teach cards, 221 words) holds two topics. Keep the sources as the lesson and put "it depends" as the closing beat (type, amount and how it reaches the body, with the existing sources). Replace the 3-group sort of 6. |

The exact wording of each lesson is decided when it is written, from the facts already in the objectives and the verified references; this table is the intent, not the text.

## 6. Constraints from shipping

The units are published in `1.0.0`. From `CONTENT_AND_USER_DATA_RULES.md`:

- **Ids are permanent.** No lesson, path node, item or objective id is renamed or deleted. Rewrite text in place. A shipped item that leaves a lesson stays in the bank (practice, checkpoint, review and the Atom Maze keep using it); delete one only with `--retire "<reason>"`, and avoid that: it raises the release to a major.
- **Card ids are local to a lesson**, and changing them drops a learner's half-finished run of that lesson (`contentKeyOf`), which is fine: only lessons save, and only part-way ones. Finished nodes (`levels`) are untouched.
- **No path change.** No node is added, removed or reordered, so the lesson map, test-out and the story map do not change. Splitting a lesson into two is out of scope; a topic that no longer fits is moved to its neighbour or into practice.
- **Learner data:** `item_attempts` and `objective_mastery` keep their ids. An objective moved between lessons (`teaches`) still counts, mastery follows the objective.
- **Atom Maze:** levels read fixed item ids (`components/platformer/story-levels.ts`); an item that leaves a lesson stays in its pool, a retired one cannot.
- **The objective rules still hold:** each objective keeps at least 4 non-predict items with at least one `checkpoint` surface, and each taught objective at least 2 scored lesson items. When a lesson loses items, check the objective still has them in the bank.
- **Release size:** cards added or removed are rows added or removed, so `release:content` will suggest a minor (`1.1.0`). Do not hand-edit the version or the ledger; run `npm run release:content -- --publish` only after the owner has played the units.
- **Figures:** ids only grow; a new picture is a new id.

## 7. How to do it

1. Edit the `.atomiq` files in `content/source/units/inside-the-atom/` and `radioactivity/` (lessons, and objectives for item wording). Never a script and never a direct DB edit. Run `npm run content:sync` (dry run), then `--apply`.
2. Pilot with one lesson per unit: **Isotopes** (Unit 1, most confusing and two sorts) and **Half-life** (Unit 2, three objectives). The owner plays both and says whether the teaching to question ratio is right before the other eight are written.
3. Then the rest, one unit at a time, Unit 1 first.
4. After each lesson: `content:format`, `check:source`, `validate:content`, `test:curriculum-content`, `test:source-adapters`, `test:figures`, `test:chats`, `test:platformer`, `test:story-map`, `typecheck`, `lint`; then `npm run sync-content` and check only `CONTENT_DB_VERSION` moved.
5. Check what points at a lesson: chats and blog pieces that quote a lesson, feed templates, Ray's and Ada's and Hal's `npc_lines` (one per lesson, mirrored in `components/npc/npc-roster.ts`; change both), and `statements.atomiq`. A lesson whose opener changes from a prediction to a puzzle may want a new intro line.
6. Tell the owner to reload, and that nothing is published.

## 8. Rules changes

No rule change is expected: the adaptive `LIMITS` already allow all of the above. Two additions would help and are optional:

- A warning when a unit's lessons share the same card-kind sequence (shape) or the same opener (`lesson-variety` today checks one lesson only).
- A warning when an item uses a term that is not defined in the lesson or an earlier one (the `TERMS` list in `test-curriculum-content.mjs` is the start of it).

## 9. Open decisions

1. **Split or not.** The lessons that teach three objectives are cleaner as two lessons, but that adds path nodes (a minor release and a change to every learner's map). The default here is no new nodes. Decide if the owner wants the two extra nodes after the pilot.
2. **Which sorts survive.** Section 4 says none by default; the owner may want to keep the simple Unit 1 ones as the only place the item type is practised.
3. **Time.** Lesson `estimated_minutes` stays; if lessons get longer to read the owner may want 5 to 6 minutes on the Unit 1 lessons, as Unit 3 now has.
4. **Voice of the prediction.** Predictions are unscored; keep them only where the owner finds them fun.

## 10. Success

- No lesson shape or opener repeats within a unit; at most 3 questions in a row; no sort in more than 3 of the 10 lessons.
- At most two objectives in a lesson (Unit 1 and 2 warnings gone), 4 to 7 scored items a lesson.
- Every item has a reason in its explanation.
- All gates pass and `validate:content` has no new errors or warnings.
- The owner plays each unit and finds it easy to follow; the learner's first lesson (Atoms are everywhere) first of all.
