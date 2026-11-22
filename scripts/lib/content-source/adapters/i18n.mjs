/**
 * Translations adapter v1: `content_translations`, one file per language (i18n/<locale>.atomiq). A translation is the id of a
 * record and the words of some of its fields, nothing else (docs/features/CONTENT_SOURCE_I18N_SPEC.md):
 *
 *   locale: es
 *
 *   entry chat_nodes chat-hal-greeting
 *   title: Charla
 *   replies[0].label: hola
 *   text:
 *       Buenos días.
 *
 *       ¿Qué quieres aprender hoy?
 *
 * The keys are field paths (`title`, `options[1]`, `data.options[0].label`), so the field list is open: every key of an entry is
 * one translated text. Whether a path exists in the base record and is words (not structure) is a validation rule
 * (`i18n-rules.mjs`), because it needs the base rows; this adapter only keeps the form lossless.
 */
import { defineAdapter } from "./engine.mjs";
import { encodeValue } from "../core/values.mjs";
import { parsePath } from "../../../../content/i18n/i18n-core.ts";

const PATH_KEY = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+|\[\d+\])*$/;

/** Order of paths in a file: by column, then by key, with list positions as numbers (`options[2]` before `options[10]`). */
export function comparePaths(a, b) {
  const x = parsePath(a);
  const y = parsePath(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    if (typeof x[i] === "number" && typeof y[i] === "number") return x[i] - y[i];
    return String(x[i]) < String(y[i]) ? -1 : 1;
  }
  return x.length - y.length;
}

const texts = {
  col: "fields",
  type: "custom",
  open: true,
  keys: [],
  encode(value) {
    const out = [];
    for (const path of Object.keys(value).sort(comparePaths)) {
      if (!PATH_KEY.test(path) || !parsePath(path)) throw new Error(`"${path}" is not a field path (a column, then .key and [index])`);
      const text = value[path];
      if (typeof text !== "string" || text === "") throw new Error(`the translation of ${path} must be a non-empty text`);
      out.push(...encodeValue({ col: path, type: "text" }, text));
    }
    return out;
  },
  decode(entries) {
    const out = {};
    for (const e of entries) {
      const path = e.key;
      if (!PATH_KEY.test(path) || !parsePath(path)) throw Object.assign(new Error(`"${path}" is not a field path (a column, then .key and [index])`), { entry: e });
      if (path in out) throw Object.assign(new Error(`"${path}" is translated twice`), { entry: e });
      const text = e.lines ? e.lines.join("\n") : e.value;
      if (text === "") throw Object.assign(new Error(`the translation of ${path} is empty (leave the line out to use the base text)`), { entry: e });
      out[path] = text;
    }
    return out;
  },
};

export const i18nAdapter = defineAdapter({
  name: "i18n",
  version: 1,
  dir: "i18n",
  owns: (rel) => /^i18n\/[^/]+\.atomiq$/.test(rel),
  scope: [{ col: "locale", type: "id" }],
  records: [
    {
      keyword: "entry",
      table: "content_translations",
      id: ["entity", "entity_id"],
      scope: ["locale"],
      fields: [texts],
    },
  ],
  layout(rowsByTable) {
    const rows = rowsByTable.content_translations ?? [];
    const locales = [...new Set(rows.map((r) => r.locale))].sort();
    return locales.map((locale) => ({
      path: `i18n/${locale}.atomiq`,
      scope: { locale },
      items: rows
        .filter((r) => r.locale === locale)
        .sort((a, b) => (a.entity === b.entity ? (a.entity_id < b.entity_id ? -1 : 1) : a.entity < b.entity ? -1 : 1))
        .map((row) => ({ keyword: "entry", row })),
    }));
  },
});
