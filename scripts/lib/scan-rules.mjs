/**
 * Atom Scanner validation (docs/PHONE_SPEC.md §8 accuracy rules).
 *
 * `validateScanData` is pure; `validateScan` reads the content database. `validateDatabase` runs it, so
 * `npm run validate:content`, Studio saves and the publish gate enforce it. A target must name elements that exist,
 * list them without amounts, and be sourced: at least one reference, and at the publish gate (`strictReview`)
 * every source must have been checked by a person, like the lessons' and the blog pieces'.
 * Findings: { table, id, field, rule, severity, message }.
 */

import { ELEMENTS } from "../../content/periodic-table/elements.ts";
import { isArtId } from "../../components/lesson/visual/object-art.ts";
import { SCAN_LIMITS, SCAN_SCENES, hasAmount } from "./scan-vocab.mjs";

const isRec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

const parseJson = (raw, fallback) => {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const SYMBOLS = new Set(ELEMENTS.map((e) => e.symbol));

/**
 * @param {{ targets: any[], references: Array<{id: string, verified: number|boolean}>, links: Array<{target_id: string, reference_id: string}>, entryIds?: string[] }} data
 * @param {{ strictReview?: boolean }} [options]
 */
export function validateScanData(data, { strictReview = false } = {}) {
  const findings = [];
  const add = (row, field, rule, severity, message) => findings.push({ table: "scan_targets", id: row.id, field, rule, severity, message });
  const refs = new Map(data.references.map((r) => [r.id, r]));
  const entryIds = new Set(data.entryIds ?? []);

  for (const t of data.targets) {
    if (!SCAN_SCENES.includes(t.scene)) add(t, "scene", "scan-scene", "error", `scene must be one of ${SCAN_SCENES.join(", ")}`);
    if (!isArtId(t.object)) add(t, "object", "scan-object", "error", `"${t.object}" is not a lesson object picture`);

    const name = String(t.name ?? "").trim();
    if (!name) add(t, "name", "scan-name", "error", "the name is required");
    else if (name.length > SCAN_LIMITS.name) add(t, "name", "scan-name", "warning", `a name fits ${SCAN_LIMITS.name} characters or fewer`);

    const blurb = String(t.blurb ?? "").trim();
    if (!blurb) add(t, "blurb", "scan-blurb", "error", "the one-line description is required");
    else if (blurb.length > SCAN_LIMITS.blurb) add(t, "blurb", "scan-blurb", "warning", `one line fits ${SCAN_LIMITS.blurb} characters or fewer (this is ${blurb.length})`);

    const fact = String(t.fun_fact ?? "").trim();
    if (!fact) add(t, "fun_fact", "scan-fun-fact", "error", "the fun fact is required");
    else if (fact.length > SCAN_LIMITS.funFact) add(t, "fun_fact", "scan-fun-fact", "warning", `a fun fact fits ${SCAN_LIMITS.funFact} characters or fewer (this is ${fact.length})`);

    // The composition: which elements, never how much
    const comp = t.composition;
    if (!Array.isArray(comp) || comp.length === 0) add(t, "composition", "scan-composition", "error", "list at least one element");
    else {
      if (comp.length > SCAN_LIMITS.composition) add(t, "composition", "scan-composition", "warning", `at most ${SCAN_LIMITS.composition} chips fit on the result card`);
      const seen = new Set();
      comp.forEach((c, i) => {
        const where = `element ${i + 1}`;
        if (!isRec(c) || typeof c.symbol !== "string") return add(t, "composition", "scan-composition", "error", `${where} needs a symbol`);
        if (!SYMBOLS.has(c.symbol)) add(t, "composition", "scan-symbol", "error", `${where}: "${c.symbol}" is not an element symbol of the periodic table`);
        if (seen.has(c.symbol)) add(t, "composition", "scan-symbol", "error", `${where}: ${c.symbol} is listed twice`);
        seen.add(c.symbol);
        if (c.note !== undefined && c.note !== null && String(c.note).length > SCAN_LIMITS.note) add(t, "composition", "scan-note", "warning", `${where}'s note fits ${SCAN_LIMITS.note} characters or fewer`);
        if (hasAmount(c.note)) add(t, "composition", "scan-amount", "error", `${where}: say which elements are there, not how much (no percentages)`);
      });
    }
    if (hasAmount(fact) || hasAmount(blurb)) add(t, "fun_fact", "scan-amount", "error", "no percentages: composition says which elements are present, not how much");

    if (t.atomdex_entry_id && !entryIds.has(t.atomdex_entry_id)) add(t, "atomdex_entry_id", "scan-entry", "error", `the AtomDex entry "${t.atomdex_entry_id}" does not exist`);

    // Sources: at least one, all real, and checked by a person at the publish gate
    const mine = data.links.filter((l) => l.target_id === t.id);
    if (mine.length === 0) add(t, "references", "scan-reference", "error", "a target needs at least one source");
    for (const l of mine) {
      const ref = refs.get(l.reference_id);
      if (!ref) add(t, "references", "scan-reference", "error", `the source "${l.reference_id}" does not exist`);
      else if (!ref.verified) add(t, "references", "scan-reference-unverified", strictReview ? "error" : "warning", `the source "${l.reference_id}" has not been checked by a person yet`);
    }
  }

  return { checked: { scan_targets: data.targets.length }, findings };
}

export function validateScan(db, { strictReview = false } = {}) {
  const has = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if (!has("scan_targets")) return { checked: {}, findings: [] };
  const all = (sql) => db.prepare(sql).all();
  return validateScanData(
    {
      targets: all("SELECT * FROM scan_targets ORDER BY scene, position, id").map((r) => ({ ...r, composition: parseJson(r.composition, null) })),
      references: has("content_references") ? all("SELECT id, verified FROM content_references") : [],
      links: has("scan_target_references") ? all("SELECT target_id, reference_id FROM scan_target_references") : [],
      entryIds: has("encyclopedia_entries") ? all("SELECT id FROM encyclopedia_entries").map((r) => r.id) : [],
    },
    { strictReview },
  );
}
