/**
 * References adapter v1: `content_references`, one file per kind under reference/sources/ (reference/sources/<kind>.atomiq).
 * A source is cited from lessons, blog pieces, scan targets, safety cards and map sites by its id, so an id is never renamed.
 *
 *   kind: official
 *
 *   source ref-iaea-radiation
 *   publisher: IAEA
 *   title: Radiation in everyday life
 *   authors: ...                         (left out when empty)
 *   year: 2020                           (left out when empty)
 *   url: https://...
 *   accessed: 2026-01-12                 (left out when empty)
 *   verified: 1                          (left out when 0; the owner does not maintain it)
 *   note: ...                            (left out when empty)
 */
import { defineAdapter } from "./engine.mjs";

const KIND_ORDER = ["official", "textbook", "research"];

export const referencesAdapter = defineAdapter({
  name: "references",
  version: 1,
  dir: "reference/sources",
  owns: (rel) => rel.startsWith("reference/sources/") && rel.endsWith(".atomiq"),
  scope: [{ col: "kind", key: "kind", type: "id" }],
  records: [
    {
      keyword: "source",
      table: "content_references",
      id: ["id"],
      scope: ["kind"],
      fields: [
        { col: "publisher", type: "text" },
        { col: "title", type: "text" },
        { col: "authors", type: "text", default: "", omitDefault: true },
        { col: "year", type: "text", default: "", omitDefault: true },
        { col: "url", type: "text", default: "", omitDefault: true },
        { col: "accessed", type: "text", default: "", omitDefault: true },
        { col: "verified", type: "int", default: 0, omitDefault: true },
        { col: "note", type: "text", default: "", omitDefault: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const rows = rowsByTable.content_references ?? [];
    const rank = (k) => (KIND_ORDER.includes(k) ? KIND_ORDER.indexOf(k) : KIND_ORDER.length);
    const kinds = [...new Set(rows.map((r) => r.kind))].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
    return kinds.map((kind) => ({
      path: `reference/sources/${kind}.atomiq`,
      scope: { kind },
      items: rows.filter((r) => r.kind === kind).sort((a, b) => (a.id < b.id ? -1 : 1)).map((row) => ({ keyword: "source", row })),
    }));
  },
});
