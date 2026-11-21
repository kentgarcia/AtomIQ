#!/usr/bin/env node
/**
 * One-off (docs/features/CONTENT_SOURCE_PHASE5_SPEC.md 2.2 rule 3): turn every card or item figure that a library function
 * drew into `{ ref, args? }`, proved first.
 *
 * For each stored `data.figure.scene`, every figure of the library is tried: with no arguments, and with the literal
 * arguments of every call found in the authoring modules (`curriculum/unit-N.mjs`). A figure is converted only when the
 * function's scene equals the stored one exactly (key order ignored); the stored alt text is kept as an override only when
 * it differs. Anything else stays inline and is listed. Nothing is written by this script: it makes a patch for
 * `npm run content:edit` (dry run, then --apply) and the file of pinned hashes that `test:figures` checks.
 *
 *   node --no-warnings scripts/content-migration/convert-figures-to-refs.mjs <patch.json>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { openDb } from "../lib/content-tables.mjs";
import { makePaths } from "../lib/content-paths.mjs";
import { sameScene as same, sceneHash } from "../lib/figure-hash.mjs";
import { FIGURES, resolveFigure } from "../../components/lesson/visual/figures/index.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) {
  console.error("usage: convert-figures-to-refs.mjs <patch.json>");
  process.exit(1);
}

// candidate argument lists: none, plus every literal call in the authoring modules
const names = Object.keys(FIGURES);
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const candidates = new Map(names.map((id) => [id, [[]]]));
for (const file of ["unit-1.mjs", "unit-2.mjs"]) {
  const src = fs.readFileSync(path.join(HERE, "curriculum", file), "utf8");
  for (const id of names) {
    for (const m of src.matchAll(new RegExp(`\\b${camel(id)}\\(([^()]*(?:\\([^()]*\\)[^()]*)*)\\)`, "g"))) {
      const text = m[1].trim();
      if (!text) continue;
      try {
        const args = new Function(`return [${text}]`)();
        if (!candidates.get(id).some((a) => same(a, args))) candidates.get(id).push(args);
      } catch {
        // an argument that is not a literal: the stored figure stays inline unless a no-argument call matches
      }
    }
  }
}

function match(figure) {
  for (const [id, lists] of candidates) {
    for (const args of lists) {
      const r = resolveFigure(id, args);
      if (r && same(r.scene, figure.scene)) return { id, args, r };
    }
  }
  return null;
}

const db = openDb(makePaths().master, { readOnly: true });
const ops = [];
const hashes = {};
const left = [];
let converted = 0;

function convert(label, data) {
  const fig = data.figure;
  if (!fig?.scene) return null;
  const m = match(fig);
  if (!m) {
    left.push(label);
    return null;
  }
  const next = { ref: m.id };
  if (m.args.length) next.args = m.args;
  if (typeof fig.altText === "string" && fig.altText !== m.r.altText) next.altText = fig.altText;
  for (const k of Object.keys(fig)) if (k !== "scene" && k !== "altText") next[k] = fig[k];
  hashes[label] = sceneHash(fig.scene);
  converted++;
  return { ...data, figure: next };
}

for (const r of db.prepare("SELECT lesson_id, id, data FROM lesson_cards ORDER BY lesson_id, position").all()) {
  const next = convert(`card ${r.lesson_id}/${r.id}`, JSON.parse(r.data));
  if (next) ops.push({ op: "update", table: "lesson_cards", pk: [r.lesson_id, r.id], set: { data: next } });
}
for (const r of db.prepare("SELECT id, data FROM items ORDER BY id").all()) {
  const next = convert(`item ${r.id}`, JSON.parse(r.data));
  if (next) ops.push({ op: "update", table: "items", pk: r.id, set: { data: next } });
}
db.close();

if (converted > 0) fs.writeFileSync(out, JSON.stringify({ note: "figures stored as ids (phase 5)", ops }, null, 1));
if (converted === 0) {
  console.log("Nothing to convert: every figure is already an id (the pinned hashes were left alone).");
  process.exit(0);
}
fs.writeFileSync(path.join(HERE, "..", "golden", "figures-shipped.json"), `${JSON.stringify(hashes, null, 1)}\n`);
console.log(`converted ${converted} figure(s) into ${out}; ${left.length} stay inline:`);
for (const l of left) console.log(`  ${l}`);
console.log(`pinned ${Object.keys(hashes).length} hash(es) in scripts/golden/figures-shipped.json`);
