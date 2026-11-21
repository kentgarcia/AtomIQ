/**
 * Encyclopedia adapter v1 (AtomDex): `encyclopedia_entries`, one file per entry, in a folder per category
 * (reference/encyclopedia/<category>/<id>.atomiq). Entries have no position: the app sorts them.
 *
 *   category: people
 *
 *   entry henri-becquerel
 *   term: Henri Becquerel
 *   difficulty: beginner                 (left out when beginner)
 *   image: /assets/images/people/becquerel.webp
 *   related_terms: becquerel             (one line each)
 *   related_myths: some-myth-id
 *   quick_facts: Discovered radioactivity in 1896   (one line each)
 *   sources:                             (a block, one JSON object a line)
 *       {"organization":"Nobel Prize","title":"...","url":"https://..."}
 *   definition:
 *       French physicist ...
 *   debunking_snippet:                   (left out when there is none)
 *       ...
 */
import { defineAdapter } from "./engine.mjs";

export const encyclopediaAdapter = defineAdapter({
  name: "encyclopedia",
  version: 1,
  dir: "reference/encyclopedia",
  owns: (rel) => /^reference\/encyclopedia\/[^/]+\/[^/]+\.atomiq$/.test(rel),
  scope: [{ col: "category", key: "category", type: "id" }],
  records: [
    {
      keyword: "entry",
      table: "encyclopedia_entries",
      id: ["id"],
      scope: ["category"],
      fields: [
        { col: "term", type: "text", translatable: true },
        { col: "difficulty", type: "text", default: "beginner", omitDefault: true },
        { col: "image", type: "text", nullable: true },
        { col: "related_terms", type: "list" },
        { col: "related_myths", type: "list" },
        { col: "quick_facts", type: "list", translatable: true },
        { col: "sources", type: "jsonl" },
        { col: "definition", type: "prose", translatable: true },
        { col: "debunking_snippet", type: "prose", nullable: true, translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    return (rowsByTable.encyclopedia_entries ?? [])
      .slice()
      .sort((a, b) => (a.category < b.category ? -1 : a.category > b.category ? 1 : a.id < b.id ? -1 : 1))
      .map((row) => ({
        path: `reference/encyclopedia/${row.category}/${row.id}.atomiq`,
        scope: { category: row.category },
        items: [{ keyword: "entry", row }],
      }));
  },
});
