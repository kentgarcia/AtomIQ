#!/usr/bin/env node
/**
 * Phone source gate (docs/PHONE_SPEC.md §10). The phone is offline and has no device sensors:
 *   - no import of a camera, photo-library, location, contacts or notifications package (app permissions stay INTERNET only),
 *   - no `fetch(` in the phone's services,
 *   - the only text input under the phone is Field Notes (`app/phone-apps/field-note*`, `components/phone/notes/*`).
 * Checked in app/phone-apps, app/(tabs)/phone.tsx, components/phone and services/phone*.ts.
 *
 * Run: npm run check:phone        (option for tests: --root <dir>)
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const ROOT = rootArg >= 0 ? path.resolve(args[rootArg + 1]) : process.cwd();

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;
const TARGETS = [
  { dir: "app/phone-apps" },
  { file: "app/(tabs)/phone.tsx" },
  { dir: "components/phone" },
  { dir: "components/scanner" },
  { dir: "components/camera" },
  { dir: "services", match: /^(phone|chat|scanner|field-notes|photo).*\.(ts|tsx)$/ },
];
/** Where a text input is allowed: the private notebook. */
const TEXT_INPUT_OK = /(field-note|\/notes)/i;

function* walk(dir, match) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full, match);
    else if (match ? match.test(entry.name) : SOURCE_EXT.test(entry.name)) yield full;
  }
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

const RULES = [
  { name: "a device-sensor or permission package", re: /from\s+["'](?:expo-camera|expo-image-picker|expo-media-library|expo-location|expo-contacts|expo-notifications|expo-sensors|expo-av)["']/ },
  { name: "a network call (fetch)", re: /\bfetch\s*\(/ },
  { name: "a text input outside Field Notes", re: /\bTextInput\b/, unless: TEXT_INPUT_OK },
];

const files = [];
for (const t of TARGETS) {
  if (t.file) {
    const full = path.join(ROOT, t.file);
    if (fs.existsSync(full)) files.push(full);
  } else files.push(...walk(path.join(ROOT, t.dir), t.match));
}

const problems = [];
for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const src = stripComments(fs.readFileSync(file, "utf8"));
  src.split("\n").forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.re.test(line) && !(rule.unless && rule.unless.test(rel))) problems.push(`${rel}:${i + 1}: ${rule.name}`);
    }
  });
}

if (problems.length) {
  console.error(`check-phone: ${problems.length} problem(s)\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`check-phone: OK. ${files.length} file(s) checked: no sensor package, no fetch, no text input outside Field Notes.`);
