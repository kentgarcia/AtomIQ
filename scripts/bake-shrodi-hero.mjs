#!/usr/bin/env node
/**
 * Shrodi as the platformer's hero: ONE sprite sheet of 256 px frames (docs/features/PLATFORMER_SPEC.md §1b).
 *
 * The BODY is the Kenney character's own (tools/platformer-art/Vector/Characters/character_yellow_*.svg):
 * its arms, legs and torso are copied from the poses idle, walk_a, walk_b, jump, hit, front and duck,
 * with the helmet and face removed and the colours changed: the torso is painted as a white lab coat
 * (collar, lapels, pockets, buttons) and stretched taller, the arms and legs are Shrodi's orange fur, the legs drawn close together. Shrodi's
 * real head (ears, glasses, face, from components/mascot/shrodi-art.ts, so it blinks, glances and
 * talks like the mascot) sits where the helmet was, and his tail swings behind. Arms and legs are
 * always behind the coat. The stroke is Kenney's #353541, 4 px at 128 px, put round the WHOLE figure.
 *
 * The clips and frame counts come from components/platformer/hero-anim-core.ts, so the sheet and the
 * game agree on where a frame is.
 *
 * Writes
 *   tools/platformer-art/Vector/Characters/shrodi_sheet.svg            the editable source (every frame, flat colours, the stroke as a filter)
 *   assets/images/platformer/characters/character_shrodi_sheet.png the game's picture (8 columns of 128 px cells)
 * Needs ImageMagick (`magick`).
 *
 * Run: node scripts/bake-shrodi-hero.mjs [--preview <dir>]   (--preview also writes the sheet on a sky colour, 2x)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = await import(pathToFileURL(path.join(REPO, "components/mascot/shrodi-art.ts")).href);
const anim = await import(pathToFileURL(path.join(REPO, "components/platformer/hero-anim-core.ts")).href);
const { SHRODI_COLORS: C, buildShrodi, toSvg } = art;
const { SHEET, CLIPS, CLIP_ORDER, TOTAL_FRAMES, SHEET_ROWS } = anim;

const SIZE = SHEET.frame;
/** The art is drawn on a 128 x 128 canvas (the Kenney characters' size); the sheet's cells are SIZE px, so a bigger cell is the same drawing, sharper. */
const ART = 128;
const INK = "#353541";
/** Kenney's stroke: the outline path round a limb is 4 units wide on the 128 canvas. */
const STROKE_PX = 4;
const GROUND = 127;
/** Where the lying figure is moved after its quarter turn: right so it is centred, up so its back rests on the ground. */
const LIE = { x: 56, y: -41 };
const KENNEY = path.join(REPO, "tools/platformer-art/Vector/Characters");

/* ------------------------------ colours ------------------------------ */

/** Hands, arms and legs are all Shrodi's orange fur (the shaded one is for the limbs Kenney lights darker). */
const FUR = { plain: C.fur, shaded: "#F27A28" };
/** Pixels added to the body's height: the head and coat's top go up this much, the feet stay on the ground. */
const TALLER = 10;
/** The arms are NOT raised with the head: they stay where Kenney has them, at the sides of the coat, not up at the neck. */
const ARMS_RAISE = 0;
/** How far the legs are drawn toward the middle (1 = as Kenney has them, 0 = on top of each other). */
const LEGS_TOGETHER = 0.5;
const COAT = C.coat;

/* ------------------------------ the Kenney body ------------------------------ */

const bboxOf = (d) => {
  const nums = [...d.matchAll(/-?\d+\.?\d*/g)].map((m) => Number(m[0]));
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

/** Read one Kenney pose and sort its paths into limbs, the torso and the helmet (whose place the head takes). */
function readBody(name) {
  const svg = fs.readFileSync(path.join(KENNEY, `character_yellow_${name}.svg`), "utf8");
  const paths = [...svg.matchAll(/<path ([^>]*?)\/>/g)].map((m, i) => {
    const fill = /fill="([^"]*)"/.exec(m[1])[1];
    const d = / d="([^"]*)"/.exec(m[1])[1];
    return { i, fill, d, bb: bboxOf(d), opacity: /fill-opacity/.test(m[1]) };
  });
  const w = (p) => p.bb.x1 - p.bb.x0;
  const h = (p) => p.bb.y1 - p.bb.y0;
  const limbs = [];
  let torso = null;
  let helmet = null;
  for (const p of paths) {
    if (p.i === 0) continue; // the outline: we draw our own, round the whole figure
    const gradient = p.fill.startsWith("url");
    if ((gradient || p.fill === "#FABA2D") && w(p) <= 30 && h(p) <= 32) {
      const cy = (p.bb.y0 + p.bb.y1) / 2;
      const cx = (p.bb.x0 + p.bb.x1) / 2;
      limbs.push({ d: p.d, shaded: gradient, arm: cy < 107.5, side: cx < 64 ? -1 : 1, bb: p.bb });
    } else if (p.fill === "#FABA2D" && !torso) torso = p;
    else if (p.fill === INK && w(p) > 50 && w(p) < 60 && h(p) > 50 && h(p) < 60 && !helmet) helmet = p;
  }
  if (!torso || !helmet) throw new Error(`${name}: no torso or helmet found`);
  return { limbs, torso, helmet };
}
const BODIES = Object.fromEntries(["idle", "walk_a", "walk_b", "jump", "hit", "front", "duck"].map((n) => [n, readBody(n)]));

/* ------------------------------ the head ------------------------------ */

/** Art units: the head (ears included) is 161 wide and its chin is at y 50.5, centred near x 1. */
const HEAD_SCALE = 0.46;
const HEAD_CHIN = 50.5;
const HEAD_CX = 1;

/* ------------------------------ helpers ------------------------------ */

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** Keys [[u, value], ...] with eased steps between them. */
const keys = (u, list) => {
  if (u <= list[0][0]) return list[0][1];
  for (let i = 1; i < list.length; i++) {
    if (u <= list[i][0]) {
      const [u0, v0] = list[i - 1];
      const [u1, v1] = list[i];
      const k = clamp01((u - u0) / (u1 - u0));
      return v0 + (v1 - v0) * k * k * (3 - 2 * k);
    }
  }
  return list[list.length - 1][1];
};
/** A wave that is zero at u = 0 (so a loop starts from the neutral pose) and closes at u = 1. */
const osc = (u, amp, phase = 0) => amp * (Math.sin(TAU * (u + phase)) - Math.sin(TAU * phase));

const BASE = { bob: 0, lean: 0, tilt: 0, tail: 0, earL: 0, earR: 0, armLa: 10, armLe: 8, armRa: 12, armRe: 10, pupilX: 3, pupilY: 0, lidL: 0, lidR: 0, mouth: 0.6 };
/**
 * A frame: which Kenney pose is the body, the head's face channels (`head`), the body moved down `dy` px,
 * squashed `sq` about the ground, the tail swung `tail` degrees, and arms turned `armL` / `armR` degrees
 * about their shoulders (negative lifts the arm).
 */
const frame = (body, head = {}, o = {}) => ({ body, head: { ...BASE, ...head }, xEyes: o.xEyes ?? false, lie: o.lie ?? false, dy: o.dy ?? 0, sq: o.sq ?? [1, 1], tail: o.tail ?? 0, armL: o.armL ?? 0, armR: o.armR ?? 0 });

/* ------------------------------ the clips ------------------------------ */

const FRAMES = {
  // Breathing, a sway, an ear flick, a glance and a blink: a loop that starts and ends in the same pose
  idle: (u) => {
    const lid = keys(u, [[0, 0], [0.72, 0], [0.76, 1], [0.8, 1], [0.88, 0], [1, 0]]);
    const breath = osc(u, 1, 0.25);
    return frame(
      "idle",
      {
        bob: osc(u, 3),
        tilt: osc(u, 2.6, 0.1),
        earL: osc(u, 3, 0.1) + keys(u, [[0, 0], [0.5, 0], [0.53, -9], [0.58, 0], [1, 0]]),
        earR: osc(u, 3, 0.5),
        pupilX: 3 + keys(u, [[0, 0], [0.2, 0], [0.3, 3], [0.45, 3], [0.55, -1], [0.62, 0], [1, 0]]),
        pupilY: keys(u, [[0, 0], [0.3, 0], [0.35, -1.5], [0.45, -1.5], [0.52, 0], [1, 0]]),
        lidL: lid,
        lidR: lid,
        mouth: 0.55 + 0.12 * Math.sin(TAU * u),
      },
      { sq: [1 - 0.012 * breath, 1 + 0.02 * breath], tail: osc(u, 12, -0.2), armL: osc(u, 2.5, 0.2), armR: osc(u, -2.5, 0.6) },
    );
  },
  // Looks up, tilts its head and lifts a paw to wave, then settles back
  fidget: (u) => {
    const wave = keys(u, [[0, 0], [0.15, 0], [0.3, 1], [0.78, 1], [0.92, 0], [1, 0]]);
    const blink = keys(u, [[0, 0], [0.46, 0], [0.5, 1], [0.54, 1], [0.6, 0], [1, 0]]);
    return frame(
      "idle",
      {
        bob: -1.5 * wave * Math.abs(Math.sin(TAU * u * 4)),
        tilt: keys(u, [[0, 0], [0.15, 6], [0.85, 6], [1, 0]]),
        earL: 4 * wave,
        earR: 5 * wave,
        pupilX: 3 + keys(u, [[0, 0], [0.12, 2.5], [0.9, 2.5], [1, 0]]),
        pupilY: keys(u, [[0, 0], [0.12, -3], [0.35, -3], [0.5, 0], [1, 0]]),
        lidL: blink,
        lidR: blink,
        mouth: 0.55 + 0.4 * wave,
      },
      { tail: 16 * wave * Math.sin(TAU * u * 3), armR: -(34 * wave + 8 * wave * Math.sin(TAU * u * 4)) },
    );
  },
  // Four frames: step with one foot, pass, step with the other foot, pass. The body bobs, the head sways
  // against the step, the tail and ears trail behind. Kenney's own two walking poses are the steps.
  walk: (i) => {
    const key = ["walk_a", "idle", "walk_b", "idle"][i];
    const down = i % 2 === 0; // on a step the body is lowest, passing it is highest
    const sway = i === 0 ? 1 : i === 2 ? -1 : 0;
    return frame(
      key,
      { bob: down ? 1 : -3, tilt: 3 * sway, earL: -8, earR: -8 + 3 * sway, pupilX: 3.5, mouth: 0.8 },
      { dy: down ? 1 : -2, sq: down ? [1.03, 0.97] : [0.98, 1.025], tail: 14 + 16 * sway },
    );
  },
  // Up: stretched
  rise: () => frame("jump", { bob: -3, tilt: 3, earL: -16, earR: -16, pupilY: -2, mouth: 1 }, { sq: [0.95, 1.06], tail: 22 }),
  // The top
  apex: () => frame("jump", { bob: -2, tilt: 2, earL: -4, earR: -4, pupilY: -1, mouth: 0.9 }, { tail: 12 }),
  // Down: wide eyes looking at the ground, legs apart
  fall: () => frame("front", { bob: -3, tilt: 0, earL: 4, earR: 4, pupilX: 2, pupilY: 3, mouth: 0.5 }, { sq: [0.97, 1.04], tail: 6 }),
  // Squash on landing, then spring back
  land: (i) =>
    i === 0
      ? frame("duck", { bob: 2, tilt: 2, earL: 8, earR: -8, pupilY: 1, lidL: 0.35, lidR: 0.35, mouth: 0.3 }, { tail: 10 })
      : frame("idle", { bob: 1, tilt: 1, earL: 3, earR: -3, mouth: 0.5 }, { sq: [0.98, 1.03], tail: 4 }),
  // A flinch: eyes squeezed, ears back; the second frame wobbles back a little
  hit: (i) =>
    i === 0
      ? frame("hit", { bob: 2, tilt: -8, earL: -8, earR: 8, lidL: 0.45, lidR: 0.45, pupilX: -2, pupilY: 2, mouth: 0.35 }, { tail: -12 })
      : frame("hit", { bob: 0, tilt: -3, earL: -4, earR: 4, lidL: 0.4, lidR: 0.4, pupilX: -1, pupilY: 1.5, mouth: 0.4 }, { tail: -6, dy: -1 }),
  // Out of hearts: on their back, head to the left, arms flopped out, eyes crossed out (the pupils are pushed out of the eye whites
  // and an X drawn over each), mouth shut
  down: () => frame("idle", { bob: 0, tilt: 0, earL: 9, earR: 9, pupilX: 0, pupilY: 80, mouth: 0.1 }, { xEyes: true, lie: true, tail: 6, armL: 40, armR: 34 }),
  // A happy hop with the arms out, squashing on the ground and stretching in the air
  cheer: (i, n) => {
    const u = i / n;
    const hop = Math.abs(Math.sin(Math.PI * u));
    return frame(
      hop > 0.4 ? "jump" : "idle",
      { bob: -2 * hop, tilt: 4 * Math.sin(TAU * u), earL: 5, earR: 5, pupilX: 0, pupilY: -0.5, mouth: 1 },
      { dy: -4 * hop, sq: [1.04 - 0.08 * hop, 0.94 + 0.1 * hop], tail: 14 * Math.sin(TAU * u), armL: -28 * hop, armR: -28 * hop },
    );
  },
};

/* ------------------------------ drawing a frame ------------------------------ */

const f1 = (x) => Number(x.toFixed(2));

/** One limb of the Kenney body, in fur. An arm can be turned about its shoulder; a leg is drawn closer to the middle. */
function limbSvg(limb, turn) {
  const d = `<path d="${limb.d}" fill="${limb.shaded ? FUR.shaded : FUR.plain}"/>`;
  if (!limb.arm) {
    const cx = (limb.bb.x0 + limb.bb.x1) / 2;
    return `<g transform="translate(${f1((64 + (cx - 64) * LEGS_TOGETHER) - cx)} 0)">${d}</g>`;
  }
  if (!turn) return d;
  // The shoulder is the arm's end nearest the body
  const px = limb.side === -1 ? limb.bb.x1 - 3 : limb.bb.x0 + 3;
  const py = (limb.bb.y0 + limb.bb.y1) / 2;
  // On the left, a negative turn lifts the hand; on the right it is the mirror
  const deg = limb.side === -1 ? -turn : turn;
  return `<g transform="rotate(${f1(deg)} ${f1(px)} ${f1(py)})">${d}</g>`;
}

/**
 * The white coat: the torso stretched upward to make the body taller (its bottom stays), then a fur
 * collar, lapels, pockets and buttons placed from where the chin now is.
 */
function coatSvg(torso, chin) {
  const cx = (torso.bb.x0 + torso.bb.x1) / 2;
  const bottom = torso.bb.y1;
  const k = (torso.bb.y1 - torso.bb.y0 + TALLER) / (torso.bb.y1 - torso.bb.y0);
  const pocketY = bottom - 14;
  const buttons = [];
  for (let y = chin + 13; y < bottom - 3; y += 9) buttons.push(`<circle cx="${f1(cx)}" cy="${f1(y)}" r="1.4" fill="${C.coatDetail}"/>`);
  return [
    `<g transform="translate(0 ${f1(bottom)}) scale(1 ${f1(k)}) translate(0 ${f1(-bottom)})"><path d="${torso.d}" fill="${COAT}"/></g>`,
    // the fur at the collar, then the lapels over it
    `<path d="M${f1(cx - 7)} ${f1(chin - 6)} L${f1(cx + 7)} ${f1(chin - 6)} L${f1(cx)} ${f1(chin + 8)} Z" fill="${C.fur}"/>`,
    `<path d="M${f1(cx - 17)} ${f1(chin - 5)} L${f1(cx - 7)} ${f1(chin - 6)} L${f1(cx)} ${f1(chin + 9)} L${f1(cx - 14)} ${f1(chin + 5)} Z" fill="${C.coatLight}"/>`,
    `<path d="M${f1(cx + 17)} ${f1(chin - 5)} L${f1(cx + 7)} ${f1(chin - 6)} L${f1(cx)} ${f1(chin + 9)} L${f1(cx + 14)} ${f1(chin + 5)} Z" fill="${C.coatLight}"/>`,
    `<rect x="${f1(cx - 20)}" y="${f1(pocketY)}" width="12" height="9" rx="3" fill="${C.coatShade}"/>`,
    `<rect x="${f1(cx + 8)}" y="${f1(pocketY)}" width="12" height="9" rx="3" fill="${C.coatShade}"/>`,
    ...buttons,
  ].join("");
}

/**
 * The tail from the art (it swings with `tail`), small, rooted at the coat's LEFT back corner and
 * mirrored so it curls out to the left. The pictures face right, so the tail trails behind a hero
 * running right; the game flips the whole picture for left, which puts the tail on the right.
 */
function tailSvg(layers, torso, tail) {
  const parts = layers.back.slice(0, 2); // the two tail strokes come first in the art's back layer
  const rx = torso.bb.x0 + 8;
  const ry = torso.bb.y1 - 12;
  const s = 0.5;
  const inner = toSvg({ back: parts, head: [], front: [] }, { ...BASE, tail });
  return `<g transform="translate(${f1(rx)} ${f1(ry)}) scale(${-s} ${s}) translate(-14 -96)">${inner}</g>`;
}

function frameSvg(id, def) {
  const body = BODIES[def.body];
  const layers = buildShrodi(id);
  const chin = body.helmet.bb.y1;
  const cx = (body.helmet.bb.x0 + body.helmet.bb.x1) / 2;
  const arm = (limb) => limbSvg(limb, limb.side === -1 ? def.armL : def.armR);
  const cross = (x) => `<path d="M${x - 8} -13.5 L${x + 8} 2.5 M${x + 8} -13.5 L${x - 8} 2.5" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" fill="none"/>`;
  const head = toSvg({ back: [], head: layers.head, front: [] }, { ...BASE, ...def.head, lean: 0 }) + (def.xEyes ? cross(-21.5) + cross(21.5) : "");
  // Legs first (they stay on the ground), then everything above the hips, raised by TALLER
  const legs = body.limbs.filter((l) => !l.arm).map(arm).join("");
  const arms = body.limbs.filter((l) => l.arm).map(arm).join("");
  const upper =
    `<g transform="translate(0 ${-ARMS_RAISE})">${arms}</g>` +
    coatSvg(body.torso, chin - TALLER) +
    `<g transform="translate(${f1(cx)} ${f1(chin - TALLER)}) scale(${HEAD_SCALE}) translate(${-HEAD_CX} ${-HEAD_CHIN})">${head}</g>`;
  const figure = tailSvg(layers, body.torso, def.tail) + legs + upper;
  const [sx, sy] = def.sq;
  // Lying down: the whole figure turned a quarter (head to the left), set on the ground and centred
  const lie = def.lie ? `<g transform="translate(${LIE.x} ${LIE.y}) rotate(-90 64 ${GROUND})">${figure}</g>` : figure;
  return `<g transform="translate(0 ${f1(def.dy)}) translate(64 ${GROUND}) scale(${sx} ${sy}) translate(-64 ${-GROUND})">${lie}</g>`;
}

/* ------------------------------ the sheet ------------------------------ */

/** The sheet's editable source draws the stroke with a filter: the whole figure's outline, grown by the stroke width. */
const INK_FILTER = `<defs><filter id="ink" x="-15%" y="-15%" width="130%" height="130%"><feMorphology in="SourceAlpha" operator="dilate" radius="${STROKE_PX}" result="grown"/><feFlood flood-color="${INK}"/><feComposite in2="grown" operator="in" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

let index = 0;
let cells = "";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shrodi-hero-"));
const framePngs = [];
for (const name of CLIP_ORDER) {
  const clip = CLIPS[name];
  for (let i = 0; i < clip.count; i++) {
    if (index !== clip.start + i) throw new Error(`${name}: frame ${index} is not where hero-anim-core says (${clip.start + i})`);
    const def = FRAMES[name](clip.count === 1 ? 0 : name === "idle" || name === "fidget" ? i / clip.count : i, clip.count);
    const col = index % SHEET.cols;
    const row = Math.floor(index / SHEET.cols);
    const art1 = frameSvg(`f${index}`, def);
    // The picture is the frame drawn flat at twice the size, grown by the stroke as ONE shape (the whole
    // figure, not each part), laid under it, and scaled down
    const one = path.join(tmp, `f${String(index).padStart(3, "0")}`);
    fs.writeFileSync(`${one}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * 2}" height="${SIZE * 2}" viewBox="0 0 ${ART} ${ART}">${art1}</svg>`);
    execFileSync("magick", [
      "-background", "none", "-density", "384", `${one}.svg`, "-resize", `${SIZE * 2}x${SIZE * 2}!`,
      "(", "+clone", "-channel", "A", "-morphology", "Dilate", `Disk:${Math.round(STROKE_PX * ((SIZE * 2) / ART))}`, "+channel", "-fill", INK, "-colorize", "100", ")",
      "+swap", "-compose", "over", "-composite", "-filter", "Lanczos", "-resize", `${SIZE}x${SIZE}!`, `PNG32:${one}.png`,
    ]);
    framePngs.push(`${one}.png`);
    // Each cell is clipped to itself, so a limb that reaches past it can never draw into the next frame
    const clipDef = `<clipPath id="cell${index}"><rect x="0" y="0" width="${ART}" height="${ART}"/></clipPath>`;
    cells += `<svg x="${col * SIZE}" y="${row * SIZE}" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${ART} ${ART}">${clipDef}<g clip-path="url(#cell${index})"><g filter="url(#ink)">${art1}</g></g></svg>\n`;
    index++;
  }
}
if (index !== TOTAL_FRAMES) throw new Error(`drew ${index} frames, expected ${TOTAL_FRAMES}`);

const W_PX = SHEET.cols * SIZE;
const H_PX = SHEET_ROWS * SIZE;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W_PX}" height="${H_PX}" viewBox="0 0 ${W_PX} ${H_PX}">\n${INK_FILTER}\n${cells}</svg>\n`;

const outVector = KENNEY;
const outSprite = path.join(REPO, "assets/images/platformer/characters");
fs.mkdirSync(outSprite, { recursive: true });
const svgFile = path.join(outVector, "shrodi_sheet.svg");
const pngFile = path.join(outSprite, "character_shrodi_sheet.png");
fs.writeFileSync(svgFile, svg);

// The sheet: the frames side by side in rows of SHEET.cols
const rows = [];
for (let r = 0; r < SHEET_ROWS; r++) {
  const row = framePngs.slice(r * SHEET.cols, (r + 1) * SHEET.cols);
  while (row.length < SHEET.cols) row.push("xc:none");
  rows.push("(", "-size", `${SIZE}x${SIZE}`, "-background", "none", ...row, "+append", ")");
}
execFileSync("magick", ["-background", "none", ...rows, "-append", `PNG32:${pngFile}`]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`wrote ${path.relative(REPO, pngFile)} (${W_PX}x${H_PX}, ${TOTAL_FRAMES} frames)`);

const preview = process.argv.indexOf("--preview");
if (preview > 0) {
  const dir = path.resolve(process.argv[preview + 1]);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "shrodi-sheet-preview.png");
  execFileSync("magick", ["-size", `${W_PX}x${H_PX}`, "xc:#C3E3FF", pngFile, "-compose", "over", "-composite", "-filter", "Lanczos", "-resize", "200%", out]);
  console.log(`wrote ${out}`);
}
