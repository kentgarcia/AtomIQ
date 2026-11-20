/**
 * Safety Guide validation (docs/features/PHONE_SPEC.md §5.9).
 *
 * `validateSafetyData` is pure; `validateSafety` reads the content database. `validateDatabase` runs it, so
 * `npm run validate:content`, Studio saves and the publish gate enforce it. This is safety advice: every card needs at least one source, and at
 * the publish gate (`strictReview`) every source must have been checked by a person, like the lessons' and the scanner's.
 * Findings: { table, id, field, rule, severity, message }.
 */

import { SAFETY_LIMITS, SAFETY_SECTIONS } from "./safety-vocab.mjs";

const parseJson = (raw, fallback) => {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/**
 * @param {{ cards: any[], references: Array<{id: string, verified: number|boolean}>, links: Array<{card_id: string, reference_id: string}>, entryIds?: string[] }} data
 * @param {{ strictReview?: boolean }} [options]
 */
export function validateSafetyData(data, { strictReview = false } = {}) {
  const findings = [];
  const add = (row, field, rule, severity, message) => findings.push({ table: "safety_cards", id: row.id, field, rule, severity, message });
  const refs = new Map(data.references.map((r) => [r.id, r]));
  const entryIds = new Set(data.entryIds ?? []);

  for (const c of data.cards) {
    if (!SAFETY_SECTIONS.includes(c.section)) add(c, "section", "safety-section", "error", `section must be one of ${SAFETY_SECTIONS.join(", ")}`);

    const title = String(c.title ?? "").trim();
    if (!title) add(c, "title", "safety-title", "error", "the title is required");
    else if (title.length > SAFETY_LIMITS.title) add(c, "title", "safety-title", "warning", `a title fits ${SAFETY_LIMITS.title} characters or fewer`);

    const summary = String(c.summary ?? "").trim();
    if (!summary) add(c, "summary", "safety-summary", "error", "the one-line summary is required");
    else if (summary.length > SAFETY_LIMITS.summary) add(c, "summary", "safety-summary", "warning", `the summary fits ${SAFETY_LIMITS.summary} characters or fewer (this is ${summary.length})`);

    const steps = c.steps;
    if (!Array.isArray(steps) || steps.length === 0) add(c, "steps", "safety-steps", "error", "a card needs its lines");
    else {
      if (steps.length > SAFETY_LIMITS.steps) add(c, "steps", "safety-steps", "error", `at most ${SAFETY_LIMITS.steps} lines fit on a card`);
      else if (steps.length < SAFETY_LIMITS.minSteps) add(c, "steps", "safety-steps", "warning", `a card reads better with at least ${SAFETY_LIMITS.minSteps} lines`);
      steps.forEach((s, i) => {
        const text = typeof s === "string" ? s.trim() : "";
        if (!text) add(c, "steps", "safety-step", "error", `line ${i + 1} is empty`);
        else if (text.length > SAFETY_LIMITS.step) add(c, "steps", "safety-step", "warning", `line ${i + 1} fits ${SAFETY_LIMITS.step} characters or fewer (this is ${text.length})`);
      });
    }

    if (!String(c.icon ?? "").trim()) add(c, "icon", "safety-icon", "error", "an icon is required");
    if (c.entry_id && !entryIds.has(c.entry_id)) add(c, "entry_id", "safety-entry", "error", `the AtomDex entry "${c.entry_id}" does not exist`);

    // Sources: at least one, all real, and checked by a person at the publish gate
    const mine = data.links.filter((l) => l.card_id === c.id);
    if (mine.length === 0) add(c, "references", "safety-reference", "error", "a safety card needs at least one source");
    for (const l of mine) {
      const ref = refs.get(l.reference_id);
      if (!ref) add(c, "references", "safety-reference", "error", `the source "${l.reference_id}" does not exist`);
      else if (!ref.verified) add(c, "references", "safety-reference-unverified", strictReview ? "error" : "warning", `the source "${l.reference_id}" has not been checked by a person yet`);
    }
  }

  return { checked: { safety_cards: data.cards.length }, findings };
}

export function validateSafety(db, { strictReview = false } = {}) {
  const has = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if (!has("safety_cards")) return { checked: {}, findings: [] };
  const all = (sql) => db.prepare(sql).all();
  return validateSafetyData(
    {
      cards: all("SELECT * FROM safety_cards ORDER BY section, position, id").map((r) => ({ ...r, steps: parseJson(r.steps, null) })),
      references: has("content_references") ? all("SELECT id, verified FROM content_references") : [],
      links: has("safety_card_references") ? all("SELECT card_id, reference_id FROM safety_card_references") : [],
      entryIds: has("encyclopedia_entries") ? all("SELECT id FROM encyclopedia_entries").map((r) => r.id) : [],
    },
    { strictReview },
  );
}
