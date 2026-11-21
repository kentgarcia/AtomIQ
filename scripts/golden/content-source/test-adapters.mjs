/**
 * Adapters used by the format tests and the golden files. They exist only to exercise every construct of the core
 * (every value type, a file scope, a body, blocks, a composite id, links, derived positions, a custom field), so the
 * canonical form of the CORE is pinned without depending on any real table. Real adapters pin their own goldens.
 */
import { defineAdapter } from "../../lib/content-source/adapters/engine.mjs";

/** A custom field: `choice: label -> next` lines, like the chat replies in miniature. */
const choices = {
  col: "choices",
  type: "custom",
  keys: ["choice"],
  default: [],
  omitDefault: true,
  encode: (list) =>
    list.map((c) => ({ key: "choice", value: c.next ? `${c.label} -> ${c.next}` : c.label, lines: null, line: null, comments: [] })),
  decode: (entries) =>
    entries.map((e) => {
      const m = /^(.*?)(?: -> (\S+))?$/.exec(e.value);
      return m[2] ? { label: m[1], next: m[2] } : { label: m[1] };
    }),
};

export const sampleAdapter = defineAdapter({
  name: "sample",
  version: 1,
  owns: (rel) => rel.startsWith("sample/"),
  scope: [{ col: "owner", key: "owner", type: "id", nullable: true }],
  records: [
    {
      keyword: "item",
      table: "sample_items",
      id: ["id"],
      scope: ["owner"],
      position: { col: "position", scope: ["owner"], base: 0 },
      links: [{ key: "references", table: "sample_refs", fk: "item_id", target: "ref_id" }],
      fields: [
        { col: "kind", type: "text" },
        { col: "count", type: "int" },
        { col: "ratio", type: "num", nullable: true },
        { col: "meta", type: "json", nullable: true },
        { col: "tags", type: "list", default: [], omitDefault: true },
        choices,
        { col: "text", type: "prose", body: true },
      ],
    },
    {
      keyword: "card",
      table: "sample_cards",
      id: ["lesson", "id"],
      fields: [
        { col: "title", type: "text", nullable: true },
        { col: "summary", type: "prose" },
        { col: "data", type: "json" },
        { col: "log", type: "jsonl", nullable: true },
        { col: "level", type: "int", default: 1, omitDefault: true },
      ],
    },
  ],
  layout(rows) {
    const items = rows.sample_items ?? [];
    const owners = [...new Set(items.map((r) => r.owner))].sort();
    const files = owners.map((o) => ({
      path: `sample/${o}.atomiq`,
      scope: { owner: o },
      items: items.filter((r) => r.owner === o).map((row) => ({ keyword: "item", row })),
    }));
    const cards = rows.sample_cards ?? [];
    if (cards.length) files.push({ path: "sample/cards.atomiq", scope: {}, items: cards.map((row) => ({ keyword: "card", row })) });
    return files;
  },
});

export const TEST_ADAPTERS = { sample: sampleAdapter };
