/**
 * The Nuclear Map vocabulary (docs/PHONE_SPEC.md §5.8 and §7.1), as plain data. Framework-free, so the validator
 * (scripts/lib/map-rules.mjs), the Content Studio and the app read the same names.
 */

/** What kind of place a pin is (`map_sites.kind`); each has its own colour on the map. */
export const MAP_KINDS = ["discovery", "research", "reactor", "accident", "history", "natural"];

/** What the learner reads for each kind. */
export const MAP_KIND_NAMES = { discovery: "Discovery", research: "Research", reactor: "Power", accident: "Accident", history: "History", natural: "Natural" };

/** Limits a site card is written to (characters). */
export const MAP_LIMITS = { name: 40, place: 40, year: 14, blurb: 90, fact: 240 };
