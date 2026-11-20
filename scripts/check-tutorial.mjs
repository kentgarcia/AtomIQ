#!/usr/bin/env node
/**
 * Tutorial source gate (docs/features/TUTORIAL_SPEC.md §11). Shrodi's tour is wired by names, so the names must agree:
 *   - every beat's `target` is declared by a `useTutorialTarget("<id>")` somewhere in source, and every declared id is a beat's,
 *   - every beat's `until` event is reported by an `emitTutorial("<event>")` somewhere in source,
 *   - the tour stays out of lessons and game levels: no `TutorialLayer` under app/lesson, app/practice or the platformer screen,
 *   - the layer is mounted for both hosts (the root layout, and the lesson preview's modal).
 *
 * Run: npm run check:tutorial        (option for tests: --root <dir>)
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const ROOT = rootArg >= 0 ? path.resolve(args[rootArg + 1]) : process.cwd();

const SOURCE_EXT = /\.(ts|tsx)$/;
const SKIP = new Set(["node_modules", ".git", "assets", "content", "docs", "scripts", "tools", ".expo", "android", "ios", "dist"]);

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SOURCE_EXT.test(entry.name)) yield full;
  }
}

const core = await import(pathToFileURL(path.join(ROOT, "services/tutorial-core.ts")).href);
const beats = core.allBeats();

const declared = new Set();
const emitted = new Set();
const problems = [];

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/useTutorialTarget(?:<[^>]*>)?\(\s*"([^"]+)"/g)) declared.add(m[1]);
  for (const m of src.matchAll(/emitTutorial\(\s*"([^"]+)"/g)) emitted.add(m[1]);
  if (/^(app\/lesson|app\/practice|app\/explorer\/platformer)/.test(rel) && /TutorialLayer/.test(src)) {
    problems.push(`${rel}: the tour must stay out of lessons and game levels`);
  }
}

const used = new Set(beats.flatMap((b) => (b.target ? [b.target] : [])));
for (const id of used) if (!declared.has(id)) problems.push(`target "${id}" is used by a beat but no useTutorialTarget declares it`);
for (const id of declared) if (!used.has(id)) problems.push(`target "${id}" is declared in source but no beat lights it`);
for (const b of beats) if (b.until && !emitted.has(b.until)) problems.push(`beat "${b.id}" waits for "${b.until}" but nothing calls emitTutorial("${b.until}")`);

const layout = fs.existsSync(path.join(ROOT, "app/_layout.tsx")) ? fs.readFileSync(path.join(ROOT, "app/_layout.tsx"), "utf8") : "";
const preview = fs.existsSync(path.join(ROOT, "components/lesson/LessonPreviewLayer.tsx")) ? fs.readFileSync(path.join(ROOT, "components/lesson/LessonPreviewLayer.tsx"), "utf8") : "";
if (!/<TutorialLayer\s+host="root"/.test(layout)) problems.push('app/_layout.tsx must mount <TutorialLayer host="root" />');
if (beats.some((b) => b.host === "preview") && !/<TutorialLayer\s+host="preview"/.test(preview)) problems.push('components/lesson/LessonPreviewLayer.tsx must mount <TutorialLayer host="preview" />');

if (problems.length > 0) {
  console.error(`check:tutorial found ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check:tutorial ok: ${beats.length} beats, ${used.size} targets, ${new Set(beats.flatMap((b) => (b.until ? [b.until] : []))).size} events.`);
