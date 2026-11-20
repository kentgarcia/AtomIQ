/**
 * Nuclear Map validation (docs/features/PHONE_SPEC.md §5.8).
 *
 * `validateMapData` is pure; `validateMap` reads the content database. `validateDatabase` runs it, so `npm run validate:content`, Studio
 * saves and the publish gate enforce it. A site needs real coordinates and a kind, and is sourced: at least one reference, and at the publish
 * gate (`strictReview`) every source must have been checked by a person.
 * Findings: { table, id, field, rule, severity, message }.
 */

import { MAP_KINDS, MAP_LIMITS } from "./map-vocab.mjs";

/**
 * @param {{ sites: any[], references: Array<{id: string, verified: number|boolean}>, links: Array<{site_id: string, reference_id: string}>, entryIds?: string[] }} data
 * @param {{ strictReview?: boolean }} [options]
 */
export function validateMapData(data, { strictReview = false } = {}) {
  const findings = [];
  const add = (row, field, rule, severity, message) => findings.push({ table: "map_sites", id: row.id, field, rule, severity, message });
  const refs = new Map(data.references.map((r) => [r.id, r]));
  const entryIds = new Set(data.entryIds ?? []);

  const text = (row, field, label, max, required = true) => {
    const v = String(row[field] ?? "").trim();
    if (!v) {
      if (required) add(row, field, `map-${field}`, "error", `the ${label} is required`);
    } else if (v.length > max) add(row, field, `map-${field}`, "warning", `the ${label} fits ${max} characters or fewer (this is ${v.length})`);
  };

  for (const s of data.sites) {
    if (!MAP_KINDS.includes(s.kind)) add(s, "kind", "map-kind", "error", `kind must be one of ${MAP_KINDS.join(", ")}`);
    text(s, "name", "name", MAP_LIMITS.name);
    text(s, "place", "place", MAP_LIMITS.place);
    text(s, "year", "year", MAP_LIMITS.year);
    text(s, "blurb", "one-line description", MAP_LIMITS.blurb);
    text(s, "fact", "fact", MAP_LIMITS.fact);

    if (typeof s.lat !== "number" || !Number.isFinite(s.lat) || s.lat < -90 || s.lat > 90) add(s, "lat", "map-coordinates", "error", "latitude must be a number from -90 to 90");
    if (typeof s.lon !== "number" || !Number.isFinite(s.lon) || s.lon < -180 || s.lon > 180) add(s, "lon", "map-coordinates", "error", "longitude must be a number from -180 to 180");

    if (s.entry_id && !entryIds.has(s.entry_id)) add(s, "entry_id", "map-entry", "error", `the AtomDex entry "${s.entry_id}" does not exist`);

    const mine = data.links.filter((l) => l.site_id === s.id);
    if (mine.length === 0) add(s, "references", "map-reference", "error", "a site needs at least one source");
    for (const l of mine) {
      const ref = refs.get(l.reference_id);
      if (!ref) add(s, "references", "map-reference", "error", `the source "${l.reference_id}" does not exist`);
      else if (!ref.verified) add(s, "references", "map-reference-unverified", strictReview ? "error" : "warning", `the source "${l.reference_id}" has not been checked by a person yet`);
    }
  }

  return { checked: { map_sites: data.sites.length }, findings };
}

export function validateMap(db, { strictReview = false } = {}) {
  const has = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if (!has("map_sites")) return { checked: {}, findings: [] };
  const all = (sql) => db.prepare(sql).all();
  return validateMapData(
    {
      sites: all("SELECT * FROM map_sites ORDER BY position, id"),
      references: has("content_references") ? all("SELECT id, verified FROM content_references") : [],
      links: has("map_site_references") ? all("SELECT site_id, reference_id FROM map_site_references") : [],
      entryIds: has("encyclopedia_entries") ? all("SELECT id FROM encyclopedia_entries").map((r) => r.id) : [],
    },
    { strictReview },
  );
}
