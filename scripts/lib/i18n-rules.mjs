/**
 * Translation validation (docs/features/CONTENT_SOURCE_I18N_SPEC.md): every `content_translations` row names a record that exists,
 * a field that is words (not structure) and keeps the base text's placeholders. `validateDatabase` runs it, so
 * `validate:content`, `content:sync` and the publish gate all enforce it. Findings use the shape of the other validators:
 * { table, id, field, rule, severity, message }.
 *
 * What counts as words comes from the adapters (`translatable: true` on a column) and, inside a JSON column, from the word keys in
 * `content/i18n/i18n-core.ts`; nothing here lists a column by hand.
 */
import { FRIENDLY_ADAPTERS } from "./content-source/registry.mjs";
import { BASE_LOCALE, LOCALE_RE, formatPath, getAt, parsePath, samePlaceholders, wordLeaves } from "../../content/i18n/i18n-core.ts";

/** table -> { cols: Map<column, "text" | "list" | "json"> }, from the adapters. */
export function translatableColumns() {
  const out = new Map();
  for (const adapter of FRIENDLY_ADAPTERS.values()) {
    for (const rec of adapter.records) {
      for (const f of rec.fields) {
        if (!f.translatable) continue;
        const kind = f.type === "text" || f.type === "prose" ? "text" : f.type === "list" ? "list" : "json";
        if (!out.has(rec.table)) out.set(rec.table, new Map());
        out.get(rec.table).set(f.col, kind);
      }
    }
  }
  return out;
}

const parseMaybe = (v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

/** The translatable leaves of one base row: path -> base text. */
export function baseLeaves(row, cols) {
  const out = new Map();
  for (const [col, kind] of cols) {
    const raw = row[col];
    if (raw === null || raw === undefined) continue;
    if (kind === "text") {
      if (typeof raw === "string" && raw.trim() !== "") out.set(col, raw);
    } else {
      const value = parseMaybe(raw);
      if (kind === "list") {
        if (Array.isArray(value)) value.forEach((v, i) => typeof v === "string" && v.trim() !== "" && out.set(formatPath([col, i]), v));
      } else for (const [p, t] of wordLeaves(value, [col])) out.set(p, t);
    }
  }
  return out;
}

/** @param {import("node:sqlite").DatabaseSync} db */
export function validateI18n(db) {
  const findings = [];
  const checked = {};
  const has = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='content_translations'").get();
  if (!has) return { checked, findings };
  const tables = translatableColumns();
  const pkCache = new Map();
  const pkOf = (table) => {
    if (!pkCache.has(table)) {
      pkCache.set(table, db.prepare(`PRAGMA table_info("${table}")`).all().filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name));
    }
    return pkCache.get(table);
  };

  for (const row of db.prepare("SELECT * FROM content_translations ORDER BY locale, entity, entity_id").all()) {
    checked.content_translations = (checked.content_translations ?? 0) + 1;
    const id = `${row.locale}/${row.entity}/${row.entity_id}`;
    const add = (field, rule, message) => findings.push({ table: "content_translations", id, field, rule, severity: "error", message });

    if (!LOCALE_RE.test(row.locale) || row.locale === BASE_LOCALE) {
      add("locale", "i18n-locale", row.locale === BASE_LOCALE ? `"${BASE_LOCALE}" is the language the content is written in; it needs no translation file` : `"${row.locale}" is not a language code (es, pt-BR, zh-Hant)`);
      continue;
    }
    const cols = tables.get(row.entity);
    if (!cols) {
      add("entity", "i18n-entity", `${row.entity} has no translatable text (known: ${[...tables.keys()].sort().join(", ")})`);
      continue;
    }
    const pk = pkOf(row.entity);
    const parts = pk.length === 1 ? [row.entity_id] : row.entity_id.split("/");
    const base = parts.length === pk.length ? db.prepare(`SELECT * FROM "${row.entity}" WHERE ${pk.map((c) => `"${c}" = ?`).join(" AND ")}`).get(...parts) : undefined;
    if (!base) {
      add("entity_id", "i18n-record", `there is no ${row.entity} record "${row.entity_id}" to translate`);
      continue;
    }
    const leaves = baseLeaves(base, cols);
    let fields;
    try {
      fields = JSON.parse(row.fields);
    } catch {
      add("fields", "i18n-fields", "the fields are not JSON");
      continue;
    }
    for (const [path, text] of Object.entries(fields)) {
      const segs = parsePath(path);
      if (!segs) {
        add(path, "i18n-path", `"${path}" is not a field path`);
      } else if (typeof text !== "string" || text.trim() === "") {
        add(path, "i18n-text", "a translation is a non-empty text");
      } else if (!cols.has(segs[0])) {
        add(path, "i18n-field", `${row.entity}.${segs[0]} is not text for the learner (translatable: ${[...cols.keys()].join(", ")})`);
      } else if (!leaves.has(path)) {
        const raw = base[segs[0]];
        const exists = segs.length === 1 ? raw !== null && raw !== undefined : typeof getAt(parseMaybe(raw), segs.slice(1)) === "string";
        add(path, "i18n-path", exists ? `${path} is structure (an id, a picture, an answer), not words, so it is not translated` : `${path} does not exist in the base ${row.entity} record "${row.entity_id}"`);
      } else if (!samePlaceholders(leaves.get(path), text)) {
        add(path, "i18n-placeholders", `the translation must keep the base text's placeholders exactly: ${JSON.stringify(leaves.get(path).match(/\{[A-Za-z][A-Za-z0-9_]*\}|\[\[pic:[A-Za-z0-9._-]+\]\]/g) ?? [])}`);
      }
    }
  }
  return { checked, findings };
}
