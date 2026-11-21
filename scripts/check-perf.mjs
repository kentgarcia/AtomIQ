#!/usr/bin/env node
/**
 * Performance gate (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §8). Fails when a file gains an animated style that
 * returns a layout key (width, height, margin, padding, top and so on: a layout pass on every frame, which Android feels far
 * more than iOS), past what `scripts/perf-baseline.json` records for it. The baseline only ever goes down: when you fix one,
 * lower the number (run with `--update` to rewrite it, which refuses to raise a count). Use a transform or opacity instead
 * (`components/ui/progress-fill.ts` is the model for a bar).
 *
 * Also warns (no failure) about a never-ending loop in a file with no sign of stopping off screen.
 *
 * Run: npm run check:perf        npm run check:perf -- --update
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { layoutAnimations, unguardedLoops } from "./lib/perf-rules.mjs";

const ROOT = process.cwd();
const BASELINE = path.join(ROOT, "scripts", "perf-baseline.json");
const update = process.argv.includes("--update");
const SKIP = new Set(["node_modules", ".git", ".expo", "dist", "web-build", "tools", "docs", "content", "scripts", "assets"]);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : {};
const counts = {};
const loops = [];
const wrongReducedMotion = [];
for (const top of ["app", "components", "hooks"]) {
  const dir = path.join(ROOT, top);
  if (!fs.existsSync(dir)) continue;
  for (const full of walk(dir)) {
    const rel = path.relative(ROOT, full).split(path.sep).join("/");
    const text = fs.readFileSync(full, "utf8");
    const hits = layoutAnimations(text);
    if (hits.length) counts[rel] = hits;
    if (unguardedLoops(text)) loops.push(rel);
    // Reanimated's own useReducedMotion reads only the system setting, once: it cannot see the learner's animation level
    if (rel !== "components/motion/use-reduced-motion.ts" && /import\s*\{[^}]*\buseReducedMotion\b[^}]*\}\s*from\s*["']react-native-reanimated["']/.test(text)) wrongReducedMotion.push(rel);
  }
}

if (update) {
  const next = {};
  for (const [file, hits] of Object.entries(counts)) {
    const was = baseline[file];
    if (was !== undefined && hits.length > was) {
      console.error(`check:perf --update refuses to raise ${file}: ${was} to ${hits.length}. Fix the new animated layout style instead.`);
      process.exit(1);
    }
    if (was === undefined && Object.keys(baseline).length > 0) {
      console.error(`check:perf --update refuses to add ${file} (${hits.length}): a new file must not animate layout.`);
      process.exit(1);
    }
    next[file] = hits.length;
  }
  fs.writeFileSync(BASELINE, JSON.stringify(next, null, 2) + "\n");
  console.log(`check:perf: baseline written, ${Object.keys(next).length} files, ${Object.values(next).reduce((a, b) => a + b, 0)} animated layout styles`);
  process.exit(0);
}

const problems = [];
for (const file of wrongReducedMotion) problems.push(`${file}: imports useReducedMotion from react-native-reanimated; use useReducedMotion or useIdleStill from "@/components/motion/use-reduced-motion" (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.6)`);
for (const [file, hits] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0;
  if (hits.length > allowed) {
    problems.push(`${file}: ${hits.length} animated style(s) return a layout key (baseline ${allowed}): ${hits.map((h) => `${h.key} at line ${h.line}`).join(", ")}. Animate a transform or opacity instead.`);
  }
}
if (problems.length) {
  console.error(`check:perf failed (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
const total = Object.values(counts).reduce((a, h) => a + h.length, 0);
const base = Object.values(baseline).reduce((a, b) => a + b, 0);
console.log(`check:perf ok: ${total} animated layout style(s) (baseline ${base}), none new`);
if (loops.length) console.log(`  note: never-ending loop with no focus or reduced-motion guard in: ${loops.join(", ")}`);
