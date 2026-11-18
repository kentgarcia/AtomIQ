# AtomIQ: Unit 2, Radioactivity (specification)

> **Change after review:** the `decay-wait` "Wait" step was taken out of both lessons (L1 card 8 and L3 card 2): it added nothing the cards did not teach. The sim type, core and component still exist and are validated, but no lesson uses them. The sections below describe it as first designed.

**Status:** Draft for review. Nothing here is built or authored yet.
**Date:** 2026-11-17
**Owner:** AtomIQ product, content and engineering
**Applies to:** `scripts/content-migration/curriculum/unit-2.mjs` (new authoring source) and `scenes.mjs`, `content/curriculum/types.ts`, `scripts/lib/curriculum-rules.mjs`, `components/lesson/cards/` (new simulations), `components/lesson/visual/object-art.ts`, `scripts/content-migration/` (sync and glossary scripts), `components/npc/npc-roster.ts` (Hal's lines)
**Builds on:** `docs/LESSON_RESTRUCTURE_SPEC.md` (§4 unit map, §6 cards and limits, §12 Unit 1 as the model), `docs/NPC_TEACHERS_SPEC.md` (Hal teaches this unit), `docs/MEDIA_POLICY.md`, `components/motion/MOTION.md`

## 1. Goal

By the end of Unit 2 a learner can explain, in their own words:

> **Radioactivity is a natural process in which an unstable atomic nucleus changes into a more stable state, releasing radiation.**

They do not calculate decay equations or memorise nuclear notation to get there. The unit follows the same rule as Unit 1: **one core idea per lesson**, short plain sentences, and anything harder is an optional "Go deeper" card (tier `deeper`: never required, never scored).

Design principle for every lesson: **predict, see, interact, explain, debunk, recall.** The technical term arrives after the experience, not before. For example, half-life is introduced by letting the learner watch 100 unstable nuclei, and only then named.

### Non-goals

- No nuclear equations, conservation of mass number or atomic number, decay-energy calculations, beta-plus decay, electron capture, branching ratios or nuclear energy levels in Core.
- No dose, risk or health-effects teaching. That is Unit 4.
- No shielding, ionizing versus non-ionizing, detection or "irradiated versus contaminated" teaching. That is Unit 3. Unit 2 only plants the idea (see §3).

## 2. The five lessons

```text
        SOME NUCLEI ARE UNSTABLE            (Unit 1, L5)
                  │
                  ▼
   L1  THEY CHANGE BY THEMSELVES, AT RANDOM
                  │
                  ▼
   L2  WHAT COMES OUT: ALPHA, BETA, GAMMA
                  │
                  ▼
   L3  HOW FAST: HALF-LIFE (A GROUP, NOT A TIMER)
                  │
                  ▼
   L4  WHAT NEXT: THE DAUGHTER CAN DECAY TOO
                  │
                  ▼
   L5  WHERE IT EXISTS: RADIOACTIVITY IS NATURAL
```

| Lesson | Id | The one idea | The learner leaves thinking |
|---|---|---|---|
| L1 Why nuclei decay | `why-nuclei-decay` | An unstable nucleus can change on its own. When one particular nucleus changes cannot be predicted. | "Radioactivity isn't something people do to atoms. Some nuclei just change." |
| L2 Alpha, beta and gamma | `alpha-beta-gamma` | A decay can release different kinds of radiation. Alpha and beta are particles. Gamma is electromagnetic radiation. | "They are three different things." |
| L3 Half-life | `half-life` | Half-life describes how quickly a group of radioactive nuclei decreases. | "It's about a crowd, not a timer inside each atom." |
| L4 Decay chains | `decay-chains` | The new nucleus can be unstable too and decay again. | "One decay can start a whole chain." |
| L5 Radioactivity is natural | `radioactivity-is-natural` | Radioactivity and radiation exist in rocks, air, food, bodies and space, not only in nuclear facilities. | "It's part of the world, and radioactive doesn't automatically mean dangerous." |

Path (same shape as Unit 1): L1 → L2 → L3 → practice → L4 → L5 → checkpoint. Unit id `radioactivity`, position 2, teacher `npc-hal` (older, patient, tells stories; pocket watch for half-life), icon and tone to be chosen with the unit's art. Path node ids `u2-n1` to `u2-n7`.

## 3. What Unit 1 already teaches (one home per idea)

`LESSON_RESTRUCTURE_SPEC.md` §4.2 says an objective is taught in exactly one lesson and later lessons may use it but never re-teach it. Unit 1 L5 already covers a first pass of three ideas that this brief also wants. Unit 2 must **build on them, not repeat them**.

| Idea | Unit 1 (already authored) | Unit 2 |
|---|---|---|
| Stable and unstable nuclei exist; an unstable one can change and give off radiation | `u1-stable-unstable`, `u1-unstable-changes`, L5 | L1 relies on them. L1's new ideas are **spontaneous** and **random for one nucleus**, plus parent and daughter. |
| Radioactivity is natural (rocks, bananas, your body); "people made it" is a myth | `u1-unstable-changes`; items `u1-l5-tom-human-made`, `u1-l5-sort-source`, `u1-x-potassium`, `u1-x-rock-natural` | L5 **widens** it: soil, radon in air, food and the body, space, and "radioactive is not automatically dangerous". It does **not** re-ask "humans invented radioactivity" as a new true-or-myth. |
| Becquerel (story card, `deeper`) | Unit 1 L5 card `c12`, figure `becquerelPlate`, reference `ref-becquerel-1896` | `LESSON_RESTRUCTURE_SPEC.md` §4.2 puts Becquerel and the Curies in Unit 2. The story becomes a **Core story card in L5**. See §10 for the Unit 1 change this needs. |

Ideas planted but owned later (a teaser only, never a scored item in Unit 2):

| Misconception | Planted in | Owned by |
|---|---|---|
| "Being exposed to radiation makes something radioactive" | L5 closing card ("Later you'll learn why exposure is not the same as becoming radioactive") | Unit 3: irradiated, contaminated and radioactive are different |
| "Radiation always means nuclear radiation" | L2 (gamma is electromagnetic radiation, like light but far more energetic) and L5 final activity | Unit 3: ionizing and non-ionizing |
| "Radioactive means dangerous" | L5 (not automatically; depends on the type, the amount and how it reaches the body) | Unit 4: the dose scale and risk |

When Unit 3 teaches "exposure is not activation" it must be exact: gamma rays and X-rays do not make ordinary material radioactive, but some particles (neutrons, in a reactor for example) can. That caveat belongs in Unit 3, not here.

## 4. Misconceptions and where each is handled

| # | Misconception | Handled in | How |
|---|---|---|---|
| 1 | Radioactivity is something humans create | L5 (builds on Unit 1) | Becquerel story, natural sources, an order or choice item about what was found first. No repeat of the Unit 1 myth item. |
| 2 | Radioactive means automatically dangerous | L5 (detail in Unit 4) | "Not necessarily" card and a use-it choice. |
| 3 | An atom becomes radioactive because it is exposed to radiation | Tease in L5, own in Unit 3 | Teaser line only. |
| 4 | A radioactive atom is half gone after one half-life | L3 | "About half of the nuclei have decayed. The rest were not cut in half." |
| 5 | After one half-life the radioactivity is gone | L3 | 100, 50, 25, 12, 6 and a myth item. |
| 6 | Radioactive material stays radioactive forever | L3 | Half-lives range from a fraction of a second to billions of years; each one fades. Figure on a scale, values to verify (§9). |
| 7 | Alpha, beta and gamma are the same thing | L2 | Particle versus particle versus electromagnetic radiation; a myth item. |
| 8 | Radiation always means nuclear radiation | Plant in L2 and L5, own in Unit 3 | Gamma shown as "like light, far more energetic". |
| 9 | Once exposed to radiation it becomes radioactive | Tease in L5, own in Unit 3 | As #3. |
| 10 | Decay can be controlled like an on/off switch | L1 | Myth item "a radioactive atom needs a person to make it decay"; Go deeper: ordinary heating, cooling and chemistry hardly affect it. |
| 11 | A radioactive atom waits exactly one half-life before decaying | L3 | "Half-life describes a group, not a timer in each atom." |
| 12 | Every decay makes a stable atom | L4 | Myth item. |
| 13 | Decay means the atom disappears | L4 | "The nucleus changes into another nucleus. Nothing simply vanishes." |
| 14 | Gamma radiation is made of tiny pieces of the nucleus | L2 | Myth item. |

Research basis for the half-life items (#4, #5, #11) is the secondary-school radioactivity misconception literature already listed in `LESSON_RESTRUCTURE_SPEC.md` §17 (Prather; arXiv 2001.07746; IJPCE 125). Those were read as search summaries only.

## 5. Language rules

Same as Unit 1 (`LESSON_RESTRUCTURE_SPEC.md` §12.1): short plain sentences, at most 60 words on a teaching card, hard terms linked with `[[id|shown]]` to an encyclopedia entry, and never a term before the learner has seen the thing.

Wording to use and avoid:

| Say | Do not say |
|---|---|
| "An unstable nucleus can change into another nucleus." | "The atom decays into a more stable configuration via a transition." |
| "A fast electron comes out." (Core, beta) | "An orbiting electron is kicked out of the nucleus." (wrong model) |
| "About half of the nuclei have decayed." | "Half of each atom is gone." |
| "A group of nuclei follows a pattern." | "Each atom decays after one half-life." |
| "Radiation" for what comes out; "radioactive" for a nucleus that can decay. | Using them as synonyms. |

Beta Core wording must not say the electron was already in the nucleus. The mechanism (a neutron changes into a proton and an electron is emitted) is Go deeper only. Neither Core nor Go deeper should claim that *only* an electron comes out; an antineutrino is also emitted and is simply not named in this unit.

## 6. Objectives

Limits from `LESSON_RESTRUCTURE_SPEC.md` §6.2 apply: 2 to 4 objectives per lesson, at least 2 scored items per objective, at least 1 predict card, 8 to 16 cards, at least 50% interactive, at least 2 non-choice interactions (a simulation counts), every teaching card has a figure with alt text, at least 1 lesson reference.

| Id | Objective | Lesson |
|---|---|---|
| `u2-spontaneous` | Know that an unstable nucleus changes by itself: nobody has to trigger it | L1 |
| `u2-random-single` | Know that you cannot predict when one particular nucleus will decay, although a large group follows a pattern | L1 |
| `u2-parent-daughter` | Name the nucleus that decays (parent) and the nucleus it becomes (daughter) | L1 |
| `u2-particle-or-wave` | Know that alpha and beta are particles and gamma is electromagnetic radiation, so the three are different | L2 |
| `u2-recognise-radiation` | Say what each one is: alpha is 2 protons and 2 neutrons, beta is a fast electron, gamma is high-energy electromagnetic radiation | L2 |
| `u2-half-life-meaning` | Know that half-life is the time for about half of a large group of radioactive nuclei to decay | L3 |
| `u2-half-life-pattern` | Read the pattern 100, 50, 25, 12 and know that radioactivity fades but is not gone after one half-life | L3 |
| `u2-half-life-group` | Know that half-life describes a group, not a timer in each nucleus | L3 |
| `u2-decay-chain` | Know that a daughter can be unstable and decay again, until a stable nucleus is reached (a decay chain) | L4 |
| `u2-decay-changes-not-vanishes` | Know that a decay changes a nucleus into a different one; nothing simply vanishes | L4 |
| `u2-natural-sources` | Name natural places radioactivity and radiation come from: rocks and soil, radon in air, food and the body, space | L5 |
| `u2-not-always-dangerous` | Know that radioactive does not automatically mean dangerous; it depends on the type, the amount and how it reaches the body | L5 |

`reliesOn` for L1 is `u1-stable-unstable` and `u1-unstable-changes`; L2 relies on `u2-parent-daughter`; L3 relies on `u2-random-single`; L4 relies on `u2-parent-daughter`; L5 relies on `u1-unstable-changes` and `u2-decay-chain`. Validation checks these against path order.

## 7. Lesson outlines

Cards are listed in order. `(deeper)` is optional and unscored. "Item" cards are scored unless marked predict. Counts are targets; the authoring source decides the final ids (`c01`, `c02`, ...).

### L1. Why do nuclei decay? (`why-nuclei-decay`)

Misconceptions: a person must make it decay (#10); the exact moment can be predicted. Teacher: Hal.

1. `predict`: "An unstable nucleus is left alone for a very long time. What happens?" Options: it stays the same for ever; it can change by itself; someone has to trigger it; it disappears at once. Unscored.
2. `explain`: stable and unstable in the simplest words. Stable: can stay as it is. Unstable: can change into another state. **Radioactive** means an unstable nucleus can undergo radioactive decay. Figure: a stable and an unstable nucleus side by side.
3. `explain`: the basic change. Figure: unstable nucleus, an arrow labelled "changes by itself", then new nucleus plus radiation. Introduce **parent** and **daughter** in one sentence each.
4. `hotspot`: "Which one can change by itself?" Three nuclei (two stable, one unstable). On the correct tap the nucleus plays a short change animation (a scene `motion`, within the rules in §8.2).
5. `true_or_myth`: "A radioactive atom needs a person to make it decay." Myth.
6. `reveal` for card 1: the answer, with the change-by-itself figure.
7. `explain`: random for one, regular for many. "You can know a nucleus has a chance of changing. You cannot say when." Figure: 100 nuclei, one circled.
8. **Simulation `decay-wait`, mode `single`**: 20 unstable nuclei and a **Wait...** button. Each press, some change and some do not, in an order the learner cannot call in advance. Goal: press Wait three times. Reports `u2-random-single`.
9. `choice`: "Could you tell in advance which nucleus would change next?" (No.)
10. `choice` or `fill`: parent and daughter ("The nucleus that decays is the ___.") Two scored items for `u2-parent-daughter` overall.
11. `explain` (deeper): radionuclide, a different nuclide can result, energy leaves as particles or electromagnetic radiation, and ordinary heating, cooling and chemistry hardly affect decay. Figure: the same nucleus in a hot flame and in ice, both still unstable.
12. Final check, `choice`: "Why can a radioactive nucleus change even when nobody does anything to it?" Correct: it is unstable and can change on its own. Distractors are the wrong models (someone must trigger it, it needs heat, it is being used up).

Scored items by objective (lesson plus bank): `u2-spontaneous` (cards 5, 12 and one bank item), `u2-random-single` (cards 8 to 9 and one bank item), `u2-parent-daughter` (card 10 and one bank item).

### L2. Alpha, beta and gamma (`alpha-beta-gamma`)

Misconceptions: the three are the same (#7); gamma is little pieces of the nucleus (#14); the electron was orbiting inside the nucleus; radiation always means nuclear radiation (#8, planted).

1. `predict`: "When a radioactive nucleus changes, what can it release?" A particle; energy; both; nothing. Unscored. The answer is "both", and the lesson shows it.
2. `explain`: the overview, three names for what can come out. Figure: one nucleus with three different things leaving it.
3. `explain`: **alpha**. Made of 2 protons and 2 neutrons (the nucleus of a helium atom, no electrons). Figure: parent nucleus ejects a large, obvious chunky particle, leaving the daughter.
4. `explain`: **beta**. A fast-moving particle released in some decays; in the basic model it is a fast electron. Do not say it was orbiting the nucleus.
5. `explain`: **gamma**. Electromagnetic radiation, not a particle: very high-energy, like light but far more energetic. Figure: a wavy line leaving a nucleus.
6. `match`: alpha to "two protons and two neutrons", beta to "a fast electron", gamma to "high-energy electromagnetic radiation".
7. **Simulation `radiation-id`**: three animated nuclear changes, one at a time. The learner chooses Alpha, Beta or Gamma first, then the animation plays and confirms. Goal: all three identified (a wrong guess is allowed and re-tried). Reports `u2-recognise-radiation`.
8. `true_or_myth`: "Alpha, beta and gamma are three versions of the same thing." Myth.
9. `true_or_myth`: "Gamma radiation is made of tiny pieces of the nucleus." Myth.
10. `sort`: particle versus electromagnetic radiation: alpha, beta, gamma, plus a visible-light example as a gentle plant for #8 (light is electromagnetic radiation too). Scored under `u2-particle-or-wave`.
11. `explain` (deeper): alpha and beta change the make-up of the nucleus; gamma releases extra nuclear energy and changes neither the number of protons nor the number of neutrons. Mechanism of beta here, in one sentence: a neutron changes into a proton and an electron is emitted.
12. Final use-it item, `choice`: a described decay ("a fast electron is released") and the learner names the radiation; one more where a gamma ray leaves and the learner says whether the nucleus changed element (it did not).

Scored items: `u2-particle-or-wave` (cards 8, 10, 12 second half), `u2-recognise-radiation` (cards 6, 7, 12 first half, one bank item).

### L3. Half-life (`half-life`)

The signature lesson of the unit. Misconceptions: #4, #5, #6, #11. Teacher Hal's pocket watch is the motif, but the watch must not suggest a timer inside each atom: it ticks for the **group**.

1. `predict`: "100 radioactive nuclei. After one half-life, what happens?" A: one disappears. B: every atom becomes half as radioactive. C: about half of the nuclei have decayed. D: the sample becomes completely safe. Unscored, correct C.
2. **Simulation `decay-wait`, mode `half-life`**: 100 nuclei in a 10-by-10 grid, a **Wait one half-life** button and a live count. Pressing it: about half of the remaining nuclei change. Goal: three presses. The learner sees roughly 100, 50, 25, 12.
3. `reveal` for card 1: answer C with the grid figure. Here, and only now, the name: "The time it takes for a group to fall to about half is its **half-life**."
4. `estimate` or `choice`, "predict before reveal": 100 goes to ?, then 50 goes to ?, then 25 goes to ? (options 10, 25, 50, 90; then 25; then about 12). The learner commits, then the figure confirms. Scored.
5. `explain`: the numbers as evidence. 100, 50, 25, 12, 6. "About" every time. Figure: bars shrinking, with the label "about".
6. `true_or_myth`: "After one half-life, the radioactivity is gone." Myth.
7. `explain`: **a group, not a timer**. One nucleus: you cannot know when. A large group: a predictable pattern. This is the callback to L1 and must say so.
8. `true_or_myth`: "A radioactive atom always waits exactly one half-life before it decays." Myth.
9. `choice`: "After one half-life, which is true of the remaining nuclei?" The remaining ones were not cut in half; about half of the nuclei have decayed.
10. `explain`: half-lives differ a lot, from a fraction of a second to billions of years, so some fade fast and some take very long. Figure on a log-style ladder with three or four examples; values are candidates to verify (§9). Do not memorise.
11. `choice` use-it: "A sample starts with 80 nuclei. After two half-lives, about how many are left?" (About 20.)
12. `choice` or `sort` use-it: a "myth-buster" of three statements about half-life; the learner picks the true one.
13. `explain` (deeper): decay curve, exponential decay, decay constant. A figure of the curve only; no formula is required, and the formula is not tested.

Scored items: `u2-half-life-meaning` (cards 3 to 4 area, 9, bank), `u2-half-life-pattern` (4, 6, 11, bank), `u2-half-life-group` (8, 12, bank).

Authoring note on randomness: see §8.1. Cards 4 and 11 use the expected numbers (100, 50, 25, 12), never an observed count.

### L4. Decay chains (`decay-chains`)

Misconceptions: #12, #13.

1. `predict`: "A nucleus decays into a daughter. Is the daughter always stable?" Yes every time; no, sometimes it can be unstable too. Unscored, correct no.
2. `explain`: parent, daughter, and "not always finished". Figure: parent to daughter, with the daughter marked unstable.
3. **Simulation `decay-chain`**: a generic chain, A to B to C to D to Stable, using the labels Parent, Daughter, Next generation (no real isotopes). The learner taps the unstable nucleus; it changes; if the new one is still unstable the app says "It isn't finished yet."; repeat until Stable. Goal: reach Stable. Reports `u2-decay-chain`.
4. `reveal` for card 1, with the finished chain figure and the term **decay chain**: "a sequence of radioactive decays in which one nucleus changes into another, which may decay again."
5. `true_or_myth`: "Every radioactive decay immediately creates a stable atom." Myth.
6. `true_or_myth`: "Radioactive decay means the atom just disappears." Myth. Feedback: the nucleus changes into another nucleus; the material does not vanish.
7. `order`: put a chain in order (Parent, Daughter, Next generation, Stable).
8. `choice` use-it: "Parent, Daughter, then?" Then a longer chain: "...Next generation, then?" The learner chooses the next state each time.
9. `explain`: the zoom-out moment. "One unstable nucleus can be the start of a whole chain."
10. `choice` use-it: "A sample contains a nucleus whose daughter is also unstable. After the first decay, is the sample finished changing?" (No.)
11. `explain` (deeper): real chains exist. The uranium-238 series ends in stable lead-206 and the thorium-232 series in stable lead-208 (to verify, §9). Branching is mentioned in one clause. Nothing to memorise.

Scored items: `u2-decay-chain` (cards 3, 5, 7, 8, 10), `u2-decay-changes-not-vanishes` (cards 6 and two bank items).

Practice node between L3 and L4 draws from L1 to L3 (8 items, as in Unit 1).

### L5. Radioactivity is natural (`radioactivity-is-natural`)

The emotional payoff of the unit. Misconceptions: #1, #2, #3, #9 (tease), #8 (plant).

1. `predict`: "Where can radioactive materials be found?" Multi-answer style with seven choices (nuclear power plants, hospitals, rocks, food, your body, space, all of the above). Unscored. If the engine only supports single choice, use "Which of these can have radioactive material?" with an "all of these" option.
2. `explain`: rocks and soil. Some contain natural uranium and thorium. Figure: a cross-section of ground.
3. `explain`: air. Radioactive materials in the ground can produce **radon**, a radioactive gas that can get into buildings. One sentence; no health numbers.
4. `explain`: food and the body. Potassium-40 is in food and in you. This is a widening of Unit 1's banana card, not a repeat: lead with "your body contains a little" and link to a food-to-body figure.
5. `explain`: space. Earth is exposed to cosmic radiation all the time. Figure: rays arriving at the top of the atmosphere.
6. `story` (Hal): "A discovery that wasn't supposed to happen." Becquerel and a uranium mineral fogging a wrapped photographic plate with no sunlight. Takeaway: radioactivity was discovered as a property of natural matter. Core, but not a fact to memorise. Move of the Unit 1 card; see §10.
7. `sort` or `order`: "Which came first, the natural phenomenon or its discovery?" or a small timeline; scored under `u2-natural-sources`. Do not re-ask "Humans invented radioactivity." as a myth item.
8. `choice`: "If something is radioactive, is it automatically dangerous?" Not necessarily. Then `explain`: it depends on the type and amount of radiation, how much exposure there is and how it reaches the body. No dose calculation. Scored under `u2-not-always-dangerous` with one more item.
9. `explain`: the teaser. "Later, you'll learn why being exposed to radiation is not the same as becoming radioactive." Unscored, no objective.
10. Final activity, `sort` or `hotspot`: banana, rock, human body, airplane at high altitude, nuclear reactor, hospital radiation source. "Which of these can involve natural or artificial radioactivity or radiation?" The aim is not to memorise which objects are radioactive but that **radiation and radioactivity are part of the world, not only inside nuclear facilities**. Each feedback line says which kind it is (natural radioactivity, cosmic radiation, artificial).
11. `explain` (deeper): radon details, natural decay series (link back to L4), potassium-40 in more depth.

Scored items: `u2-natural-sources` (cards 2 to 5 via items, 7, 10, bank), `u2-not-always-dangerous` (card 8 and bank items).

**Checkpoint** (12 items) covers all twelve objectives, with Unit 1 objectives eligible as earlier-share content. As with other units, Unit 2 earlier-unit sampling comes from Unit 1 only.

## 8. New interactive components

The runner today has two simulations (`atom-builder` and `scale-zoom`, `SIM_TYPES` in `content/curriculum/types.ts`, rendered by `components/lesson/cards/AtomBuilderSim.tsx` and `ScaleZoomSim.tsx`, dispatched in `LessonRun.tsx`). Unit 2 adds three. Each follows the existing pattern: data-only in the DB, hardcoded component, framework-free `.ts` core with a `node --test` suite, goal state in `data` so completion is checkable, and a rule in `scripts/lib/curriculum-rules.mjs` (as `atom-builder` and `scale-zoom` already have) so Studio and `validate:content` reject malformed data.

| Sim type | Used in | Data (sketch) | Core to test |
|---|---|---|---|
| `decay-wait` | L1 (`mode: "single"`), L3 (`mode: "half-life"`) | `{ mode, task, count, goal: { presses }, hint?, objectives }` | `decay-wait-core.ts`: how many nuclei change per press, count bounds, completion |
| `decay-chain` | L4 | `{ task, nodes: [{ id, label, state: "unstable"\|"stable" }], goal: { reach: nodeId }, hint?, objectives }` | `decay-chain-core.ts`: valid chain (a path ending in stable), step logic |
| `radiation-id` | L2 | `{ task, cases: [{ id, answer: "alpha"\|"beta"\|"gamma", scene }], goal: { all: true }, hint?, objectives }` | `radiation-id-core.ts`: attempt and completion state |

### 8.1 Randomness in `decay-wait` (the one hard design decision)

The brief asks for two things that pull against each other: in L1 "don't make it deterministic in the learner's mind", and in L3 the learner should see 100, 50, 25, 12.

Resolution:

- **Single mode (L1)** is genuinely random. Each press, every remaining nucleus has the same chance to change, so which ones go and how many vary from run to run. The learner cannot call the next one. It is seeded from a fresh random seed per card entry (not from the card id), so a replay differs.
- **Half-life mode (L3)** is **guided random**. Each press, the number that change is drawn around half of the remaining nuclei but clamped (for example within 3 of the expected value), and *which* ones change is random. The group follows the pattern, individual nuclei remain unpredictable, and the displayed numbers are always "about 50", "about 25", and so on. The teaching copy and the predict-before-reveal items use the **expected** values, never the observed count, so a lesson never contradicts what the simulation shows.
- Both modes must pass a unit test that the clamped group result stays inside its bounds over many seeded runs, and the core accepts a seed so tests are deterministic.

### 8.2 Motion, accessibility and device rules

- Animation follows `components/motion/MOTION.md`: interface moves stay under 300 ms, ease-out. Nuclear changes (a nucleus transforming, an alpha particle leaving) are a few hundred milliseconds of scene motion and freeze on their final frame with reduced motion or when the screen is not focused.
- Every sim has a tap-only path (no drag), screen-reader labels, and a text equivalent of what happened ("17 of 20 nuclei have not changed yet"). The count is always shown as text as well as in the grid.
- Styles use `createStyles` and semantic roles. Nucleus art uses the lesson palette (`duo-palette.ts`, EX-11). New object art goes through `object-art.ts` and its tests. Icons go through `components/ui/icon.tsx`.
- Sound, if any, goes through the media runtime only (`docs/MEDIA_POLICY.md`). No sim plays audio by itself.
- Nothing here has been run on a device; each sim needs a release-like Android check (the earlier lesson work had device-only failures with animated SVG transforms and SVG gradients).

## 9. Facts to verify before authoring

Unit 1's rule applies: nothing is entered as a fact until it is confirmed against a source opened by a person, and references are marked unverified until then. Candidate sources (all unverified, and several of these came from a search summary, not a read of the document):

| Level | Candidate source | Supports |
|---|---|---|
| Unit | IAEA, *Radioactive decay* material (IAEA publication TECDOC-1363, `te_1363_web.pdf`) | Definition of radioactive decay and half-life; alpha as two protons and two neutrons |
| Unit | IAEA Nuclear Safety and Security Glossary | Definitions of beta-minus, gamma, radionuclide |
| L2 | IAEA material on alpha, beta and gamma | Particulate versus electromagnetic radiation |
| L4 | U.S. NRC, NUREG/SR-1501 | Uranium-238 series (ends in lead-206), thorium-232 series (ends in lead-208), potassium-40 as a natural radionuclide |
| L5 | INIS record `111v8-1e515`; IAEA background-radiation explainer; UNSCEAR background-radiation material | Natural radionuclides, cosmic radiation, radon |
| L5 | Becquerel (1896), *Comptes Rendus* (already `ref-becquerel-1896`) | The Becquerel story |
| Unit | OpenStax *University Physics Volume 3*, chapter 10 (already `ref-openstax-up3-ch10`) | Decay, half-life |

Specific values to confirm before they appear anywhere: the half-lives used as examples on the L3 ladder (a fraction of a second up to billions of years; for instance carbon-14, iodine-131, radon-222 and potassium-40 are the usual candidates, with values read from a source, not from memory), the end products of the two decay series, the statement that a neutron changing into a proton is the beta-minus mechanism (and that an antineutrino is omitted without being denied), and the wording about what affects decay rates (ordinary heating, cooling and chemistry hardly change them; Core avoids stronger claims).

## 10. Changes needed outside Unit 2

1. **Unit 1 L5 card `c12` (Becquerel story, `deeper`)** moves to Unit 2 L5 as a Core story. Remove it from `unit-1.mjs`, keep `becquerelPlate` and `ref-becquerel-1896` (re-used by Unit 2), and re-run `unit-1-concept-pass.mjs`. Until then, both lessons would carry the same story. This is a published-content decision for the owner: nothing is published yet, so no shipped id is retired.
2. **`LESSON_RESTRUCTURE_SPEC.md` §4.1, Unit 2 row**: lesson names updated to match this spec (done with this spec).
3. **Glossary**: add encyclopedia entries for `parent-nuclide`, `daughter-nuclide` (or one combined "parent and daughter" entry), `alpha-decay`, `beta-decay`, `gamma-radiation`, `decay-chain`, `potassium-40`. Already present and linkable: `radioactivity`, `radiation`, `decay`, `radionuclide`, `half-life`, `alpha-particle`, `beta-particle`, `gamma-ray`, `radon`, `cosmic-radiation`, `background-radiation`, `ionizing-radiation`, `henri-becquerel`, `marie-curie`. Entries are beginner difficulty, with sources as in §9, added by a repeatable script as `add-unit-1-glossary.mjs` does.
4. **NPC lines**: Hal's `lesson_intro` line for each lesson and his story-card voice, in `npc-roster.ts` and the `npc_lines` table (his `meet`, `sign_off` and `tease` lines may already exist: check before adding).
5. **Authoring tooling**: `curriculum-cutover.mjs` is destructive (it wipes `teacher_npc_id`), as found for Unit 1. Unit 2 uses an idempotent sync script modelled on `unit-1-concept-pass.mjs`, generalised so it takes a unit source path.
6. **Validator**: `curriculum-rules.mjs` gains rules for the three new sim types (like the existing `atom-builder` and `scale-zoom` branches) and tests in `scripts/test-curriculum-content.mjs`.

## 11. Build order

1. **Content skeleton**: `unit-2.mjs` with objectives, references, lesson outlines and items; sync script; glossary script; Unit 1 change (§10.1). Run `validate:content`.
2. **Figures**: the static teaching figures in `scenes.mjs` and any new object art; render a contact sheet with the helper used for Unit 1 and check overlaps.
3. **Sims in this order**: `decay-wait` (unblocks L1 and L3), `radiation-id` (L2), `decay-chain` (L4). Each with its core, tests, validator rule and component.
4. **Hal**: lines and story voice; confirm the lesson preview and story cards pick him up.
5. **Device pass**: all five lessons on a release-like Android build, with reduced motion on and off.
6. **Publish** only after references are verified and a person has read each card for accuracy.

## 12. Acceptance criteria

- All twelve objectives are taught in exactly one lesson, each with at least two scored items; `validate:content` passes with 0 errors; `test:curriculum`, `test:curriculum-content` and the new sim core suites pass.
- No Core card contains a nuclear equation, a formula, a decay constant or an isotope table; every such item is `tier: deeper` and unscored.
- Every teaching card has a figure with alt text and at most 60 words.
- L3 never shows an observed count as a teaching fact; the half-life numbers in copy and items are the expected 100, 50, 25, about 12, about 6, always with "about".
- Beta is never described as an electron that was orbiting the nucleus.
- No Unit 2 item re-asks the Unit 1 "humans invented radioactivity" myth.
- Unit 2 never teaches a Unit 3 or Unit 4 idea as new (§3); the only mentions are the teaser lines.
- Every sim works with taps only, has a text equivalent, and freezes with reduced motion.
- All references are marked verified by a person before publish.

## 13. Open questions for the owner

1. **Becquerel placement.** This spec moves the story from Unit 1 L5 to Unit 2 L5 (§10.1) so each unit tells it once. The alternative is to keep it in Unit 1 and add a different story to Unit 2 L5 (for example the Curies). Which do you want?
2. **L5 overlap with Unit 1.** Unit 1 already teaches "radioactivity is natural". Unit 2 L5 widens it (radon, space, "not automatically dangerous") rather than repeating it. If you would rather Unit 1 stop at "unstable nuclei can change" and leave all natural-radioactivity teaching to Unit 2, Unit 1 L5 needs another trim.
3. **Beta Core wording.** The brief allows the neutron-to-proton explanation as Core or Go deeper. This spec keeps it Go deeper. Say if you want it Core.
4. **Predict card for L5.** The "where can radioactive materials be found?" prompt is multi-answer. The runner's predict item supports a single choice today; this spec uses an "all of these" option rather than adding a multi-select type.
