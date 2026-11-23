# Unit 4: Radiation and the Body (Mina)

Status: built 2026-11-23 (content, teacher surfaces, Atom Maze world, map pictures and the closing card; not published, not seen on a device). Spec written before the files. Part of `FOUR_UNIT_RELEASE_SPEC.md` (section 5 is the outline; this is the card-level plan, the facts to verify and the decisions that differ from it). Written like `UNIT_2_RADIOACTIVITY_SPEC.md`. Lessons follow the rules the Unit 3 and Units 1 and 2 reworks settled (`UNIT_1_2_LESSON_REWORK_SPEC.md` section 3): one or two topics, a different shape each, teach before asking, 4 to 7 scored questions, reasons in every explanation, no sorts.

## 1. The one idea

> How much radiation matters depends on the dose. Everyone gets a small dose all the time. Cells are very good at repairing damage. A very large dose in a short time makes people ill; low doses add a small chance of cancer later; time, distance and shielding lower a dose.

## 2. Facts to verify

Every number in the unit comes from this table, written "about". All sources were already in the project and verified (`content/source/reference/sources/official.atomiq`); on 2026-11-23 the four pages below were fetched and read in full and each quote is verbatim from the page text. A number that is not here is not in the unit.

| # | Claim in the unit | Source | Page text (quote) |
| --- | --- | --- | --- |
| F1 | The average yearly dose in the US is about 6.2 millisieverts | EPA, Radiation Sources and Doses | "the average annual radiation dose per person in the U.S. is 6.2 millisieverts (620 millirem" |
| F2 | Most of the average dose is natural background radiation | same | "Most of our average annual dose comes from natural background radiation" |
| F3 | A year of living near a nuclear power station adds under 0.01 mSv; a year of rocks and soil about 0.21; cosmic radiation at sea level about 0.3 a year; living in Denver (5,280 ft) about 0.8; radon in an average US home about 2.28 a year; one whole body CT about 10 | same (the diagram's text description) | "living near nuclear power station for a year = <0.01 mSv" and the rest of that list |
| F4 | A dose of about 1 sievert (1000 mSv) is the threshold for acute radiation syndrome | WHO, Ionizing radiation and health effects | "the dose threshold for acute radiation syndrome is about 1 Sv (1000 mSv)." |
| F5 | A very high dose in a short time can cause nausea and vomiting within hours | EPA, Radiation Health Effects | "A very high radiation exposure delivered over a short period of time can cause symptoms such as nausea and vomiting within hours" |
| F6 | High doses can cause skin redness, hair loss, burns | WHO | "skin redness, hair loss, radiation burns, or acute radiation syndrome" and "These effects are more severe at higher doses and higher dose rates." |
| F7 | Ionizing radiation can damage the DNA in cells | EPA, Radiation Health Effects | "has sufficient energy to affect the atoms in living cells and thereby damage their genetic material (DNA)." |
| F8 | Cells are very good at repairing that damage | EPA | "Fortunately, the cells in our bodies are extremely efficient at repairing this damage." |
| F9 | Damage that is not repaired correctly can kill a cell or eventually make it cancerous | EPA | "if the damage is not repaired correctly, a cell may die or eventually become cancerous." |
| F10 | Low levels do not cause immediate health effects but can add a small increase in the risk of cancer over a lifetime | EPA | "Exposure to low levels of radiation encountered in the environment does not cause immediate health effects" and "can cause a small increase in the risk" |
| F11 | A low dose, or one spread over a long time, carries less risk because repair is more likely | WHO | "If the radiation dose is low and/or it is delivered over a long period of time (low dose rate), the risk is substantially low because there is a greater likelihood of repairing the damage." |
| F12 | Dose rate is how fast a dose arrives, in microsieverts per hour or millisieverts per year | WHO | "described in microsieverts per hour (μSv/hour) or millisievert per year (mSv/year)" |
| F13 | About 99 in 100 people given a one-time dose of 100 mSv would not get cancer as a result, and extra cancers at that dose would be extremely hard to identify | EPA | "About 99 percent of individuals would not get cancer as a result of a one-time uniform whole-body exposure of 100 millisieverts (10 rem) or lower." and "At this dose, it would be extremely difficult to identify an excess in cancers caused by radiation" |
| F14 | Studies of bomb survivors and radiotherapy patients show a significant increase in cancer risk above 100 mSv | WHO | "showed a significant increase of cancer risk at doses above 100 mSv." |
| F15 | Time: less time near a source means less dose | EPA, Protecting Yourself from Radiation | "limiting or minimizing the exposure time reduces the dose from the radiation source." |
| F16 | Distance: the dose drops dramatically with distance | EPA | "The dose of radiation decreases dramatically as you increase your distance from the source" |
| F17 | Shielding: lead, concrete or water protect against penetrating gamma rays; a shield can greatly reduce or remove the dose | EPA | "Barriers of lead, concrete or water provide protection from penetrating gamma rays" and "will greatly reduce or eliminate the dose you receive." |
| F18 | Real uses: a lead apron at a dental X-ray; sources stored under water, in concrete or in lead-lined rooms; more walls give a shelter more protection | EPA | "dentists place a lead apron on patients receiving x-rays of their teeth." and "More walls provide more protection." |
| F19 | A person who was exposed to radiation is not radioactive; radiation does not get on or in people | Health Physics Society (Unit 3) | already verified for Unit 3 |

Derived, not quoted: 1 sievert = 1000 millisieverts (WHO writes "1 Sv (1000 mSv)"); a whole-body CT (about 10 mSv) is about a hundred times smaller than 1000 mSv.

Left out because no verified page says it: that radiation "glows green" (the myth item the outline asked for; OpenStax mentions only a tritium light), that people cannot see or feel radiation, any chest X-ray, flight or banana dose, the linear no-threshold model and its critics (outline: never taught), anything about children, pregnancy or medical advice. Unit 3 had said "we cannot see ionizing radiation" citing OpenStax 21.6, which does not say it: removed from `u3-x-tom-instruments` and the Detecting radiation description.

## 3. Boundaries and care

- No card tells anyone to have or avoid a scan, a treatment or a place. Lesson 5 may say that a doctor weighs benefit against dose only if a verified page says it (none of F1 to F19 does): it does not.
- Calm, not dismissive: no card says radiation is harmless, and none says any dose is deadly. The unit says what the sources say and where they say it is hard to tell.
- The Safety Guide cards (`What a dose is`, `Time, distance, shielding`, `Background radiation`) say the same things with the same sources; nothing here contradicts them.
- Shielding is relied on from Unit 3 lesson 2; sievert and gray from Unit 3 lesson 5; exposed versus contaminated from Unit 3 lesson 3.

## 4. Lessons

Path: L1, L2, L3, practice, L4, L5, checkpoint (`u4-n1` to `u4-n7`), like Units 1 to 3. Minutes 5 or 6, 50 XP each.

| Lesson | Id | Objectives (2 each) | Shape |
| --- | --- | --- | --- |
| L1 The dose scale | `the-dose-scale` | `u4-everyone-dose`, `u4-dose-steps` | Opens by paying off Unit 2's "radioactive is not always dangerous", then three short teaching beats (units, the yearly dose, the ladder), a small check after each; ends on an ordering of four doses. |
| L2 Radiation and your cells | `radiation-and-cells` | `u4-cell-damage`, `u4-cell-repair` | Opens with a puzzle (radiation can damage DNA, so why is nobody ill from the everyday dose?), answered by repair; one use-it item on "exposed is not radioactive". |
| L3 All at once or over time | `dose-and-time` | `u4-large-fast`, `u4-small-spread` | A contrast lesson: the fast dose first, then the slow one, then the two side by side on one figure. |
| L4 Time, distance, shielding | `time-distance-shielding` | `u4-three-ways`, `u4-pick-the-way` | One teaching card for each way, each with its real-world use; ends on matching situations to the way they use. |
| L5 Risk in perspective | `risk-in-perspective` | `u4-three-questions`, `u4-read-a-number` | Practice-heavy: three questions to ask of any dose, then headlines to read with them; no new fact. |

## 5. Decisions that differ from the outline

1. **No new sims.** The outline allowed `dose-scale` and `tds`. `scale-zoom` is built on metres, and the time, distance and shielding idea is clearer as a figure and a match than as a toy with an invented formula (the sources give no numbers for it). Lessons use figures, ordering and matching.
2. **The green-glow myth is out** (section 2): no verified page states it.
3. **The Atom Maze world** is `dose-slopes`, `cell-garden`, `long-road`, `safe-distance`, `summit-view` (levels 21 to 25) on the hills biome with snow ground, as the outline says; its two new mechanics are in `FOUR_UNIT_RELEASE_SPEC.md` section 9 and built after the lessons.
4. **Mina's unit colour** is green, the colour of a right answer: check the map on a device once (outline section 13).

## 6. Status (2026-11-23)

Built: the unit, path, ten objectives (49 items), five lessons, ten statements, three AtomDex entries, Mina's lines, six chat files, nineteen feed posts, two blog pieces with two cover scenes, five map glyphs, the Atom Maze world (levels 21 to 25) and the end-of-path card on Home. Differences from section 4 and 5:

- The lessons use no sims, no sorts; each has a match, fill, order or predict beside its choices.
- Atom Maze: the two new things are the dose source and the lead shelter (lead already existed; its new behaviour is shielding a field). The source reuses the beam emitter picture and a soft disc; give it its own picture later.
- Mina has a tease line ("More is on the way"), never naming a unit or a date.
- Content stays a draft: publish as a minor release (new rows) after a device pass, including a look at the green map colour (section 5, item 4).
