#!/usr/bin/env node
// Draws the app's own characters (teachers and the starter avatars) to standalone SVGs in public/art/,
// straight from the app's drawing code, so slides show the real art.
// Usage: node tools/publisher/export-art.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "public", "art");
const load = async (p) => import(pathToFileURL(path.join(REPO, p)).href);

const { NPC_VIEWBOX, buildNpc, partToSvg, treeParts } = await load("components/npc/npc-art.ts");
const { NPC_ROSTER } = await load("components/npc/npc-roster.ts");
const { DEFAULT_AVATAR, BUN_AVATAR, avatarSpec } = await load("components/avatar/avatar-core.ts");

fs.mkdirSync(out, { recursive: true });

function write(name, spec, form, pose = "idle") {
  const vb = NPC_VIEWBOX[form];
  const body = treeParts(buildNpc(spec, pose, form)).map(partToSvg).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vb.w}" height="${vb.h}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${body}</svg>`;
  fs.writeFileSync(path.join(out, name), svg);
  console.log("wrote", name);
}

for (const n of NPC_ROSTER) {
  write(`${n.id}-hero-cheer.svg`, n.spec, "hero", "cheer");
  write(`${n.id}-hero-proud.svg`, n.spec, "hero", "proud");
  write(`${n.id}-bust.svg`, n.spec, "bust");
  write(`${n.id}-head.svg`, n.spec, "avatar");
}
// Lesson object pictures (100 x 100), as on the lesson cards.
const { OBJECT_ART } = await load("components/lesson/visual/object-art.ts");
const f = (n) => Math.round(n * 100) / 100;
const shape = (s) => {
  const op = s.opacity === undefined ? "" : ` fill-opacity="${s.opacity}"`;
  if (s.t === "rect") return `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}" rx="${f(s.r)}" fill="${s.fill}"${op}/>`;
  if (s.t === "circle") return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}" fill="${s.fill}"${op}/>`;
  if (s.t === "path") return `<path d="${s.d}" fill="${s.fill}"${op}/>`;
  return `<path d="${s.d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
for (const id of ["air", "water", "hand", "sun", "flame", "banana"]) {
  fs.writeFileSync(path.join(out, `obj-${id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${OBJECT_ART[id].map(shape).join("")}</svg>`);
  console.log("wrote", `obj-${id}.svg`);
}
// The phone's app icons (tile face, lip and picture), as on the phone's home screen. 100 x 105.
const { APP_ICON_ART, APP_ICON_TILE, ICON_TILES } = await load("components/phone/app-icon-art.ts");
const { PHONE_APPS } = await load("services/phone-core.ts");
const TILES = {
  yellow: ["#FFC800", "#E6A800"], blue: ["#1CB0F6", "#1899D6"], green: ["#46A302", "#378300"], purple: ["#9069CD", "#6F4EA1"],
  red: ["#FF4B4B", "#D93B3B"], orange: ["#FF9600", "#DA7C00"], cyan: ["#00CDE7", "#00A4BA"], coral: ["#FF8A80", "#CC6E66"], grey: ["#767676", "#5E5E5E"],
};
const tint = (v, face, lip) => (v === "$face" ? face : v === "$lip" ? lip : v);
const appShape = (sh, face, lip) => {
  const op = sh.opacity === undefined ? "" : ` fill-opacity="${sh.opacity}"`;
  if (sh.t === "rect") return `<rect x="${f(sh.x)}" y="${f(sh.y)}" width="${f(sh.w)}" height="${f(sh.h)}" rx="${f(sh.r)}" fill="${tint(sh.fill, face, lip)}"${op}/>`;
  if (sh.t === "circle") return `<circle cx="${f(sh.cx)}" cy="${f(sh.cy)}" r="${f(sh.r)}" fill="${tint(sh.fill, face, lip)}"${op}/>`;
  if (sh.t === "path") return `<path d="${sh.d}" fill="${tint(sh.fill, face, lip)}"${op}/>`;
  return `<path d="${sh.d}" fill="none" stroke="${tint(sh.stroke, face, lip)}" stroke-width="${sh.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
for (const a of PHONE_APPS.filter((x) => APP_ICON_ART[x.id])) {
  const own = APP_ICON_TILE[a.id];
  const [face, lip] = own ? [ICON_TILES[own].face, ICON_TILES[own].lip] : TILES[a.color];
  fs.writeFileSync(
    path.join(out, `app-${a.id}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="105" viewBox="0 0 100 105"><clipPath id="t"><rect width="100" height="100" rx="27"/></clipPath><rect y="5" width="100" height="100" rx="27" fill="${lip}"/><rect width="100" height="100" rx="27" fill="${face}"/><g clip-path="url(#t)">${APP_ICON_ART[a.id].map((sh) => appShape(sh, face, lip)).join("")}</g></svg>`,
  );
  console.log("wrote", `app-${a.id}.svg`);
}
// The Shop: a preview (avatar on its paint and pattern) and hair tiles (the avatar's head with each style).
const { avatarBackground } = await load("components/avatar/avatar-core.ts");
const { PATTERN_GLYPHS, TILE, patternDef, tilePlacements } = await load("components/avatar/pattern-art.ts");
function glyphSvg(id) {
  return PATTERN_GLYPHS[id]
    .map((g) => {
      if (g.t === "p") return `<path d="${g.d}" fill="#fff"/>`;
      if (g.t === "c") return `<circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="#fff"/>`;
      if (g.t === "r") return `<circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="#fff" stroke-width="${g.w}"/>`;
      return `<path d="${g.d}" fill="none" stroke="#fff" stroke-width="${g.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
}
function avatarCard(name, config, pattern = "none", wide = 0) {
  const a = NPC_VIEWBOX.avatar;
  // `wide` adds that much room each side (the paint and pattern continue; the avatar stays centred)
  const vb = { x: a.x - wide, y: a.y, w: a.w + 2 * wide, h: a.h };
  const def = pattern === "none" ? null : patternDef(pattern);
  const pat = def
    ? `<defs><pattern id="p" patternUnits="userSpaceOnUse" x="0" y="0" width="${TILE}" height="${TILE}">${tilePlacements(def)
        .map((t) => `<g transform="translate(${t.x} ${t.y}) rotate(${t.rotate}) scale(${t.size / 24}) translate(-12 -12)">${glyphSvg(t.glyph)}</g>`)
        .join("")}</pattern></defs><rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="url(#p)" opacity="0.5"/>`
    : "";
  const body = treeParts(buildNpc(avatarSpec(config), "idle", "avatar")).map(partToSvg).join("");
  fs.writeFileSync(
    path.join(out, name),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${vb.w}" height="${vb.h}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}"><rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${avatarBackground(config)}"/>${pat}${body}</svg>`,
  );
  console.log("wrote", name);
}
avatarCard("shop-preview.svg", { ...BUN_AVATAR, hairStyle: "bigbun", background: "azure" }, "atomlab", 62);
for (const hair of ["crop", "spiky", "bigbun", "longwavy", "twintails", "highpony"]) {
  const spec = avatarSpec({ ...DEFAULT_AVATAR, hairStyle: hair });
  write(`hair-${hair}.svg`, spec, "avatar");
}
write("avatar-default.svg", avatarSpec(DEFAULT_AVATAR), "avatar");
write("avatar-bun.svg", avatarSpec(BUN_AVATAR), "avatar");
