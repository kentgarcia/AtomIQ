/**
 * The Atom Scanner vocabulary (docs/features/PHONE_SPEC.md §8 and §7.1), as plain data. Framework-free, so the validator
 * (scripts/lib/scan-rules.mjs), the Content Studio and the app's scanner core read the same names.
 */

/** The scenes a target can sit in (`scan_targets.scene`). The art of each is `components/scanner/scan-scenes.ts`. */
export const SCAN_SCENES = ["kitchen", "outside", "body", "treasure"];

/** Limits a scan result card is written to (characters). */
export const SCAN_LIMITS = { name: 40, blurb: 90, note: 40, funFact: 220, composition: 6 };

/** A target's composition lists which elements are present; it never gives an amount, so no digits followed by % or the word "percent". */
export const hasAmount = (text) => /\d\s*(%|percent|per cent)|\bpercent\b/i.test(String(text ?? ""));
