/**
 * Safety Guide adapter v1: `safety_cards` and `safety_card_references`, one file per section
 * (phone/safety/NNN-<section>.atomiq: basics, happens, myths). The order of the cards is their position in the section.
 *
 *   section: basics
 *
 *   card safety-time-distance-shielding
 *   title: Time, distance, shielding
 *   icon: Timer1
 *   entry: shielding                     (the AtomDex entry; left out when there is none)
 *   references: ref-iaea-protection      (one line each)
 *   summary: Three ways to lower the dose.
 *   steps: Time: ...                     (one line each)
 */
import { defineAdapter } from "./engine.mjs";

const SECTION_ORDER = ["basics", "happens", "myths"];

export const safetyAdapter = defineAdapter({
  name: "safety",
  version: 1,
  dir: "phone/safety",
  owns: (rel) => rel.startsWith("phone/safety/") && rel.endsWith(".atomiq"),
  scope: [{ col: "section", key: "section", type: "id" }],
  records: [
    {
      keyword: "card",
      table: "safety_cards",
      id: ["id"],
      scope: ["section"],
      position: { col: "position", scope: ["section"], base: 0 },
      links: [{ key: "references", table: "safety_card_references", fk: "card_id", target: "reference_id" }],
      linksBefore: "summary",
      fields: [
        { col: "title", type: "text", translatable: true },
        { col: "icon", type: "text" },
        { col: "entry_id", key: "entry", type: "id", nullable: true },
        { col: "summary", type: "text", translatable: true },
        { col: "steps", type: "list", translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const rows = rowsByTable.safety_cards ?? [];
    const rank = (s) => (SECTION_ORDER.includes(s) ? SECTION_ORDER.indexOf(s) : SECTION_ORDER.length);
    const sections = [...new Set(rows.map((r) => r.section))].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
    return sections.map((section, i) => ({
      path: `phone/safety/${String((i + 1) * 10).padStart(3, "0")}-${section}.atomiq`,
      scope: { section },
      items: rows.filter((r) => r.section === section).sort((a, b) => a.position - b.position).map((row) => ({ keyword: "card", row })),
    }));
  },
});
