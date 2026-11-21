/**
 * Atom Scanner adapter v1: `scan_targets` and `scan_target_references`, one file per scene
 * (phone/scanner/NNN-<scene>.atomiq). Position is the order within a scene (the app sorts by scene, then position); scenes are files in alphabetical order.
 *
 *   scene: kitchen
 *
 *   target scan-water
 *   name: A glass of water
 *   object: water                        (the picture in scan-vignettes.ts)
 *   atomdex: some-entry-id               (left out when there is none)
 *   references: ref-iaea-water           (one line each; ids of reference/sources)
 *   blurb: Every drop is ...
 *   fun_fact: Water is always ...
 *   composition:                         (a block, one JSON object a line: element and note, never an amount)
 *       {"symbol":"H","note":"two atoms in each molecule"}
 */
import { defineAdapter } from "./engine.mjs";

export const scannerAdapter = defineAdapter({
  name: "scanner",
  version: 1,
  dir: "phone/scanner",
  owns: (rel) => rel.startsWith("phone/scanner/") && rel.endsWith(".atomiq"),
  scope: [{ col: "scene", key: "scene", type: "id" }],
  records: [
    {
      keyword: "target",
      table: "scan_targets",
      id: ["id"],
      scope: ["scene"],
      position: { col: "position", scope: ["scene"], base: 0 },
      links: [{ key: "references", table: "scan_target_references", fk: "target_id", target: "reference_id" }],
      linksBefore: "blurb",
      fields: [
        { col: "name", type: "text", translatable: true },
        { col: "object", type: "id" },
        { col: "atomdex_entry_id", key: "atomdex", type: "id", nullable: true },
        { col: "blurb", type: "text", translatable: true },
        { col: "fun_fact", type: "text", translatable: true },
        { col: "composition", type: "jsonl" },
      ],
    },
  ],
  layout(rowsByTable) {
    const rows = (rowsByTable.scan_targets ?? []).slice().sort((a, b) => a.position - b.position);
    const scenes = [...new Set(rows.map((r) => r.scene))].sort();
    return scenes.map((scene, i) => ({
      path: `phone/scanner/${String((i + 1) * 10).padStart(3, "0")}-${scene}.atomiq`,
      scope: { scene },
      items: rows.filter((r) => r.scene === scene).map((row) => ({ keyword: "target", row })),
    }));
  },
});
