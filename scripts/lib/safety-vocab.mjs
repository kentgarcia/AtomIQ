/**
 * The Safety Guide vocabulary (docs/features/PHONE_SPEC.md §5.9 and §7.1), as plain data. Framework-free, so the validator
 * (scripts/lib/safety-rules.mjs), the Content Studio and the app read the same names.
 */

/** The three sections a card sits in (`safety_cards.section`), in the order the list shows them. */
export const SAFETY_SECTIONS = ["basics", "happens", "myths"];

/** What the learner reads for each section on the list. */
export const SAFETY_SECTION_TITLES = { basics: "Radiation basics", happens: "If something happens", myths: "Myths that cost people" };

/** Limits a card is written to (characters; `steps` is a count). */
export const SAFETY_LIMITS = { title: 40, summary: 100, step: 120, steps: 5, minSteps: 2 };
