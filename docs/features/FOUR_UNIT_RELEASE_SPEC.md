# AtomIQ: four units for the first release (specification)

**Status:** Units 3 and 4 are built as drafts (2026-11-23): content, teacher surfaces, Atom Maze worlds, map pictures and the end-of-path card. Not published and not yet seen on a device (build order step 8 and 9 remain).
**Date:** 2026-11-23
**Owner:** AtomIQ product, content and engineering
**Builds on:** `LESSON_RESTRUCTURE_SPEC.md` (§4 unit map, §6 card limits), `UNIT_2_RADIOACTIVITY_SPEC.md` (the model for a unit), `NPC_TEACHERS_SPEC.md`, `NPC_VOICE_SPEC.md`, `NPC_FEED_SPEC.md`, `PHONE_SPEC.md`, `PLATFORMER_SPEC.md`, `CONTENT_SOURCE_SPEC.md`, `REFERENCE_VERIFICATION_SPEC.md`, `docs/critical/CONTENT_AND_USER_DATA_RULES.md`

## 1. Goal

The first public release ships four units instead of two:

| # | Unit id | Title | Teacher | State |
|---|---|---|---|---|
| 1 | `inside-the-atom` | Inside the Atom | Hal | Published in content 1.0.0 |
| 2 | `radioactivity` | Radioactivity | Ada | Published in content 1.0.0 |
| 3 | `radiation-meets-matter` | Radiation Meets Matter | Ray | **New** |
| 4 | `radiation-and-the-body` | Radiation and the Body | Mina | **New** |

Units 3 and 4 are the next two rows of the unit map in `LESSON_RESTRUCTURE_SPEC.md` §4.1, and Ray and Mina are already in the cast with these unit ids (`NPC_ROSTER`, `content/source/characters/030-npc-ray.atomiq`, `040-npc-mina.atomiq`). Nothing is renumbered and no shipped id changes.

Why these two close the release well: Unit 2 ends on three planted questions ("does exposure make things radioactive?", "is all radiation nuclear?", "is radioactive the same as dangerous?"). Unit 3 answers the first two and Unit 4 the third. A learner who finishes Unit 4 has a complete story: what an atom is, why some change, what the radiation does to things, and what it does to people.

"Done" means each new unit is as complete as Unit 2 is today on every surface: lessons, teacher, chat, feed, blog, Atom Maze world, Myth Buster statements, AtomDex terms, verified sources. Section 3 is that list.

### Non-goals

- Units 5 to 7 (Kofi, Tess, Sage). They stay in the Feed and the weekly ranking as cast members with no unit, as today.
- New phone apps, new shop shelves, new game modes, a new lesson card type beyond the simulations in §4.4 and §5.4.
- Changing anything in Units 1 and 2 beyond the hand-over points in §10.

## 2. What already exists for Units 3 and 4

| Piece | State today |
|---|---|
| `npcs` rows, bio, title, field, drawing spec | Done for Ray and Mina (characters files, mirrored in `NPC_ROSTER`, positions 3 and 4) |
| Profile cover pictures | Done (`NPC_COVER_GLYPHS`: Ray shield, rays, glasses, zigzag, layers, crosshair; Mina heart, drop, calm, cross, cell, pulse) |
| Unit colour on the map | Automatic through `teacherPalette`: Ray's cover is his hoodie's purple, Mina's her coat's green (neither has a `cover` override) |
| Feed templates | 8 each, the shared moments only (chests, first lesson, daily quests, rank changes, two comebacks) |
| `npc_lines` (meet, sign-off, tease, lesson intros) | **None** (the 16 published lines are Hal's and Ada's) |
| Chat | **None** (`content/source/chat/` has `npc-hal`, `npc-ada`, `shrodi`) |
| Unit, objectives, lessons, items, statements, blog | **None** |
| Atom Maze world | **None** (`STORY_WORLDS` ends at `radioactivity`) |
| AtomDex terms | Many are already entries: `ionizing-radiation`, `electromagnetic-radiation`, `x-ray`, `shielding`, `geiger-counter`, `dosimeter`, `scintillation-detector`, `ion-chamber`, `becquerel`, `gray`, `sievert`, `absorbed-dose`, `dose-rate`, `exposure`, `background-radiation` |

## 3. What one unit is made of (the checklist for each new unit)

Counts are Unit 2's, which is the bar. Every file below is a source file built with `npm run content:sync`; none of it is a script or a direct DB edit.

| # | Surface | What to make | Where |
|---|---|---|---|
| 1 | Unit | 1 unit row: title, subtitle, icon, tone, teacher, goal, summary, terms, description, sources | `content/source/units/<unit>/unit.atomiq` |
| 2 | Path | 7 nodes, same shape as Units 1 and 2: L1, L2, L3, practice, L4, L5, checkpoint (`u3-n1`..`u3-n7`, `u4-n1`..`u4-n7`) | `path.atomiq` |
| 3 | Objectives | 10 to 12, 2 to 4 a lesson, each taught in exactly one lesson | `objectives/NNN-<id>.atomiq` |
| 4 | Lessons | 5, each 8 to 16 cards, at least half interactive, a predict card, a figure with alt text on every teaching card, at least one reference (about 60 cards and 60 bank items a unit) | `lessons/NNN-<id>.atomiq` |
| 5 | Figures | New figure ids in the figure library, one function each | `components/lesson/visual/figures/`, `figure-ids.json`, golden hashes |
| 6 | Statements | 10 myth-or-fact statements for the unit's Myth Buster round | `statements.atomiq` |
| 7 | Teacher lines | 8: meet, sign-off, tease, and one lesson intro per lesson | `content/source/characters/` and `NPC_ROSTER` (both, `test:source-adapters` compares) |
| 8 | Chat | 1 free-chat menu and 5 stories (§6) | `content/source/chat/npc-<id>/` |
| 9 | Feed | About 16 unit templates on top of the 8 the teacher has (§7) | `content/source/feed/npc-<id>.atomiq` |
| 10 | Blog | 2 pieces by the unit's teacher, each with a cover scene, sources, a reactor and one cast comment (§8) | `content/source/blog/<unit>/`, `components/feed/blog-art.ts` |
| 11 | AtomDex | Entries for every term the lessons link that is not there yet | `content/source/reference/encyclopedia/` |
| 12 | References | Every source the unit cites, each checked by a person | `content/source/reference/sources/` |
| 13 | Atom Maze | 1 world of 5 levels with fixed question pools from the unit's bank (§9) | `story-levels.ts`, `platformer-levels.ts` |
| 14 | Map pictures | A glyph and a topic rule for each new lesson subject; Aq icons for new sort groups | `node-glyphs.ts`, `custom-icons.ts` |

Things that need no work because they are derived: the unit divider and unit card on Home, the unit's colour, the teacher joining Contacts after the unit's first lesson, the Chats tab on the teacher's profile, the Reference Library shelf, the test-out node, the Myth Buster unit list (it shows a unit as soon as it has statements).

## 4. Unit 3: Radiation Meets Matter (Ray)

### 4.1 Goal

By the end a learner can say:

> **Radiation carries energy. What it does depends on its kind and its energy: some can knock electrons off atoms, different kinds are stopped by different things, being exposed is not the same as being made radioactive, and we measure it with instruments because we cannot sense it.**

### 4.2 The five lessons

| Lesson | Id (proposed) | The one idea | The learner leaves thinking |
|---|---|---|---|
| L1 Ionizing or not | `ionizing-or-not` | Only radiation with enough energy can knock electrons off atoms. That kind is called ionizing. Radio waves, microwaves and visible light are not. | "Not all radiation is the same. My phone and an X-ray are different things." |
| L2 What stops what | `what-stops-what` | Alpha is stopped by paper, beta by a thin sheet of metal or plastic, gamma is only reduced, by thick dense material. | "The strongest-sounding one is the easiest to stop." |
| L3 Exposed is not radioactive | `irradiated-or-contaminated` | Being hit by radiation (irradiated) is different from carrying radioactive material (contaminated). | "An X-rayed suitcase does not become radioactive." |
| L4 Detecting radiation | `detecting-radiation` | We cannot see, smell or feel it, so we use instruments that count it. A counter clicks even with no source nearby: that is background. | "A click is one event, and a few clicks are normal." |
| L5 Three ways to measure | `becquerel-gray-sievert` | Three units answer three questions: how active is the source (becquerel), how much energy was absorbed (gray), how much it matters to a body (sievert). | "A big number means nothing until I know which unit it is." |

Path: L1, L2, L3, practice, L4, L5, checkpoint. The checkpoint samples Units 1 and 2 (`earlierShare` as in Unit 2).

### 4.3 Boundaries (one home per idea)

| Idea | Owned by | Unit 3's part |
|---|---|---|
| Alpha, beta and gamma are three different things | Unit 2 L2 | Relied on. Unit 3 L2 adds only what stops each. |
| Natural sources, background exists | Unit 2 L5 | Relied on. L4 lets the learner hear background on a counter. |
| How big a dose is, health effects, risk | Unit 4 | L5 teaches what a sievert measures, never which number is safe. One teaser line. |
| Time, distance, shielding as protection | Unit 4 L4 | L2 teaches what stops what. It does not teach "how to protect yourself". |

Accuracy rules that the lesson files must keep:

- L3 must be exact (as `UNIT_2_RADIOACTIVITY_SPEC.md` §3 already requires): X-rays and gamma rays do not make ordinary material radioactive; neutrons can. The neutron caveat is a Go deeper card, never a scored item.
- L1: ultraviolet sits at the border (its high-energy end can ionize). Core says "from high-energy ultraviolet upward" or leaves UV out; Go deeper explains. No Core card may say UV is simply one or the other.
- L2: gamma is "reduced", never "stopped". Neutrons are Go deeper.
- L5: no conversion sums, no weighting factors in Core.

### 4.4 Interactive components

Use existing card types first (sort, match, order, hotspot, slider, predict). New simulation types, at most two for the unit, each with a framework-free core, a `node --test` suite and a `curriculum-rules.mjs` branch, as Unit 2's were:

| Sim | Lesson | What the learner does |
|---|---|---|
| `shield-test` (not built) | L2 | Puts paper, aluminium or lead in front of an alpha, beta or gamma source and sees what gets through. |
| `counter` (not built) | L4 | Moves a counter toward and away from an object and hears the clicks change; with nothing near, background clicks continue. |

Unit 2's lesson: a sim that adds nothing gets cut (`decay-wait`). Build the sim only once the card around it is written and needs it.

### 4.5 Misconceptions

| Misconception | Handled in |
|---|---|
| All radiation is the same | L1 |
| Radiation always means nuclear radiation | L1 (pays off Unit 2's teaser) |
| Things exposed to radiation become radioactive | L3 (pays off Unit 2 L5's closing line) |
| Irradiated food is radioactive | L3 as an example only; Unit 6 owns food irradiation |
| Gamma can be blocked completely by a wall | L2 |
| Alpha is the most dangerous because it is the biggest | L2 plants "easy to stop outside the body"; Unit 4 owns the inside-the-body part |
| You can feel or see radiation | L4 |
| Becquerel, gray and sievert are the same thing in different sizes | L5 |

## 5. Unit 4: Radiation and the Body (Mina)

### 5.1 Goal

> **How much radiation matters depends on the dose. Everyone receives a small dose all the time. Cells repair most damage. Very large doses in a short time make people ill, small doses add a small risk, and time, distance and shielding lower a dose.**

### 5.2 The five lessons

| Lesson | Id (proposed) | The one idea | The learner leaves thinking |
|---|---|---|---|
| L1 The dose scale | `the-dose-scale` | Doses run from tiny to huge, and everyday life sits near the bottom of the scale. | "A banana, a flight and an accident are not on the same step." |
| L2 Radiation and your cells | `radiation-and-cells` | Ionizing radiation can damage the molecules in a cell, including DNA. Cells repair most of it. | "Damage is real, and so is repair." |
| L3 All at once or over time | `dose-and-time` | A large dose in a short time causes illness soon. The same total spread over years does not act the same way; small doses add a small chance of cancer later. | "How fast matters, not only how much." |
| L4 Time, distance, shielding | `time-distance-shielding` | Three things lower a dose: less time near the source, more distance from it, something between you and it. | "I know what people who work with radiation actually do." |
| L5 Risk in perspective | `risk-in-perspective` | Compare a dose with ones you already know before judging it. "Any dose is deadly" and "radiation glows green" are myths. | "I can read a scary headline calmly." |

Path: L1, L2, L3, practice, L4, L5, checkpoint (it samples Units 1 to 3).

### 5.3 Boundaries and care

Unit 4 is the highest-risk content in the app, because it makes health claims.

- **Every number has a source and the word "about".** The dose scale (L1) and every comparison (L5) is listed in a "facts to verify" table in the unit's lesson spec before authoring starts, as Unit 2's §9 did. All Unit 4 references are in the top risk tier of `REFERENCE_VERIFICATION_SPEC.md`.
- **No medical advice.** No card tells a learner whether to have a scan, take a treatment or avoid a place. L5 may say that a doctor weighs benefit against dose. Check that the Terms' educational-only wording covers this unit and extend it if not (`content/legal/terms.ts`, then bump `LEGAL_VERSION` and republish the public page as CLAUDE.md describes).
- **Honest about low doses.** Core says small doses "add a small chance" and that scientists stay cautious because effects at very low doses are hard to measure. The competing models of low-dose risk (linear no-threshold and its critics) are NOT taught at all, not even as Go deeper: see the "facts only" rule below.
- **Facts only.** Nothing experimental, hypothetical or still debated is taught in any unit, Core or Go deeper. A claim goes in only if a verified source states it as established; where the sources say "uncertain", the card says only that it is uncertain, in the sources' words, and moves on.
- **Calm, never dismissive.** Mina's voice reassures, but no card says radiation is harmless. `NPC_VOICE_SPEC.md` governs only her own lines; lesson text stays in the plain shared tone.
- **Agree with the Safety Guide.** The phone's Safety cards already explain several of these ideas. Lessons and cards must say the same thing with the same numbers; where they differ, fix the one that is wrong and re-verify its source. The Safety Guide keeps its unlock (finishing *Radioactivity*).
- **Shielding** is relied on from Unit 3 L2. L4 teaches using it, not what stops what.
- **Glowing green:** the myth item is Core. The blue glow of water around a reactor core is a Go deeper card, to verify.

### 5.4 Interactive components

At most two new sims:

| Sim | Lesson | What the learner does |
|---|---|---|
| `dose-scale` | L1, reused in L5 | Places everyday things on a scale that zooms across several powers of ten. Check first whether Unit 1's `scale-zoom` can be reused with new data before adding a type. |
| `tds` (time, distance, shielding) | L4 | Changes how long, how far and what is in between, and watches a dose bar go down. |

### 5.5 Misconceptions

| Misconception | Handled in |
|---|---|
| Any dose of radiation is deadly | L1 and L5 |
| Radioactive means dangerous | L1 (pays off Unit 2's teaser) |
| Radiation damage can never be repaired | L2 |
| A person exposed to radiation becomes radioactive and dangerous to others | Relied on from Unit 3 L3, one use-it item in L2 |
| A small dose every day is the same as one large dose | L3 |
| Nothing can be done to lower a dose | L4 |
| Radiation glows green | L5 |
| A medical scan is as bad as an accident | L5 |

## 6. Chat

Each new teacher gets what Hal and Ada have: one free-chat file and five stories, in `content/source/chat/npc-ray/` and `npc-mina/`. Ids follow `chat-<name>-...`.

| File | Trigger | Ray | Mina |
|---|---|---|---|
| `010-chat-<n>-greeting` | none (free chat menu: next lesson, quiz, remind) | | |
| `020-chat-<n>-up-hello` | first lesson of their unit done | `lessons_completed:11` | `lessons_completed:16` |
| `030-...` topical story 1 | mid unit | `lessons_completed:13` | `lessons_completed:17` |
| `040-...` topical story 2 | mid unit or a level | `lessons_completed:14` | `lessons_completed:19` |
| `050-chat-<n>-up-unit` | unit finished | `unit_complete:radiation-meets-matter` | `unit_complete:radiation-and-the-body` |
| `060-chat-<n>-up-welcome-back` | `welcome_back` | | |

The `lessons_completed` numbers count lessons across the whole path, so they assume the learner went in order; a learner who tested out of a unit reaches them in a different place. That is how Ada's `lessons_completed:6` already works; it is acceptable, but each story must make sense whenever it arrives.

Story ideas, in each teacher's voice (`NPC_VOICE_SPEC.md`):

- **Ray** (blunt, fragments, no "!"): a message from the airport security line about his bag going through the X-ray ("Bag scanned. Bag not radioactive."), a field check with his hand-held counter that clicks at nothing in particular, a clipboard list of things people ask him to stop with lead.
- **Mina** (calm, unhurried, no "!", speaks to how the learner feels): a patient who was worried about a scan, her own dose badge at the end of the month, a headline a friend sent her and how she read it.

Rules that carry over: a reply label is the learner's own message; two to six replies of one type; no two stories share a shape (each teacher's five must branch differently, and differently from Hal's and Ada's); a chat never teaches something the unit has not reached; any fact in a chat is one a lesson already states with a source.

To check before authoring: with four teachers in Contacts, what a `welcome_back` day sends. If every teacher's welcome-back story unlocks on the same day, the learner returns to four letters at once; if so, the engine should pick one teacher (the current unit's) per return.

## 7. Feed

Ray and Mina each gain the unit set Ada has, written in their own words (no template is pooled across posters):

| Trigger | Count | Condition |
|---|---|---|
| `lesson_complete` | 2 per lesson (10) | `unitId` + `lessonId`, so the two alternate |
| `lesson_complete`, perfect | 2 | `perfect: true` on two chosen lessons |
| `checkpoint_pass` | 1 | own unit |
| `testout_pass` | 1 | own unit |
| `unit_complete` | 2 | own unit (congratulation), and the unit before theirs (the hand-over: Ray greets a learner who finished *Radioactivity*, Mina one who finished *Radiation Meets Matter*) |

About 16 new templates each, ids `ft-ray-...` and `ft-mina-...`. `test:voice` already requires each unit's posts to be spoken by the unit's teacher and the calm characters never to shout; both new teachers are in the calm group.

The other cast members need no new templates. Check `test:feed` and `test:voice` for lists of units or teachers that are written out by hand.

## 8. Blog

Two pieces per unit by its teacher, each unlocked by finishing a lesson, with a cover scene in `BLOG_SCENES`, sources, another cast member as reactor and one read-only comment.

| Unit | Piece (working title) | Unlocked by | Angle |
|---|---|---|---|
| 3 | "Plain words: your bag is fine" | `irradiated-or-contaminated` | Airport scanners, exposed versus contaminated |
| 3 | "Plain words: what a click is" | `detecting-radiation` | One click, one event; why a counter never reads zero |
| 4 | "Calm note: the dose you already get" | `the-dose-scale` | Where an ordinary year's dose comes from |
| 4 | "Calm note: reading a scary number" | `risk-in-perspective` | Three questions to ask about any dose in a headline |

A blog piece may go one step beyond its lesson but states nothing a lesson would have to retract.

## 9. Atom Maze

One world per unit, five levels, one lesson per level, appended to `STORY_LEVELS` and `STORY_WORLDS` (levels 16 to 20 and 21 to 25).

| World | Unit position | Look (proposed) | Level ids (proposed) |
|---|---|---|---|
| `radiation-meets-matter` | 3 | `mushrooms` biome, `purple` ground (Ray's colour) | `ion-grove`, `shield-wall`, `clean-room`, `click-caves`, `unit-peaks` |
| `radiation-and-the-body` | 4 | `hills` biome, `snow` ground | `dose-slopes`, `cell-garden`, `long-road`, `safe-distance`, `summit-view` |

- Both biomes and both grounds already exist in `platformer-view.ts`; no new art pack is needed for the backdrop.
- Question pools are bank items of the unit, multiple choice or myth-or-fact only, easy to hard; the tests check every id against `content.db`, so the pools are written after the lessons are synced.
- Each unit's first sign explains its new mechanic and the other two signs discuss the lesson without giving answers away, as in Units 1 and 2.
- Mechanics: Units 1 and 2 each added about one new thing per level. Decided: each new world adds **two** new mechanics and otherwise reuses existing ones. Candidates that fit the subject: for Unit 3, blocks that stop one kind of projectile but not another (paper, metal, lead); for Unit 4, a zone that drains hearts slowly unless crossed quickly or behind cover (time, distance, shielding as play). Each needs a legend entry in `LevelDef`, core rules and tests.
- The last level of each world has a boss, with the existing intro and victory sequences.
- `paletteIndex`, story-map banners and `story-map-core.ts` should take the new worlds with no layout change; verify the map at 25 levels on a small screen.

## 10. Hand-over points in Units 1 and 2 (shipped content, edits only)

Content 1.0.0 is published, so every id in Units 1 and 2 is shipped: text can change, ids cannot be renamed, nothing is deleted without `--retire`.

1. **Ada's tease line** (`line-ada-tease`: "Finish my unit first. There is more to learn about what radiation does.") stays valid. Ray needs his own tease pointing at Mina's unit, and Mina's tease must not promise a unit that does not exist (see §11).
2. **Unit 2's teaser cards** ("Later you'll learn why exposure is not the same as becoming radioactive") stay as they are; Unit 3 L3 and Unit 4 L1 open by calling back to them.
3. **Unit 2's checkpoint** is no longer the end of the path. Check its finish text and Ada's unit-complete chat and feed post for wording that says the course is over.
4. **`services/guide/topics.ts`** lists `unitIds` per topic; add the new units where a topic belongs to them, if that engine is still reachable (the old Guide screen is unlinked).

## 11. The end of the path

With four units the path still ends, now after Mina's checkpoint. Decide what the learner sees there and make it deliberate:

- Mina's `tease` line and her unit-complete chat say that more is coming without naming a date or a unit title.
- Home below the last checkpoint: check what is drawn today after Unit 2's last node. If it is nothing, add a small closing card ("More units are on the way", with Review and Myth Buster as things to do meanwhile). This is the one new piece of app UI in this spec.
- The Review node, quests, Myth Buster and the Atom Maze keep giving a finished learner something to do; weekly lesson quests must stay completable by review and practice once no new lesson is left (they already count a passed practice).

## 12. Systems to re-check at twice the size

Nothing here is expected to break; each is a number that was tuned for ten lessons.

| System | What to check |
|---|---|
| XP and levels | Twenty lessons roughly double first-time XP. Shop unlock levels (`TIER_LEVELS`), phone unlocks by level (Library at 3, Map at 5) and chat `level_reached` triggers now arrive earlier relative to the path's length. Decide whether that is fine (recommended: leave it) or re-space. |
| Achievements | `test:achievements` keeps tiers within reach; lesson-count tiers stay as they are. |
| Phone unlocks | No change proposed. Option: give Unit 3 or 4 an unlock of its own by moving one existing app later (for example the Nuclear Map to finishing Unit 3). Decided: no new app and no unlock changes. |
| Rivals and ranking | `rank-core.ts` paces rivals on the learner's own week, so no change. |
| Content DB size and first-run copy | The bundle grows by roughly the size of Units 1 and 2 again; re-run the first-launch checks in `GOOGLE_PLAY_LAUNCH_SPEC.md`. |
| Home map | `map-window-core.ts` draws only nodes near the screen; scroll the whole 28-node path on a low-tier Android. |
| Onboarding and the tour | Unaffected (they use Unit 1's first lesson). |
| Translations | `content_translations` covers Myth Buster only; new statements need rows only if a second locale ships. |
| Store listing | Any text or screenshot that counts units or lessons. |

## 13. Teacher designs

Ray and Mina have working designs from `NPC_TEACHERS_SPEC.md` (Ray: deep skin, crop, square glasses, purple hoodie, clipboard; Mina: brown skin, bun, green coat, stethoscope). Hal and Ada were both redesigned from concept pictures and gained shop items from their designs.

Decided: author against the current designs. The owner will revise them later by replacing the design files (the characters file and `NPC_ROSTER`, together), so nothing in lessons, chats, feeds or blogs may depend on how a teacher looks beyond the props already in their bio. If a redesign happens it follows the Hal and Ada pattern: new drawing data, an optional `cover` colour, the characters file and `NPC_ROSTER` changed together, cover glyphs that picture the unit, and a few shop items at the END of their shelves.

One thing to look at either way: Mina's unit will be green, which is also the colour of a right answer and a finished node. Open a Unit 4 map with completed nodes on a device and confirm the states still read; if not, give her a `cover` colour.

## 14. Build order

Unit 3 is finished end to end before Unit 4 starts, so problems in the process are found once.

1. **Lesson spec per unit** (`UNIT_3_RADIATION_MEETS_MATTER_SPEC.md`, then `UNIT_4_...`), modelled on `UNIT_2_RADIOACTIVITY_SPEC.md`: objectives with `reliesOn`, card-by-card outlines, language rules, facts to verify. Owner reviews before any file is written.
2. **References first:** add the unit's sources and have a person check each against its page.
3. **Curriculum files:** unit, path, objectives, lessons; new AtomDex entries; `content:sync`, `validate:content`.
4. **Figures and sims:** figure functions and ids, contact sheet, then any sim (core, tests, validator rule, component).
5. **Teacher surfaces:** lines, chat, feed, blog and blog art, statements.
6. **Atom Maze world:** levels, question pools, any new mechanic.
7. **Map pictures and icons;** end-of-path card (once, with Unit 4).
8. **Device pass:** all five lessons, the chats, the feed and the world on a preview APK, animations at Max and Disabled.
9. **Publish** as a minor content release (rows added: 1.1.0 after Unit 3, 1.2.0 after Unit 4, or one release for both), then commit the content files together. Update CLAUDE.md, the unit map row names in `LESSON_RESTRUCTURE_SPEC.md` §4.1 and `content/source/README.md` where they name units.

## 15. Acceptance criteria

- `check:source`, `validate:content` and the publish gate pass with 0 errors and no unverified reference.
- Each new unit has every row of §3, and `test:curriculum`, `test:curriculum-content`, `test:figures`, `test:npc`, `test:voice`, `test:chats`, `test:feed`, `test:blog-art`, `test:story-map`, `test:platformer`, `test:path-nodes`, `test:source-adapters` and `test:achievements` pass.
- Every objective is taught in exactly one lesson with at least two scored items; no lesson re-teaches an idea owned by another unit (§4.3, §5.3).
- No Core card in Unit 4 states a dose number without a verified source, gives medical advice, or says radiation is harmless.
- Lessons and Safety Guide cards agree wherever they cover the same idea.
- A learner who finishes Unit 4 sees a deliberate end of the path, and no text anywhere says the course ends after Unit 2.
- No shipped id from content 1.0.0 was renamed or deleted.
- A new install can play from onboarding to Mina's checkpoint on a preview APK with no missing teacher, figure, chat or level.

## 16. Decisions (owner, 2026-11-23)

1. **Lesson titles and ids:** pros and cons requested; still open until the lesson spec for each unit is reviewed. Ids only become permanent when the unit is published, so they can change freely until then.
2. **Ray and Mina's designs:** ship the current ones; the owner will replace the design files later.
3. **Atom Maze:** two new mechanics per world, otherwise reuse (§9).
4. **Order:** everything for Unit 3 is finished before Unit 4 starts. (Working assumption: Unit 3 is published as its own content release, 1.1.0, before Unit 4 begins.)
5. **Phone:** no new app, no unlock changes.
6. **Sources:** teach facts only, from verified sources; nothing experimental (see §5.3 "Facts only", which applies to all four units).
