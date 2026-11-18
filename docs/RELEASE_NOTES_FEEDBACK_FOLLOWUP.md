# Beta feedback follow-up: release notes

Implements `ATOMIQ_FEEDBACK_SUMMARY_SPEC.md`. **Nothing here has been run on a device or emulator.** The automated gates below pass; the on-device checklist at the end is still open.

## Shipped

### P1
| Item | What changed | Docs / gate |
| --- | --- | --- |
| Media consistency (§4.1) | One Read Aloud controller, one preference store, one `ReadAloudButton` on every surface. Late callbacks from a replaced utterance are ignored, so a button can no longer report the wrong state. Speech stops on screen exit, route change, backgrounding and answering. Lesson assessments, labs and myth cards now play the same correct/wrong cue as the quiz. Settings gains a Read Aloud toggle. Guide (Schrodi) and Atom Maze gain Read Aloud. | `docs/MEDIA_POLICY.md`, `npm run test:media` |
| Tab-bar overlap (§4.2) | The gradient fade is bounded by the reserved band. Guide mode hides the bar through the layout provider instead of a late navigation param. The bar hides while the keyboard is open. Guide quick-start descriptions use `textSecondary` (was 2.7:1). | `npm run check:tab-bar` |
| Question completeness (§4.3) | Validator covering quiz, MythBuster/Atom Maze/Endless pools, lesson steps, maze rooms, myths and articles. 146 changes in 142 rows fixed, including 100 MythBuster explanations that were only "Correct answer: X." | `docs/CONTENT_QUESTION_QUALITY.md`, `npm run validate:content`, `npm run test:content` |
| Atom Maze repeats (§4.4) | Endless mode tracked used questions in two separate sets, and the served question was recomputed from index and display order. Progression is now a pure, tested state machine with idempotent correct-answer commits and an explicit exhausted-pool notice with "start new run". | `npm run test:maze` |
| Schrodi option contrast (§4.5) | The selected option and intent pills were white on orange (2.33:1). They now use semantic amber pairs that pass 4.5:1 in light and dark for idle, pressed, selected and disabled states; selected also shows a check and thicker border. | `npm run test:contrast` |

### P2
| Item | What changed | Docs / gate |
| --- | --- | --- |
| Visual lesson blocks (§5.1) | Six block kinds, each requiring learning objective, alt text, plain-text equivalent, and source where it depends on external data. 12 blocks attached to the matching lessons: atom, isotope, penetration, half-life, dose comparison, medical imaging and treatment, reactor, defence in depth, agriculture, food irradiation, water tracers. | `docs/completed/VISUAL_LESSON_BLOCKS.md`, `npm run test:visuals` |
| Periodic table (§5.2) | All 118 elements, grid plus list view, search and category filters, element detail with an element/isotope/ion explainer, links to lessons and encyclopedia entries, offline. | `npm run test:periodic` |
| Activity tracker (§5.3) | Local-first day-level history, a 5-level scale that cannot be inflated by repeats, a heatmap with legend, text summary and day details, shown on the Streak screen with a strip on Profile. Streak numbers are the existing streak, unchanged. | `docs/ACTIVITY_TRACKER.md`, `npm run test:activity` |
| Articles and research (§5.4), since removed with the Articles feature | Source and review metadata on every article and post, a labelled Summary vs Source layout, 6 new original beginner summaries, and a publishing process. | (doc deleted) |

## Intentionally deferred / known gaps

- **Music:** no music track is bundled. The policy, preference and channel exist, but there is no Music toggle and nothing plays until a track is registered.
- **Periodic table:** no Discover or Guide quick-start link. Quizzes, Lab and lesson content do not use `ElementChip` or `openElement` yet. Zoom is by buttons, not pinch.
- **Activity tracker:** after Delete Account, the in-memory activity cache is cleared only on restart. The Streak screen's existing "This Week" row still reads the older `daily_activity` table.
- **Articles (feature since removed):** no article or post is marked `reviewed`. The 8 posts that read as copied source text need rewriting or permission. `nuclear-safety-stats` needs a working source link. The FDA link blocked automated checks and needs a manual open. The Content Studio shows the new enum columns as plain text inputs.
- **Visual blocks:** the Content Studio has no editor for `visuals`; it preserves them on save.
- **Content review needed before release:** the MythBuster explanations rewritten in this pass, some true/false claims, and the dose values and `verify: true` sources in the visual blocks all need a subject-matter read. `npm run validate:content -- --strict-review` fails while 31 articles/posts are unreviewed; that is the intended release gate.
- **Content change to confirm:** 5 legacy article bylines (unverified personas) were replaced with "AtomIQ Editorial Team".

## Quality gates (all pass)

`tsc --noEmit`, `validate:content`, `test:content`, `test:media`, `test:contrast`, `test:maze`, `test:periodic`, `test:activity`, `test:visuals`, `test:theme`, `test:icons`, `check:theme-colors`, `check:icons`, `check:tab-bar`. ESLint: 0 errors in app code; the 9 remaining errors are the pre-existing ones in `scripts/*.js`, `tools/studio` and `.expo`.

`content/database/content.db` was synced into `assets/database/content.db` and `CONTENT_DB_VERSION` re-derived, so devices re-seed on update.

## On-device checklist (not done)

- Read Aloud across lesson quiz, random quiz, Guide, MythBuster, Atom Maze and Lab with effects on and off. Check TalkBack and Samsung vs Google TTS.
- Tab-bar clearance on compact, standard, short and tablet viewports, with gesture and three-button navigation. Check the Guide landing scrolled to the bottom, and the bar returning after the keyboard or a nested route.
- Schrodi option colours in light and dark, selected/pressed/disabled, at large font size.
- Atom Maze: multiple transitions, Android back during the result delay, and the exhausted-pool state.
- Visual blocks: real font widths in SVG labels, a short phone, font scale 1.3 or more, a tablet, and dark mode.
- Heatmap in light and dark, and at tablet width.
