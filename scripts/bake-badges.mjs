#!/usr/bin/env node
/**
 * AtomIQ Achievement Badges: generator & baker.
 *
 * Generates editable source SVGs in `tools/badge-art/<badgeDir>/<level>.svg` (1..12) and bakes
 * crisp 384x384 PNGs into `assets/images/badge/<badgeDir>/<level>.png`.
 *
 * Every achievement track has its own distinct badge silhouette (Hexagon, Heraldic Shield,
 * Flame Crest, Starburst, Pentagon, Rosette, 4-Leaf Clover, Faceted Octagon), its own character
 * from the AtomIQ cast (7 NPC teachers + Shrodi), and a bespoke asymmetric action pose + prop
 * pairing. Across levels 1 to 12, the 3D rim evolves through 12 metallic/gem/holographic tiers,
 * with progressive star flourishes stepping up at higher ranks.
 *
 * Usage:
 *   node scripts/bake-badges.mjs --preview <dir>   # render overview & tier-progression sheets only
 *   node scripts/bake-badges.mjs                   # write all 96 SVGs to tools/badge-art/ & bake 96 PNGs
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = await import(pathToFileURL(path.join(REPO, "components/npc/npc-art.ts")).href);
const { NPC_ROSTER } = await import(pathToFileURL(path.join(REPO, "components/npc/npc-roster.ts")).href);
const { OFFICIAL: O, CUSTOM } = await import(pathToFileURL(path.join(REPO, "components/npc/npc-palette.ts")).href);
const shrodiArt = await import(pathToFileURL(path.join(REPO, "components/mascot/shrodi-art.ts")).href);

const { buildNpc, partToSvg, rrect, circle, pill, fillOf, lineOf } = art;
const f = (n) => Math.round(n * 100) / 100;

// ── geometry helpers ─────────────────────────────────────────────────────────

function roundPoly(points, r) {
  const n = points.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const prev = points[(i + n - 1) % n];
    const next = points[(i + 1) % n];
    const lp = Math.hypot(prev[0] - p[0], prev[1] - p[1]);
    const ln = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const k = Math.min(r, lp / 2, ln / 2);
    const a = [p[0] + ((prev[0] - p[0]) / lp) * k, p[1] + ((prev[1] - p[1]) / lp) * k];
    const b = [p[0] + ((next[0] - p[0]) / ln) * k, p[1] + ((next[1] - p[1]) / ln) * k];
    d += `${i === 0 ? "M" : "L"}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`;
  }
  return `${d}Z`;
}

function regularPoly(cx, cy, radius, sides, startDeg = -90) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = ((startDeg + (i * 360) / sides) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return pts;
}

function sparkleStar(cx, cy, r, color) {
  const ir = r * 0.36;
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : ir;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return fillOf(roundPoly(pts, r * 0.16), color);
}

// ── 8 distinct custom frame shapes (440x440 canvas, center 220, 232) ─────────
// Every frame generator takes (dy, inset) -> SVG path string.

const CX = 220;
const CY = 232;

const FRAMES = {
  /** 1. Lessons Learned — Rounded Hexagon (science / molecular cell emblem) */
  hexagon(dy = 0, inset = 0) {
    const r = 168 - inset;
    return roundPoly(regularPoly(CX, CY + dy, r, 6, -90), Math.max(18, 34 - inset * 0.35));
  },

  /** 2. Myth Buster — Heraldic Heater Shield (fact-checker & radiation-shield crest) */
  shield(dy = 0, inset = 0) {
    const w = 152 - inset;
    const top = CY - 156 + inset + dy;
    const mid = CY + 24 + dy;
    const bot = CY + 168 - inset + dy;
    const r = Math.max(18, 32 - inset * 0.3);
    return roundPoly([
      [CX - w, top + 14],
      [CX, top - 16],
      [CX + w, top + 14],
      [CX + w - 4, mid],
      [CX, bot],
      [CX - w + 4, mid],
    ], r);
  },

  /** 3. On Fire — Pointed Flame / Teardrop Crest (broad glowing belly, swept peak) */
  flameCrest(dy = 0, inset = 0) {
    const w = 158 - inset;
    const top = CY - 178 + inset + dy;
    const bot = CY + 158 - inset + dy;
    const midY = CY + 42 + dy;
    return roundPoly([
      [CX, top],
      [CX + w * 0.66, CY - 62 + dy],
      [CX + w, midY],
      [CX + w * 0.56, bot - 14],
      [CX, bot],
      [CX - w * 0.56, bot - 14],
      [CX - w, midY],
      [CX - w * 0.66, CY - 62 + dy],
    ], Math.max(26, 48 - inset * 0.35));
  },

  /** 4. XP Master — Soft 8-Point Starburst Medallion (electric energy badge) */
  starburst(dy = 0, inset = 0) {
    const outerR = 172 - inset;
    const innerR = 138 - inset * 0.92;
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = ((-90 + i * 22.5) * Math.PI) / 180;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push([CX + Math.cos(a) * r, CY + dy + Math.sin(a) * r]);
    }
    return roundPoly(pts, Math.max(14, 24 - inset * 0.25));
  },

  /** 5. Quest Crusher — Upright Pentagon / Home-Plate Crest (bold quest banner) */
  pentagon(dy = 0, inset = 0) {
    const w = 154 - inset;
    const top = CY - 154 + inset + dy;
    const knee = CY + 48 + dy;
    const bot = CY + 168 - inset + dy;
    return roundPoly([
      [CX - w + 8, top],
      [CX + w - 8, top],
      [CX + w, knee],
      [CX, bot],
      [CX - w, knee],
    ], Math.max(22, 38 - inset * 0.35));
  },

  /** 6. Level Up — Scalloped 10-Lobe Ribbon Rosette (celebration seal) */
  rosette(dy = 0, inset = 0) {
    const outerR = 170 - inset;
    const innerR = 148 - inset * 0.95;
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const a = ((-90 + i * 18) * Math.PI) / 180;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push([CX + Math.cos(a) * r, CY + dy + Math.sin(a) * r]);
    }
    return roundPoly(pts, Math.max(16, 26 - inset * 0.2));
  },

  /** 7. Style Collector — Soft Arch / Boutique Mirror Frame (rounded dome top, gentle arch sides, tapered base) */
  mirrorArch(dy = 0, inset = 0) {
    const w = 148 - inset;
    const top = CY - 154 + inset + dy;
    const mid = CY + 48 + dy;
    const bot = CY + 162 - inset + dy;
    const r = Math.max(24, 46 - inset * 0.35);
    return roundPoly([
      [CX - w + 10, top + 20],
      [CX - w * 0.5, top - 16],
      [CX + w * 0.5, top - 16],
      [CX + w - 10, top + 20],
      [CX + w, mid],
      [CX + w * 0.65, bot - 8],
      [CX - w * 0.65, bot - 8],
      [CX - w, mid],
    ], r);
  },

  /** 8. Big Spender — Faceted Emerald-Cut Octagon (gemstone cut for diamonds) */
  octagon(dy = 0, inset = 0) {
    const r = 166 - inset;
    return roundPoly(regularPoly(CX, CY + dy, r, 8, -67.5), Math.max(16, 28 - inset * 0.3));
  },
};

// ── 12-level rim color progression ───────────────────────────────────────────

const TIERS = [
  {
    level: 1, name: "Bronze",
    rim: ["#F4B57E", "#D98648", "#B8662E"],
    lip: ["#C4793B", "#9E5622", "#7D4018"],
    well: "#FFFDF6", sparkle: "#F4B57E", stars: 0,
  },
  {
    level: 2, name: "Copper",
    rim: ["#FFAE82", "#E66D42", "#C94C2B"],
    lip: ["#D46B3D", "#B34622", "#8F3118"],
    well: "#FFFBF5", sparkle: "#FF9659", stars: 0,
  },
  {
    level: 3, name: "Silver",
    rim: ["#F2F6FA", "#C4D1DE", "#97A8BA"],
    lip: ["#B4C3D1", "#8596A8", "#657688"],
    well: "#F9FCFF", sparkle: "#97B8D9", stars: 1,
  },
  {
    level: 4, name: "Titanium",
    rim: ["#E3F1FC", "#95BCE0", "#6892BD"],
    lip: ["#94B4D4", "#5F86B0", "#45688F"],
    well: "#F7FBFF", sparkle: "#7DB9F0", stars: 1,
  },
  {
    level: 5, name: "Gold",
    rim: ["#FFF08A", "#FFC800", "#E59800"],
    lip: ["#E6B000", "#C47D00", "#9E5F00"],
    well: "#FFFDF2", sparkle: "#FFC800", stars: 1,
  },
  {
    level: 6, name: "Sunburst",
    rim: ["#FFE26A", "#FF9600", "#FF5B2E"],
    lip: ["#E69400", "#CC6300", "#BA3314"],
    well: "#FFFBF2", sparkle: "#FF9600", stars: 2,
  },
  {
    level: 7, name: "Emerald",
    rim: ["#B6FF7A", "#58CC02", "#289E1B"],
    lip: ["#6DD126", "#399C00", "#197010"],
    well: "#F9FFF5", sparkle: "#58CC02", stars: 2,
  },
  {
    level: 8, name: "Aqua",
    rim: ["#9AF7F5", "#1CD1D6", "#0D8FA8"],
    lip: ["#3CD1D4", "#0C9EA6", "#07677D"],
    well: "#F5FEFF", sparkle: "#1CD1D6", stars: 2,
  },
  {
    level: 9, name: "Sapphire",
    rim: ["#8CE0FF", "#1CB0F6", "#2B5FD9"],
    lip: ["#3FAEEB", "#147BC7", "#1A40A6"],
    well: "#F5FAFF", sparkle: "#1CB0F6", stars: 3,
  },
  {
    level: 10, name: "Amethyst",
    rim: ["#EBB8FF", "#B86BFF", "#7C3BD9"],
    lip: ["#C67CEB", "#893FD4", "#5922A8"],
    well: "#FCF7FF", sparkle: "#CE82FF", stars: 3,
  },
  {
    level: 11, name: "Ruby Rose",
    rim: ["#FFC2E2", "#FF5C9C", "#D6246E"],
    lip: ["#E674AD", "#CC2D6D", "#9E144E"],
    well: "#FFF7FB", sparkle: "#FF5C9C", stars: 3,
  },
  {
    level: 12, name: "Aurora",
    rim: ["#FFE047", "#38E89A", "#00B8D9", "#2457E6"],
    lip: ["#D9A814", "#1AB570", "#0089A8", "#1538A6"],
    well: "#F7FFFC", sparkle: "#00D4B8", stars: 4,
  },
];

// ── helpers for custom dynamic props & poses ─────────────────────────────────

function findNpc(id) {
  return NPC_ROSTER.find((n) => n.id === id).spec;
}

function renderParts(parts) {
  return parts.map(partToSvg).join("");
}

/** 1. Hal: Glowing orbital atom + open science book */
function glowingAtomProp(cx, cy, s = 1) {
  return [
    fillOf(circle(cx, cy, 40 * s), O.iguana),
    fillOf(circle(cx, cy, 29 * s), O.beluga),
    lineOf(`M${f(cx - 32 * s)} ${f(cy - 17 * s)}C${f(cx - 17 * s)} ${f(cy - 38 * s)} ${f(cx + 17 * s)} ${f(cy - 11 * s)} ${f(cx + 32 * s)} ${f(cy + 17 * s)}C${f(cx + 17 * s)} ${f(cy + 38 * s)} ${f(cx - 17 * s)} ${f(cy + 11 * s)} ${f(cx - 32 * s)} ${f(cy - 17 * s)}`, O.macaw, 4.5 * s),
    lineOf(`M${f(cx + 32 * s)} ${f(cy - 17 * s)}C${f(cx + 17 * s)} ${f(cy - 38 * s)} ${f(cx - 17 * s)} ${f(cy - 11 * s)} ${f(cx - 32 * s)} ${f(cy + 17 * s)}C${f(cx - 17 * s)} ${f(cy + 38 * s)} ${f(cx + 17 * s)} ${f(cy + 11 * s)} ${f(cx + 32 * s)} ${f(cy - 17 * s)}`, O.whale, 4.5 * s),
    fillOf(circle(cx - 5 * s, cy + 3 * s, 8.5 * s), O.cardinal),
    fillOf(circle(cx + 6 * s, cy + 2 * s, 8.5 * s), O.macaw),
    fillOf(circle(cx, cy - 6 * s, 9 * s), O.bee),
    fillOf(circle(cx - 29 * s, cy - 15 * s, 5 * s), O.bee),
    fillOf(circle(cx + 29 * s, cy - 14 * s, 5 * s), O.fox),
  ];
}

/** 2. Ray: Big golden magnifying glass with bold green Fact Check */
function magnifyingGlassProp(cx, cy, s = 1) {
  return [
    lineOf(`M${f(cx - 18 * s)} ${f(cy + 20 * s)}L${f(cx - 42 * s)} ${f(cy + 48 * s)}`, O.eel, 13 * s),
    lineOf(`M${f(cx - 18 * s)} ${f(cy + 20 * s)}L${f(cx - 36 * s)} ${f(cy + 41 * s)}`, O.fox, 9 * s),
    fillOf(circle(cx + 2 * s, cy + 3 * s, 35 * s), O.guineaPig),
    fillOf(circle(cx, cy, 35 * s), O.bee),
    fillOf(circle(cx, cy, 25 * s), O.iguana),
    lineOf(`M${f(cx - 11 * s)} ${f(cy + 1 * s)}L${f(cx - 3 * s)} ${f(cy + 10 * s)}L${f(cx + 13 * s)} ${f(cy - 9 * s)}`, O.featherGreen, 7.5 * s),
    lineOf(`M${f(cx - 16 * s)} ${f(cy - 10 * s)}Q${f(cx - 12 * s)} ${f(cy - 18 * s)} ${f(cx - 4 * s)} ${f(cy - 19 * s)}`, O.snow, 4.5 * s),
  ];
}

/** 3. Kofi: Blazing comic reactor torch held high + flame wisps */
function flameTorchProp(cx, cy, s = 1) {
  return [
    fillOf(roundPoly([
      [cx, cy - 82 * s],
      [cx + 30 * s, cy - 42 * s],
      [cx + 20 * s, cy - 30 * s],
      [cx + 38 * s, cy - 12 * s],
      [cx + 24 * s, cy + 16 * s],
      [cx - 24 * s, cy + 16 * s],
      [cx - 38 * s, cy - 10 * s],
      [cx - 22 * s, cy - 28 * s],
      [cx - 32 * s, cy - 46 * s],
    ], 11 * s), O.bee),
    fillOf(roundPoly([
      [cx, cy - 56 * s],
      [cx + 22 * s, cy - 16 * s],
      [cx + 16 * s, cy + 12 * s],
      [cx - 16 * s, cy + 12 * s],
      [cx - 22 * s, cy - 16 * s],
    ], 9 * s), O.fox),
    fillOf(roundPoly([
      [cx, cy - 28 * s],
      [cx + 10 * s, cy + 6 * s],
      [cx - 10 * s, cy + 6 * s],
    ], 5 * s), O.cardinal),
    fillOf(roundPoly([
      [cx - 24 * s, cy + 6 * s],
      [cx + 24 * s, cy + 6 * s],
      [cx + 15 * s, cy + 28 * s],
      [cx - 15 * s, cy + 28 * s],
    ], 5 * s), O.narwhal),
    fillOf(rrect(cx - 26 * s, cy + 2 * s, 52 * s, 10 * s, 5 * s), O.humpback),
    fillOf(rrect(cx - 8 * s, cy + 26 * s, 16 * s, 32 * s, 6 * s), O.eel),
  ];
}

/** 4. Tess: Electrified glowing lightning XP energy orb */
function boltOrbProp(cx, cy, s = 1) {
  return [
    fillOf(circle(cx, cy, 42 * s), O.beluga),
    fillOf(circle(cx, cy, 32 * s), O.moonJelly),
    fillOf(circle(cx, cy, 24 * s), O.snow),
    fillOf(roundPoly([
      [cx + 6 * s, cy - 28 * s],
      [cx - 18 * s, cy + 2 * s],
      [cx - 2 * s, cy + 2 * s],
      [cx - 10 * s, cy + 28 * s],
      [cx + 18 * s, cy - 4 * s],
      [cx + 2 * s, cy - 4 * s],
    ], 3 * s), O.bee),
  ];
}

/** 5. Sage: Waving crimson Quest Flag + parchment scroll */
function questFlagProp(cx, cy, s = 1) {
  return [
    lineOf(`M${f(cx - 20 * s)} ${f(cy + 48 * s)}L${f(cx - 20 * s)} ${f(cy - 54 * s)}`, O.eel, 7.5 * s),
    fillOf(circle(cx - 20 * s, cy - 56 * s, 7 * s), O.bee),
    fillOf(roundPoly([
      [cx - 16 * s, cy - 48 * s],
      [cx + 50 * s, cy - 30 * s],
      [cx + 34 * s, cy - 12 * s],
      [cx + 48 * s, cy + 6 * s],
      [cx - 16 * s, cy + 4 * s],
    ], 6 * s), O.fireAnt),
    fillOf(roundPoly([
      [cx - 16 * s, cy - 52 * s],
      [cx + 48 * s, cy - 34 * s],
      [cx + 32 * s, cy - 16 * s],
      [cx + 46 * s, cy + 2 * s],
      [cx - 16 * s, cy],
    ], 6 * s), O.cardinal),
    sparkleStar(cx + 10 * s, cy - 24 * s, 14 * s, O.bee),
  ];
}

/** 6. Shrodi: Golden trophy cup + mini royal crown */
function trophyProp(cx, cy, s = 1) {
  return [
    lineOf(`M${f(cx - 22 * s)} ${f(cy - 26 * s)}C${f(cx - 44 * s)} ${f(cy - 24 * s)} ${f(cx - 40 * s)} ${f(cy + 4 * s)} ${f(cx - 14 * s)} ${f(cy + 4 * s)}`, O.camel, 7 * s),
    lineOf(`M${f(cx + 22 * s)} ${f(cy - 26 * s)}C${f(cx + 44 * s)} ${f(cy - 24 * s)} ${f(cx + 40 * s)} ${f(cy + 4 * s)} ${f(cx + 14 * s)} ${f(cy + 4 * s)}`, O.camel, 7 * s),
    fillOf(rrect(cx - 7 * s, cy + 10 * s, 14 * s, 18 * s, 4 * s), O.camel),
    fillOf(rrect(cx - 22 * s, cy + 24 * s, 44 * s, 12 * s, 6 * s), O.guineaPig),
    fillOf(roundPoly([
      [cx - 26 * s, cy - 34 * s],
      [cx + 26 * s, cy - 34 * s],
      [cx + 20 * s, cy + 12 * s],
      [cx - 20 * s, cy + 12 * s],
    ], 12 * s), O.bee),
    fillOf(pill(cx, cy - 34 * s, 56 * s, 10 * s), O.duck),
    fillOf(rrect(cx - 16 * s, cy - 22 * s, 6 * s, 20 * s, 3 * s), O.canary),
    sparkleStar(cx + 2 * s, cy - 10 * s, 10 * s, O.snow),
  ];
}

function miniCrown(cx, cy, s = 1) {
  return [
    fillOf(roundPoly([
      [cx - 28 * s, cy + 12 * s],
      [cx - 34 * s, cy - 18 * s],
      [cx - 12 * s, cy - 4 * s],
      [cx, cy - 26 * s],
      [cx + 12 * s, cy - 4 * s],
      [cx + 34 * s, cy - 18 * s],
      [cx + 28 * s, cy + 12 * s],
    ], 4 * s), O.bee),
    fillOf(rrect(cx - 29 * s, cy + 6 * s, 58 * s, 10 * s, 5 * s), O.camel),
    fillOf(circle(cx, cy - 2 * s, 4.5 * s), O.cardinal),
    fillOf(circle(cx - 16 * s, cy + 2 * s, 3.5 * s), O.macaw),
    fillOf(circle(cx + 16 * s, cy + 2 * s, 3.5 * s), O.macaw),
  ];
}

/** 7. Ada: Boutique gift bag + chic purple shades */
function boutiqueBagProp(cx, cy, s = 1) {
  return [
    lineOf(`M${f(cx - 14 * s)} ${f(cy - 26 * s)}C${f(cx - 14 * s)} ${f(cy - 54 * s)} ${f(cx + 14 * s)} ${f(cy - 54 * s)} ${f(cx + 14 * s)} ${f(cy - 26 * s)}`, O.betta, 6.5 * s),
    fillOf(roundPoly([
      [cx - 28 * s, cy - 28 * s],
      [cx + 32 * s, cy - 28 * s],
      [cx + 38 * s, cy + 32 * s],
      [cx - 30 * s, cy + 32 * s],
    ], 9 * s), O.betta),
    fillOf(roundPoly([
      [cx - 32 * s, cy - 28 * s],
      [cx + 24 * s, cy - 28 * s],
      [cx + 29 * s, cy + 32 * s],
      [cx - 37 * s, cy + 32 * s],
    ], 9 * s), O.beetle),
    fillOf(circle(cx - 4 * s, cy + 2 * s, 14 * s), O.starfish),
    sparkleStar(cx - 4 * s, cy + 2 * s, 10 * s, O.snow),
  ];
}

function chicGlasses(y = -8) {
  return [
    fillOf(rrect(-46, y - 16, 42, 30, 12), O.eel),
    fillOf(rrect(4, y - 16, 42, 30, 12), O.eel),
    fillOf(rrect(-42, y - 12, 34, 22, 9), O.beetle),
    fillOf(rrect(8, y - 12, 34, 22, 9), O.beetle),
    lineOf(`M-36 ${y - 6}L-22 ${y + 4}`, O.starfish, 4.5),
    lineOf(`M14 ${y - 6}L28 ${y + 4}`, O.starfish, 4.5),
    lineOf(`M-5 ${y - 4}H5`, O.eel, 5),
  ];
}

/** 8. Mina: Giant gleaming blue diamond + mini floating diamond coins */
function bigDiamondProp(cx, cy, s = 1) {
  return [
    fillOf(circle(cx, cy, 42 * s), O.iguana),
    fillOf(roundPoly([
      [cx - 34 * s, cy - 8 * s],
      [cx + 34 * s, cy - 8 * s],
      [cx, cy + 36 * s],
    ], 5 * s), O.whale),
    fillOf(roundPoly([
      [cx - 20 * s, cy - 28 * s],
      [cx + 20 * s, cy - 28 * s],
      [cx + 34 * s, cy - 8 * s],
      [cx - 34 * s, cy - 8 * s],
    ], 5 * s), O.macaw),
    fillOf(roundPoly([
      [cx - 12 * s, cy - 28 * s],
      [cx + 12 * s, cy - 28 * s],
      [cx + 16 * s, cy - 8 * s],
      [cx - 16 * s, cy - 8 * s],
    ], 3 * s), O.blueJay),
    fillOf(roundPoly([
      [cx - 16 * s, cy - 8 * s],
      [cx + 16 * s, cy - 8 * s],
      [cx, cy + 34 * s],
    ], 4 * s), O.macaw),
    fillOf(rrect(cx - 14 * s, cy - 22 * s, 12 * s, 5 * s, 2.5 * s), O.snow),
  ];
}

function miniDiamond(cx, cy, s = 0.52) {
  return [
    fillOf(roundPoly([
      [cx - 28 * s, cy - 6 * s],
      [cx + 28 * s, cy - 6 * s],
      [cx, cy + 32 * s],
    ], 4 * s), O.whale),
    fillOf(roundPoly([
      [cx - 16 * s, cy - 24 * s],
      [cx + 16 * s, cy - 24 * s],
      [cx + 28 * s, cy - 6 * s],
      [cx - 28 * s, cy - 6 * s],
    ], 4 * s), O.macaw),
    fillOf(roundPoly([
      [cx - 10 * s, cy - 24 * s],
      [cx + 10 * s, cy - 24 * s],
      [cx + 14 * s, cy - 6 * s],
      [cx - 14 * s, cy - 6 * s],
    ], 2.5 * s), O.blueJay),
  ];
}

// ── the 8 original achievement badge definitions ─────────────────────────────
// Varied asymmetric silhouettes — no two characters share the same arm pose!

const TRACKS = [
  {
    badgeDir: "lessons-learned",
    title: "Lessons Learned",
    character: "Hal",
    frameName: "Hexagon",
    frame: FRAMES.hexagon,
    npcId: "npc-hal",
    pose: "idle",
    tilt: -7,
    tx: 204,
    ty: 218,
    scale: 1.04,
    customSpec: (s) => ({ ...s, brows: "arched", mouth: "toothy" }),
    // Asymmetric "Eureka!" pose: left hand resting thoughtfully on chin, right hand cradling a glowing orbital atom cleanly inside with zero rim clip!
    extraBackBeforeTorso: () => [
      lineOf("M46 118L82 82L94 34", O.anchovy, 38),
    ],
    extraInsideAfterTorso: () => [
      lineOf("M-46 118L-90 92L-42 58", O.anchovy, 38),
    ],
    popOutParts: (tree) => [
      ...tree.back.slice(0, 14),
      ...tree.face,
      ...tree.top,
      fillOf(circle(-38, 56, 22), CUSTOM.skinGuideLight[1]),
      // Right hand & glowing orbital atom rendered unclipped (never sliced by the rim!) and positioned with crisp clearance
      ...glowingAtomProp(96, -12, 0.86),
      fillOf(circle(94, 28, 21), CUSTOM.skinGuideLight[0]),
    ],
  },
  {
    badgeDir: "myth-buster",
    title: "Myth Buster",
    character: "Ray",
    frameName: "Shield",
    frame: FRAMES.shield,
    npcId: "npc-ray",
    pose: "idle",
    tilt: 6,
    tx: 224,
    ty: 218,
    scale: 1.04,
    customSpec: (s) => ({ ...s, brows: "angled", mouth: "smirk" }),
    // Detective / Myth-Checker pose: left hand holding the golden magnifying glass cleanly inside the shield beside his face!
    extraBackBeforeTorso: () => [
      lineOf("M-46 118L-80 86L-88 38", O.beetle, 38),
      lineOf("M46 118L72 205", O.beetle, 38),
    ],
    popOutParts: (tree) => [
      ...tree.face,
      ...tree.top,
      ...magnifyingGlassProp(-62, -10, 0.88),
      fillOf(circle(-88, 34, 21), CUSTOM.skinDeep[0]),
    ],
  },
  {
    badgeDir: "streak",
    title: "On Fire",
    character: "Kofi",
    frameName: "Flame Crest",
    frame: FRAMES.flameCrest,
    npcId: "npc-kofi",
    pose: "idle",
    tilt: -5,
    tx: 202,
    ty: 230,
    scale: 0.98,
    customSpec: (s) => ({ ...s, brows: "hero", mouth: "open" }),
    // Torch-bearer power pose: Kofi raising his blazing reactor torch cleanly inside the Flame Crest with full clearance!
    extraBackBeforeTorso: () => [
      lineOf("M-46 118L-72 205", O.humpback, 38),
      lineOf("M46 118L76 82L84 40", O.humpback, 38),
    ],
    popOutParts: (tree) => [
      ...tree.face,
      ...tree.top,
      ...flameTorchProp(86, -8, 0.78),
      fillOf(circle(84, 30, 21), CUSTOM.skinGuideWarm[0]),
    ],
  },
  {
    badgeDir: "xp",
    title: "XP Master",
    character: "Tess",
    frameName: "Starburst",
    frame: FRAMES.starburst,
    npcId: "npc-tess",
    pose: "idle",
    tilt: 5,
    tx: 220,
    ty: 224,
    scale: 0.98,
    customSpec: (s) => ({ ...s, brows: "high", mouth: "toothy" }),
    // High-energy asymmetric peace & lightning orb pose completely clear of the Starburst rim!
    extraBackBeforeTorso: () => [
      lineOf("M-46 118L-78 86L-84 38", O.whale, 38),
      lineOf("M46 118L74 86L82 38", O.whale, 38),
    ],
    popOutParts: (tree) => [
      ...tree.face,
      ...tree.top,
      fillOf(circle(-84, 22, 19), CUSTOM.skinTan[0]),
      lineOf("M-92 16L-98 -8", CUSTOM.skinTan[0], 12.5),
      lineOf("M-77 16L-73 -10", CUSTOM.skinTan[0], 12.5),
      ...boltOrbProp(86, -4, 0.8),
      fillOf(circle(82, 26, 19), CUSTOM.skinTan[0]),
    ],
  },
  {
    badgeDir: "quests-claimed",
    title: "Quest Crusher",
    character: "Sage",
    frameName: "Pentagon",
    frame: FRAMES.pentagon,
    npcId: "npc-sage",
    pose: "idle",
    tilt: -5,
    tx: 198,
    ty: 220,
    scale: 1.04,
    customSpec: (s) => ({ ...s, brows: "arched", mouth: "toothy" }),
    // Summit-conqueror pose: Sage planting a waving crimson Quest Flag completely inside the top-right pentagon space!
    extraBackBeforeTorso: () => [
      lineOf("M-46 118L-74 205", O.crab, 38),
      lineOf("M46 118L80 82L86 36", O.crab, 38),
    ],
    popOutParts: (tree) => [
      ...tree.back.slice(0, 1),
      ...tree.face,
      ...tree.top,
      ...questFlagProp(98, -8, 0.82),
      fillOf(circle(84, 26, 21), CUSTOM.skinOlive[0]),
    ],
  },
  {
    badgeDir: "level-reached",
    title: "Level Up",
    character: "Shrodi",
    frameName: "Rosette",
    frame: FRAMES.rosette,
    isShrodi: true,
    tilt: -5,
    tx: 210,
    ty: 244,
    scale: 1.24,
    // Shrodi cheering with a royal mini crown & golden trophy cup cleanly inside the Rosette!
    shrodiExtras: () => [
      ...miniCrown(0, -82, 0.68),
      ...trophyProp(72, -24, 0.72),
    ],
  },
  {
    badgeDir: "cosmetics-owned",
    title: "Style Collector",
    character: "Ada",
    frameName: "Arch Mirror",
    frame: FRAMES.mirrorArch,
    npcId: "npc-ada",
    pose: "idle",
    tilt: 4,
    tx: 214,
    ty: 226,
    scale: 0.96,
    customSpec: (s) => ({ ...s, mouth: "cat" }),
    // Fashion boutique pose: Ada in chic purple shades holding her boutique bag cleanly inside the Arch Mirror!
    extraBackBeforeTorso: () => [
      lineOf("M-46 118L-76 88L-84 42", O.starfish, 38),
      lineOf("M46 118L74 88L82 40", O.starfish, 38),
    ],
    popOutParts: (tree) => [
      ...tree.back.slice(0, 20),
      ...tree.face,
      ...tree.top,
      ...chicGlasses(-8),
      // Left hand waving cleanly inside the left arch
      fillOf(circle(-84, 26, 18.5), CUSTOM.skinPink[0]),
      lineOf("M-92 18L-98 2", CUSTOM.skinPink[0], 11),
      lineOf("M-84 14L-86 -2", CUSTOM.skinPink[0], 11),
      lineOf("M-75 16L-74 1", CUSTOM.skinPink[0], 11),
      // Right hand proudly holding up her boutique shopping bag completely inside the right arch!
      ...boutiqueBagProp(86, 30, 0.72),
      fillOf(circle(84, 12, 18.5), CUSTOM.skinPink[0]),
    ],
  },
  {
    badgeDir: "diamonds-spent",
    title: "Big Spender",
    character: "Mina",
    frameName: "Octagon",
    frame: FRAMES.octagon,
    npcId: "npc-mina",
    pose: "idle",
    tilt: -5,
    tx: 206,
    ty: 222,
    scale: 1.04,
    customSpec: (s) => ({ ...s, brows: "arched", mouth: "toothy" }),
    // Treasure showcase pose: Mina joyfully hoisting a huge sparkling diamond gem cleanly inside the upper-right Octagon!
    extraBackBeforeTorso: () => [
      lineOf("M-46 118L-76 202", O.featherGreen, 38),
      lineOf("M46 118L80 82L88 34", O.featherGreen, 38),
    ],
    popOutParts: (tree) => [
      ...tree.back.slice(0, 1),
      ...tree.face,
      ...tree.top,
      ...miniDiamond(-82, -14, 0.54),
      ...miniDiamond(-68, -50, 0.36),
      ...bigDiamondProp(94, -10, 0.86),
      fillOf(circle(90, 26, 21), CUSTOM.skinBrown[0]),
    ],
  },
];

// ── tier ornament sparkles around the frame ──────────────────────────────────

function tierOrnaments(tier) {
  const col = tier.sparkle;
  const parts = [];
  if (tier.stars >= 1) {
    parts.push(sparkleStar(384, 96, 15, col));
  }
  if (tier.stars >= 2) {
    parts.push(sparkleStar(56, 102, 13, col));
  }
  if (tier.stars >= 3) {
    parts.push(sparkleStar(366, 354, 12, col));
    parts.push(fillOf(circle(64, 344, 6.5), col));
  }
  if (tier.stars >= 4) {
    parts.push(sparkleStar(220, 32, 17, "#FFE047"));
    parts.push(sparkleStar(398, 224, 13, "#38E89A"));
    parts.push(sparkleStar(42, 224, 13, "#00B8D9"));
  }
  return renderParts(parts);
}

// ── build a single badge SVG ─────────────────────────────────────────────────

function linearStops(colors) {
  if (colors.length === 1) return `<stop offset="0%" stop-color="${colors[0]}"/>`;
  return colors
    .map((c, i) => `<stop offset="${Math.round((i / (colors.length - 1)) * 100)}%" stop-color="${c}"/>`)
    .join("");
}

function buildBadgeSvg(track, tier, uid) {
  const clipInnerId = `clip-in-${uid}`;
  const clipPopId = `clip-pop-${uid}`;
  const gradRimId = `rim-${uid}`;
  const gradLipId = `lip-${uid}`;
  const gradSpecId = `spec-${uid}`;

  const outerPath = track.frame(0, 0);
  const lipPath = track.frame(14, 0);
  const innerPath = track.frame(0, 22);
  const bevelPath = track.frame(0, 6);

  const defs = `
    <defs>
      <linearGradient id="${gradRimId}" x1="8%" y1="15%" x2="92%" y2="85%">
        ${linearStops(tier.rim)}
      </linearGradient>
      <linearGradient id="${gradLipId}" x1="8%" y1="15%" x2="92%" y2="85%">
        ${linearStops(tier.lip)}
      </linearGradient>
      <linearGradient id="${gradSpecId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.38"/>
        <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.06"/>
      </linearGradient>
      <clipPath id="${clipInnerId}">
        <path d="${innerPath}"/>
      </clipPath>
      <!-- Upper pop-out clip for Shrodi: open above y=230, stays safely inside the lower rosette well below y=230 -->
      <clipPath id="${clipPopId}">
        <path d="M0 0 H440 V230 H322 L285 330 L220 356 L155 330 L118 230 H0 Z"/>
      </clipPath>
    </defs>
  `;

  const frameBack = `
    <path d="${lipPath}" fill="url(#${gradLipId})"/>
    <path d="${outerPath}" fill="url(#${gradRimId})"/>
    <path d="${bevelPath}" fill="url(#${gradSpecId})"/>
    <path d="${innerPath}" fill="${tier.well}"/>
  `;

  let charInside = "";
  let charPopOut = "";

  if (track.isShrodi) {
    const layers = shrodiArt.buildShrodi(`shrodi-${uid}`);
    const frame = shrodiArt.frameOf(shrodiArt.POSES.cheer, 300);
    const svgInner = shrodiArt.toSvg(layers, frame);
    const xform = `translate(${track.tx} ${track.ty}) scale(${track.scale}) rotate(${track.tilt})`;
    const extras = track.shrodiExtras ? renderParts(track.shrodiExtras()) : "";
    charInside = `<g clip-path="url(#${clipInnerId})"><g transform="${xform}">${svgInner}</g></g>`;
    charPopOut = `<g clip-path="url(#${clipPopId})"><g transform="${xform}">${svgInner}${extras}</g></g>`;
  } else {
    const baseSpec = findNpc(track.npcId);
    const spec = track.customSpec ? track.customSpec(baseSpec) : baseSpec;
    const tree = buildNpc(spec, track.pose, "hero");

    const extraBack = track.extraBackBeforeTorso ? track.extraBackBeforeTorso() : [];
    const extraAfter = track.extraInsideAfterTorso ? track.extraInsideAfterTorso() : [];
    const insideSvg = renderParts([
      ...extraBack,
      ...tree.back,
      ...extraAfter,
      ...tree.face,
      ...tree.top,
      ...tree.front,
    ]);

    const popOutSvg = renderParts(track.popOutParts(tree));
    const xform = `translate(${track.tx} ${track.ty}) scale(${track.scale}) rotate(${track.tilt})`;
    charInside = `<g clip-path="url(#${clipInnerId})"><g transform="${xform}">${insideSvg}</g></g>`;
    charPopOut = `<g transform="${xform}">${popOutSvg}</g>`;
  }

  const ornaments = tierOrnaments(tier);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="440" viewBox="0 0 440 440">${defs}${frameBack}${charInside}${charPopOut}${ornaments}</svg>`;
}

// ── CLI modes: --preview <dir> vs full bake ──────────────────────────────────

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function writePreviewSheets(outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  // Sheet 1: All 8 achievements at Level 12 (Prismatic)
  {
    const cols = 4;
    const cellW = 320;
    const cellH = 384;
    const W = cols * cellW + 40;
    const H = 2 * cellH + 92;
    let body = `<rect width="${W}" height="${H}" rx="28" fill="#F8FAFC"/>`;
    body += `<text x="${W / 2}" y="44" font-family="sans-serif" font-size="24" font-weight="800" text-anchor="middle" fill="#0F172A">AtomIQ Achievement Badges — 8 Custom Shapes &amp; Dynamic Cast Poses (Level 12)</text>`;
    body += `<text x="${W / 2}" y="68" font-family="sans-serif" font-size="14" font-weight="500" text-anchor="middle" fill="#64748B">Original badge frames per achievement track, built from AtomIQ's vector characters</text>`;

    const topTier = TIERS[11];
    TRACKS.forEach((track, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = 20 + c * cellW;
      const y = 84 + r * cellH;
      const inner = buildBadgeSvg(track, topTier, `p8-${i}`).replace(/^<svg[^>]*>|<\/svg>$/g, "");
      body += `<rect x="${x + 10}" y="${y + 10}" width="${cellW - 20}" height="${cellH - 20}" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>`;
      body += `<svg x="${x + 20}" y="${y + 18}" width="280" height="280" viewBox="0 0 440 440">${inner}</svg>`;
      body += `<text x="${x + cellW / 2}" y="${y + 320}" font-family="sans-serif" font-size="17" font-weight="800" text-anchor="middle" fill="#1E293B">${esc(track.title)}</text>`;
      body += `<text x="${x + cellW / 2}" y="${y + 344}" font-family="sans-serif" font-size="13" font-weight="600" text-anchor="middle" fill="#64748B">${esc(track.character)} · ${esc(track.frameName)} Frame</text>`;
    });

    const svgPath = path.join(outDir, "badges-all-8.svg");
    const pngPath = path.join(outDir, "badges-all-8.png");
    fs.writeFileSync(svgPath, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
    execFileSync("magick", ["-density", "125", svgPath, pngPath]);
  }

  // Sheet 2: 12-Level Rim Progression (Levels 1 -> 12)
  {
    const cols = 6;
    const cellW = 220;
    const cellH = 264;
    const W = cols * cellW + 40;
    const H = 2 * cellH + 86;
    let body = `<rect width="${W}" height="${H}" rx="28" fill="#F8FAFC"/>`;
    body += `<text x="${W / 2}" y="42" font-family="sans-serif" font-size="22" font-weight="800" text-anchor="middle" fill="#0F172A">12-Level Rim Color Progression (Bronze → Aurora)</text>`;
    body += `<text x="${W / 2}" y="64" font-family="sans-serif" font-size="13" font-weight="500" text-anchor="middle" fill="#64748B">Shown on Lessons Learned (Hal · Hexagon) across all 12 rank levels</text>`;

    const sampleTrack = TRACKS[0];
    TIERS.forEach((tier, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = 20 + c * cellW;
      const y = 78 + r * cellH;
      const inner = buildBadgeSvg(sampleTrack, tier, `t12-${i}`).replace(/^<svg[^>]*>|<\/svg>$/g, "");
      body += `<rect x="${x + 8}" y="${y + 8}" width="${cellW - 16}" height="${cellH - 16}" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>`;
      body += `<svg x="${x + 18}" y="${y + 14}" width="184" height="184" viewBox="0 0 440 440">${inner}</svg>`;
      body += `<text x="${x + cellW / 2}" y="${y + 218}" font-family="sans-serif" font-size="15" font-weight="800" text-anchor="middle" fill="#1E293B">Lv ${tier.level} · ${esc(tier.name)}</text>`;
      body += `<text x="${x + cellW / 2}" y="${y + 237}" font-family="sans-serif" font-size="11" font-weight="600" text-anchor="middle" fill="#64748B">${tier.stars === 0 ? "Base Rim" : `${tier.stars} Star Accent${tier.stars > 1 ? "s" : ""}`}</text>`;
    });

    const svgPath = path.join(outDir, "badges-12-tiers.svg");
    const pngPath = path.join(outDir, "badges-12-tiers.png");
    fs.writeFileSync(svgPath, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
    execFileSync("magick", ["-density", "125", svgPath, pngPath]);
  }

  console.log(`wrote preview sheets to ${outDir}`);
}

function bakeAll() {
  const svgRoot = path.join(REPO, "tools/badge-art");
  const pngRoot = path.join(REPO, "assets/images/badge");
  const PNG_SIZE = 384;

  let count = 0;
  for (const track of TRACKS) {
    const svgDir = path.join(svgRoot, track.badgeDir);
    const pngDir = path.join(pngRoot, track.badgeDir);
    fs.mkdirSync(svgDir, { recursive: true });
    fs.mkdirSync(pngDir, { recursive: true });

    for (const tier of TIERS) {
      const svgPath = path.join(svgDir, `${tier.level}.svg`);
      const pngPath = path.join(pngDir, `${tier.level}.png`);
      const svg = buildBadgeSvg(track, tier, `${track.badgeDir}-${tier.level}`);
      fs.writeFileSync(svgPath, svg);
      execFileSync("magick", [
        "-background", "none",
        "-density", "180",
        svgPath,
        "-resize", `${PNG_SIZE}x${PNG_SIZE}`,
        "-strip",
        `PNG32:${pngPath}`,
      ]);
      count += 1;
    }
  }
  console.log(`baked ${count} SVGs to tools/badge-art/ and ${count} ${PNG_SIZE}x${PNG_SIZE} PNGs to assets/images/badge/`);
}

const args = process.argv.slice(2);
if (args[0] === "--preview") {
  writePreviewSheets(path.resolve(args[1] ?? "."));
} else {
  bakeAll();
  if (args.includes("--also-preview")) {
    const idx = args.indexOf("--also-preview");
    writePreviewSheets(path.resolve(args[idx + 1] ?? path.join(REPO, "tools/badge-art")));
  }
}
