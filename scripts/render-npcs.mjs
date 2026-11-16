#!/usr/bin/env node
/**
 * Offline contact sheets of the NPC teachers, so art changes can be looked at.
 * Usage: node scripts/render-npcs.mjs <out-dir> [dark]
 * Writes into <out-dir>: npc-sheet.svg (every teacher, every pose), npc-sizes.svg (the four ship sizes),
 * npc-silhouettes.svg (one flat colour) and npc-muted.svg (the locked version). Open in a browser or convert.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = await import(pathToFileURL(path.join(REPO, "components/npc/npc-art.ts")).href);
const { NPC_ROSTER } = await import(pathToFileURL(path.join(REPO, "components/npc/npc-roster.ts")).href);
const out = path.resolve(process.argv[2] ?? ".");
const dark = process.argv[3] === "dark";
fs.mkdirSync(out, { recursive: true });

const { NPC_POSES, NPC_VIEWBOX, buildNpc, mutedSpec, partToSvg, treeParts } = art;
const bg = dark ? "#131F24" : "#FFFFFF";
const ink = dark ? "#F1F7FB" : "#3C3C3C";
const cell = (tree, form, x, y, w, extra = (s) => s) => {
  const vb = NPC_VIEWBOX[form];
  const h = (w * vb.h) / vb.w;
  return { svg: `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${extra(treeParts(tree).map(partToSvg).join(""))}</svg>`, h };
};
const doc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;
const label = (x, y, t) => `<text x="${x}" y="${y}" font-family="sans-serif" font-size="13" fill="${ink}">${t}</text>`;

// 1. Every teacher x every pose (hero form).
{
  const W = 150;
  const rowH = (W * NPC_VIEWBOX.hero.h) / NPC_VIEWBOX.hero.w + 22;
  let body = "";
  NPC_ROSTER.forEach((n, r) => {
    body += label(6, r * rowH + 14, n.name);
    NPC_POSES.forEach((pose, c) => {
      body += cell(buildNpc(n.spec, pose), "hero", c * W + 40, r * rowH + 20, W - 6).svg;
    });
  });
  fs.writeFileSync(path.join(out, "npc-sheet.svg"), doc(NPC_POSES.length * W + 50, NPC_ROSTER.length * rowH + 10, body));
}
// 2. The four ship sizes: chip 48, banner 80, hero 150 (bust forms), at their real size.
{
  let body = "";
  NPC_ROSTER.forEach((n, r) => {
    const y = r * 175 + 10;
    let x = 8;
    for (const [form, h] of [["head", 48], ["head", 80], ["hero", 150]]) {
      const vb = NPC_VIEWBOX[form];
      const w = (h * vb.w) / vb.h;
      body += cell(buildNpc(n.spec, form === "hero" ? "greet" : "idle"), form, x, y, w).svg;
      x += w + 14;
    }
    body += label(x + 8, y + 20, n.name);
  });
  fs.writeFileSync(path.join(out, "npc-sizes.svg"), doc(420, NPC_ROSTER.length * 175 + 10, body));
}
// 3. Silhouettes and 4. muted.
for (const kind of ["silhouettes", "muted"]) {
  const W = 130;
  let body = "";
  NPC_ROSTER.forEach((n, c) => {
    const spec = kind === "muted" ? mutedSpec(n.spec) : n.spec;
    body += cell(buildNpc(spec, "explain"), "hero", c * W + 6, 6, W - 8, kind === "silhouettes" ? (s) => s.replace(/fill="#[0-9A-Fa-f]{6}"/g, `fill="${ink}"`).replace(/stroke="#[0-9A-Fa-f]{6}"/g, `stroke="${ink}"`) : (s) => s).svg;
  });
  fs.writeFileSync(path.join(out, `npc-${kind}.svg`), doc(NPC_ROSTER.length * W + 12, 150, body));
}
console.log(`wrote 4 sheets to ${out}`);
