/**
 * Nuclear Map adapter v1: `map_sites` and `map_site_references`, one file (phone/map/sites.atomiq). The order of the
 * sites is their position.
 *
 *   site site-paris-curie
 *   name: Paris, the Curies' shed
 *   place: Paris, France
 *   kind: discovery
 *   year: 1898
 *   lat: 48.84
 *   lon: 2.35
 *   entry: marie-curie                   (the AtomDex entry; left out when there is none)
 *   references: ref-nobel-curie          (one line each)
 *   blurb: Where Marie and Pierre ...
 *   fact: In July 1898 ...
 */
import { defineAdapter } from "./engine.mjs";

export const mapAdapter = defineAdapter({
  name: "map",
  version: 1,
  dir: "phone/map",
  owns: (rel) => rel.startsWith("phone/map/") && rel.endsWith(".atomiq"),
  scope: [],
  records: [
    {
      keyword: "site",
      table: "map_sites",
      id: ["id"],
      position: { col: "position", scope: [], base: 0 },
      links: [{ key: "references", table: "map_site_references", fk: "site_id", target: "reference_id" }],
      linksBefore: "blurb",
      fields: [
        { col: "name", type: "text", translatable: true },
        { col: "place", type: "text", translatable: true },
        { col: "kind", type: "id" },
        { col: "year", type: "text" },
        { col: "lat", type: "num" },
        { col: "lon", type: "num" },
        { col: "entry_id", key: "entry", type: "id", nullable: true },
        { col: "blurb", type: "text", translatable: true },
        { col: "fact", type: "text", translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    return [
      {
        path: "phone/map/sites.atomiq",
        scope: {},
        items: (rowsByTable.map_sites ?? []).slice().sort((a, b) => a.position - b.position).map((row) => ({ keyword: "site", row })),
      },
    ];
  },
});
