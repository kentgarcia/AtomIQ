/**
 * Unit statements adapter v1: `unit_statements` (the myth-or-fact statements a unit opens its review with), one file per
 * unit (units/<unit>/statements.atomiq). The order of the records is their position within the unit.
 *
 *   unit: inside-the-atom
 *
 *   statement inside-the-atom-s01
 *   verdict: fact
 *   statement: Everything you can touch ... is made of atoms.
 *   explanation:
 *       Solids, liquids and gases are all made of atoms.
 */
import { defineAdapter } from "./engine.mjs";

export const statementsAdapter = defineAdapter({
  name: "statements",
  version: 1,
  dir: "units",
  owns: (rel) => /^units\/[^/]+\/statements\.atomiq$/.test(rel),
  scope: [{ col: "unit_id", key: "unit", type: "id" }],
  records: [
    {
      keyword: "statement",
      table: "unit_statements",
      id: ["id"],
      scope: ["unit_id"],
      position: { col: "position", scope: ["unit_id"], base: 0 },
      fields: [
        { col: "verdict", type: "id" },
        { col: "statement", type: "text", translatable: true },
        { col: "explanation", type: "prose", translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const rows = rowsByTable.unit_statements ?? [];
    const units = [...new Set(rows.map((r) => r.unit_id))].sort();
    return units.map((unit) => ({
      path: `units/${unit}/statements.atomiq`,
      scope: { unit_id: unit },
      items: rows.filter((r) => r.unit_id === unit).sort((a, b) => a.position - b.position).map((row) => ({ keyword: "statement", row })),
    }));
  },
});
