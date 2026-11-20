# AtomIQ Feedback Summary

**Status:** Draft for beta follow-up  
**Date:** 2026-11-11  
**Source:** Beta tester feedback  
**Owner:** AtomIQ product and engineering

## 1. Executive summary

Beta testers found no major blocking bugs. AtomIQ was described as cool, enjoyable, and effective at bringing back the joy of studying science, especially nuclear science.

The main opportunity is to make the experience more consistent, contextual, visual, and interactive. The first follow-up should address UI/UX defects that interrupt learning, then expand the content and engagement systems that help learners build confidence and return daily.

## 2. Feedback themes

| Theme | Summary | Product implication |
|---|---|---|
| Reliability and consistency | Read Aloud, background effects, and music behave inconsistently across lesson quizzes, lessons, Schrodi/Shrodi, and games. | Define one media behavior contract and test it across every learning surface. |
| Layout and navigation | The middle navigation bar with the orange cat logo can float over buttons and make Discover/Practice descriptions unreadable. | Reserve the actual tab-bar inset and prevent fixed navigation from occluding content or actions. |
| Learning clarity | Some questions appear as fragments or lack enough context. | Treat question completeness and context as content-quality requirements. |
| Game state | Atom Maze can repeat a question after the learner answers correctly. | Make question progression deterministic and test answered-question state transitions. |
| Accessibility and contrast | The font color for Schrodi’s option is not clearly visible. | Review contrast and selected/disabled states for every interactive option in both themes. |
| Visual learning | Lessons are mostly text-based and need more pictures, models, diagrams, and real-life examples. | Add visual explanation as a first-class lesson content type, not only decoration. |
| Foundational support | Students unfamiliar with elements may feel overwhelmed without a periodic table. | Add an accessible periodic-table learning tool and link it to relevant lessons. |
| Retention | Testers requested a GitHub-style daily contribution/activity tracker. | Add a privacy-conscious, local-first activity history that supports streaks without becoming pressure-heavy. |
| Content depth | Testers want more articles and research. | Expand the content pipeline with source metadata and a sustainable publishing cadence. |

## 3. Priorities

### P1 — Fix before the next broad beta

1. Media consistency: Read Aloud, background effects, and music.
2. Tab-bar overlap and unreadable Discover/Practice descriptions.
3. Incomplete or context-free quiz questions.
4. Atom Maze question repetition after a correct answer.
5. Schrodi/Shrodi option contrast and selected-state readability.

### P2 — Improve learning quality and engagement

1. Add visual learning content: diagrams, models, labeled illustrations, and real-life examples.
2. Add a periodic table with beginner-friendly explanations and lesson links.
3. Add the daily contribution/activity tracker.
4. Expand articles and research content.

### P3 — Ongoing refinement

- Improve interaction variety and feedback across lessons and games.
- Tune visual density, animation, sound, and accessibility based on usage data and follow-up testing.
- Continue collecting qualitative feedback from learners with different levels of nuclear-science experience.

No P0 production-blocking bug was reported in this beta round.

## 4. P1 technical requirements

### 4.1 Shared media behavior

Create one media policy used by lessons, random quizzes, Schrodi/Shrodi, MythBuster, Atom Maze, and other games.

The policy must define:

- what Read Aloud reads on each screen: question, answer options when appropriate, explanation, or current assistant message;
- play, pause, stop, replay, and screen-exit behavior;
- how a new speech request stops the previous request;
- how background music and effects are enabled, muted, paused, or resumed;
- behavior when the learner changes screens, backgrounds the app, toggles sound settings, or enables reduced motion/accessibility settings;
- loading, unavailable, interrupted, and error states;
- one source of truth for user preferences so lessons, games, and Schrodi do not drift.

Acceptance criteria:

- Read Aloud has the same visible state model and control behavior across lessons, random quizzes, Schrodi/Shrodi, and games.
- Starting a new utterance stops the previous utterance and never leaves two active controls claiming to be playing.
- Leaving a screen stops or explicitly preserves media according to the policy; no audio continues unexpectedly.
- Background music and effects respect the same settings everywhere.
- Light/dark mode, Android back, app backgrounding, and route changes do not strand media controls in a stale state.

### 4.2 Middle navigation overlap

The custom middle navigation bar must never cover text, descriptions, buttons, bottom actions, or the final content item.

Requirements:

- Measure and reserve the actual tab-bar height plus safe-area inset on every screen where the bar is visible.
- Hide or reposition the bar in immersive flows where it competes with a primary action.
- Ensure Discover and Practice descriptions remain fully readable above the bar on compact, standard, short-height, and tablet viewports.
- Verify both Android gesture navigation and three-button navigation.

Acceptance criteria:

- No interactive control or readable description is underneath the bar at any supported viewport.
- The last item and primary CTA remain reachable by scrolling.
- The bar does not visually float over content after returning from a modal, keyboard, or nested route.
- Automated layout checks or screenshot evidence cover the affected Discover and Practice states.

### 4.3 Question completeness and context

All quiz and game questions must read as complete, understandable thoughts without requiring hidden context from a previous screen.

Requirements:

- Add a content validation rule for sentence fragments, dangling punctuation, missing subject/context, and unresolved placeholders.
- Keep the question, answer choices, explanation, and any visual reference semantically aligned.
- When a question depends on a previous step, include the necessary context in the visible prompt or an explicit context label.
- Review existing random-quiz pools and lesson assessments before publishing new content.

Acceptance criteria:

- A learner can understand what is being asked from the current screen alone.
- Question content passes a human review for beginner learners and a machine/content validation pass.
- No placeholder, truncated stem, orphaned continuation, or answer choice without a clear question remains in the released content database.

### 4.4 Atom Maze progression

Atom Maze must not serve the same question again after it has been answered correctly unless replay is an explicit product behavior.

Requirements:

- Track question identity and answer status independently from display order.
- Mark a question consumed only after the correct-answer transition has committed.
- Prevent duplicate selection from the active question pool until the pool is exhausted or the learner intentionally starts a new run.
- Preserve progress correctly across animations, route transitions, retry actions, and Android back handling.

Acceptance criteria:

- A correct answer advances to a new unanswered question.
- Rapid taps, animation completion, and rerenders cannot re-submit or reselect the previous question.
- A test run can assert the sequence of question ids and prove no unexpected repeat occurs.
- If the pool is exhausted, the UI explains the reset/replay behavior instead of silently repeating.

### 4.5 Schrodi/Shrodi option contrast

The Schrodi/Shrodi option must remain readable in light mode, dark mode, selected state, pressed state, disabled state, and reduced-contrast device settings.

Requirements:

- Use semantic theme colors for option text, icon, background, border, and selected state.
- Meet the project’s approved contrast target for body text and interactive labels.
- Do not use a light-only text color on a light option surface or a muted color that disappears when selected.
- Add a visible focus/selected indicator that does not rely on color alone.

Acceptance criteria:

- The option label and icon are legible in both themes and every interaction state.
- Contrast remains valid at large font/display-size settings.
- A screenshot or component test covers the reported Schrodi option state.

## 5. P2 learning and engagement requirements

### 5.1 Visual learning content

Introduce structured visual lesson blocks that can be reused across the content database:

- labeled diagrams and process flows;
- simplified models, such as atom, isotope, radiation, shielding, decay, and reactor models;
- comparison cards and annotated illustrations;
- real-life examples with a short explanation of the science and why it matters;
- optional captions, alt text, source/credit, and a plain-text equivalent.

Visuals must support learning rather than act as decoration. Each visual block must define its learning objective, explanation, accessibility text, source/credit when applicable, and responsive behavior on phones and tablets.

Initial content candidates:

- atom and isotope structure;
- alpha, beta, and gamma penetration;
- half-life and decay;
- radiation dose comparisons;
- medical imaging and treatment;
- nuclear energy and reactor safety;
- environmental and agricultural applications.

### 5.2 Periodic table

Add a periodic-table feature that supports both reference and guided learning.

Minimum scope:

- complete element grid with symbol, atomic number, name, and category;
- search and category/filter support;
- element detail view with beginner-friendly facts;
- clear distinction between element, isotope, and ion;
- links from relevant lessons, quizzes, and Lab content;
- offline availability for the bundled core data;
- accessibility labels and a non-grid alternative for screen readers or small screens.

The first release should prioritize clarity and reliable fundamentals over advanced chemistry detail.

### 5.3 Daily contribution/activity tracker

Add a GitHub-style activity contribution view for learning activity, not social comparison.

Minimum tracked events:

- lesson step or lesson completed;
- quiz attempt/completion;
- Lab or game session completed;
- article/research item read;
- periodic-table exploration, if meaningful engagement is defined.

Requirements:

- local-first storage with a stable day-level activity record;
- clear explanation of what counts as activity;
- streak calculation consistent with the existing streak system;
- no fabricated activity and no requirement to maintain a streak to use the app;
- accessible color legend, text summary, and exact day details;
- timezone-safe day boundaries and predictable behavior when the device clock changes;
- privacy-preserving design with no public sharing in the first release.

Acceptance criteria:

- Activity appears on the correct local calendar day.
- Repeated actions do not inflate the visual intensity beyond the defined scale.
- The user can understand current streak, active days, and recent activity without relying on color alone.
- Existing progress survives app restart and database/content updates.

### 5.4 Articles and research

Expand the article/research library through a repeatable content pipeline.

Each item should include:

- title, summary, category, difficulty, and estimated reading time;
- author or organization and publication date;
- source URL and source type;
- related lessons, concepts, myths, or periodic-table entries;
- a clear distinction between educational summary and source material;
- review status and last-reviewed date.

Prioritize authoritative sources and beginner-friendly explainers before increasing volume. Content must work offline when bundled and degrade gracefully when remote imagery or links are unavailable.

## 6. Validation plan

### Beta regression pass

- [ ] Run every lesson random-quiz path with Read Aloud, background effects, and music enabled and disabled.
- [ ] Repeat the same media pass in Schrodi/Shrodi, MythBuster, Atom Maze, and other games.
- [ ] Verify tab-bar clearance on compact phone, standard phone, short viewport, tablet, gesture navigation, and three-button navigation.
- [ ] Review a representative sample of every question pool for completeness and context.
- [ ] Run Atom Maze until multiple question transitions are observed and record question ids.
- [ ] Check Schrodi/Shrodi option contrast in light/dark, selected/pressed/disabled, and large-font states.
- [ ] Verify new visual blocks, periodic-table navigation, activity tracker, and article metadata on offline-capable builds.

### Quality gates

- Typecheck and lint pass.
- Content validation pass with zero incomplete production questions.
- Media behavior tests pass with no orphaned audio state.
- Layout/screenshot pass shows zero tab-bar occlusion.
- Atom Maze progression test shows no unexpected correct-answer repeats.
- Contrast review passes for reported controls and all new interactive states.
- Release notes identify any intentionally deferred P2 scope.

## 7. Success measures

Track these after the next beta round:

- number of media consistency defects reported;
- number of tab-bar overlap/readability defects reported;
- percentage of reviewed questions passing completeness/context review;
- Atom Maze repeat-question rate after correct answers;
- Schrodi/Shrodi option readability complaints;
- lesson completion rate for lessons containing new visual blocks;
- periodic-table opens and linked lesson conversions;
- weekly active learning days and seven-day return rate;
- articles/research opened and completed;
- qualitative rating for “easy to understand” and “motivating to continue learning.”

The next beta should preserve the current positive sentiment—joy, curiosity, and appreciation for nuclear-science learning—while reducing friction in audio, navigation, question clarity, and game progression.

## 8. Non-goals for this follow-up

- Replacing the core lesson architecture in one release.
- Turning the activity tracker into a public leaderboard or social feed.
- Adding visual decoration without a learning objective or accessibility text.
- Increasing content volume without source metadata and review ownership.
- Treating a fallback or workaround as a substitute for fixing inconsistent media, occluded UI, incomplete questions, or incorrect game state.

