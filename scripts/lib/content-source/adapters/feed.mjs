/**
 * Feed adapter v1: `feed_templates`, one file per poster under feed/ (feed/<npc-id>.atomiq, and feed/shared.atomiq for
 * posts with no teacher), grouped by kind.
 *
 *   npc: npc-ada
 *
 *   post ft-ada-lesson-half-life-1
 *   kind: celebrate
 *   trigger: lesson_complete
 *   chip: lesson
 *   weight: 2                                  (1 when left out)
 *   condition: {"unitId":"radioactivity"}      (nothing when left out)
 *   pool: learner                              (a poster pool entry, one line each)
 *   reactors: npc-hal                          (one line each)
 *   text:
 *       You finished "{lesson}". ...
 */
import { defineAdapter } from "./engine.mjs";

const KIND_ORDER = ["celebrate", "milestone", "nudge", "tease"];

export const feedAdapter = defineAdapter({
  name: "feed",
  version: 1,
  dir: "feed",
  owns: (rel) => rel.startsWith("feed/") && rel.endsWith(".atomiq"),
  scope: [{ col: "npc_id", key: "npc", type: "id", nullable: true }],
  records: [
    {
      keyword: "post",
      table: "feed_templates",
      id: ["id"],
      scope: ["npc_id"],
      scopeOptional: ["npc_id"],
      fields: [
        { col: "kind", type: "text" },
        { col: "trigger", type: "text" },
        { col: "chip", type: "text", nullable: true },
        { col: "weight", type: "int", default: 1, omitDefault: true },
        { col: "condition", type: "json", default: {}, omitDefault: true },
        { col: "poster_pool", key: "pool", type: "list" },
        { col: "reactors", type: "list" },
        { col: "text", type: "prose", translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const rows = rowsByTable.feed_templates ?? [];
    const rank = (k) => (KIND_ORDER.includes(k) ? KIND_ORDER.indexOf(k) : KIND_ORDER.length);
    const posters = [...new Set(rows.map((r) => r.npc_id))].sort((a, b) => (a ?? "~") < (b ?? "~") ? -1 : 1);
    return posters.map((npc) => ({
      path: `feed/${npc ?? "shared"}.atomiq`,
      scope: { npc_id: npc },
      items: rows
        .filter((r) => r.npc_id === npc)
        .sort((a, b) => rank(a.kind) - rank(b.kind) || (a.id < b.id ? -1 : 1))
        .map((row) => ({ keyword: "post", row })),
    }));
  },
});
