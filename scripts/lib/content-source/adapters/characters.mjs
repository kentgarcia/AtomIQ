/**
 * Characters adapter v1: `npcs` and `npc_lines`, one file per teacher under characters/.
 *
 *   npc npc-ada
 *   name: Ada
 *   title: Radioactivity teacher
 *   field: radioactivity
 *   bio:
 *       hi, i'm ada. ...
 *   spec:
 *       { ...the drawing, as JSON... }
 *
 *   line line-ada-meet
 *   kind: meet
 *   pose: greet
 *   lesson: half-life            (only for a lesson_intro)
 *
 *       Hi, I'm Ada. ...         (the line's words, the body)
 *
 * `position` is not written: it is the teacher's place in the files (010-, 020- ...), base 1.
 */
import { defineAdapter } from "./engine.mjs";

const KIND_ORDER = ["meet", "sign_off", "tease", "lesson_intro"];

export const charactersAdapter = defineAdapter({
  name: "characters",
  version: 1,
  dir: "characters",
  owns: (rel) => rel.startsWith("characters/") && rel.endsWith(".atomiq"),
  records: [
    {
      keyword: "npc",
      table: "npcs",
      id: ["id"],
      position: { col: "position", scope: [], base: 1 },
      fields: [
        { col: "name", type: "text" },
        { col: "title", type: "text", translatable: true },
        { col: "field", type: "text" },
        { col: "bio", type: "prose", translatable: true },
        { col: "spec", type: "json" },
      ],
    },
    {
      keyword: "line",
      table: "npc_lines",
      id: ["id"],
      parent: { keyword: "npc", map: { npc_id: "id" } },
      fields: [
        { col: "kind", type: "text" },
        { col: "pose", type: "text", default: "explain" },
        { col: "lesson_id", key: "lesson", type: "id", nullable: true },
        { col: "journey_id", key: "journey", type: "id", nullable: true },
        { col: "text", type: "prose", body: true, translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const npcs = [...(rowsByTable.npcs ?? [])].sort((a, b) => a.position - b.position);
    const lines = rowsByTable.npc_lines ?? [];
    const rank = (k) => (KIND_ORDER.includes(k) ? KIND_ORDER.indexOf(k) : KIND_ORDER.length);
    return npcs.map((npc, i) => ({
      path: `characters/${String((i + 1) * 10).padStart(3, "0")}-${npc.id}.atomiq`,
      scope: {},
      items: [
        { keyword: "npc", row: npc },
        ...lines
          .filter((l) => l.npc_id === npc.id)
          .sort((a, b) => rank(a.kind) - rank(b.kind) || (a.id < b.id ? -1 : 1))
          .map((row) => ({ keyword: "line", row })),
      ],
    }));
  },
});
