/**
 * Myths adapter v1: `myths`, one file per category under reference/myths/ (reference/myths/<category>.atomiq).
 * Myths have no position: the app sorts them.
 *
 *   category: safety
 *
 *   myth all-radiation-manmade
 *   title: All Radiation is Man-Made
 *   difficulty: easy                     (left out when easy)
 *   popularity: 10                       (left out when 0)
 *   image: https://...
 *   tags: radiation                      (one line each)
 *   related_facts: background-radiation-sources
 *   related_lessons: some-lesson-id
 *   sources:                             (a block, one JSON object a line)
 *       {"title":"...","url":"https://...","author":"IAEA","type":"official"}
 *   statement:
 *       The false claim.
 *   reality:
 *       The true statement.
 *   explanation:
 *       The long debunk (Markdown, blank lines allowed).
 */
import { defineAdapter } from "./engine.mjs";

export const mythsAdapter = defineAdapter({
  name: "myths",
  version: 1,
  dir: "reference/myths",
  owns: (rel) => rel.startsWith("reference/myths/") && rel.endsWith(".atomiq"),
  scope: [{ col: "category", key: "category", type: "id" }],
  records: [
    {
      keyword: "myth",
      table: "myths",
      id: ["id"],
      scope: ["category"],
      fields: [
        { col: "title", type: "text", translatable: true },
        { col: "difficulty", type: "text", default: "easy", omitDefault: true },
        { col: "popularity", type: "int", default: 0, omitDefault: true },
        { col: "image", type: "text", nullable: true },
        { col: "tags", type: "list" },
        { col: "related_facts", type: "list" },
        { col: "related_lessons", type: "list" },
        { col: "sources", type: "jsonl" },
        { col: "myth_statement", key: "statement", type: "prose", translatable: true },
        { col: "reality", type: "prose", translatable: true },
        { col: "explanation", type: "prose", translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const rows = rowsByTable.myths ?? [];
    const cats = [...new Set(rows.map((r) => r.category))].sort();
    return cats.map((category) => ({
      path: `reference/myths/${category}.atomiq`,
      scope: { category },
      items: rows.filter((r) => r.category === category).sort((a, b) => (a.id < b.id ? -1 : 1)).map((row) => ({ keyword: "myth", row })),
    }));
  },
});
