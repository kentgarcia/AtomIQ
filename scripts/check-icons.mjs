#!/usr/bin/env node
// Icon integrity check (docs/ICON_INTEGRITY_SPEC.md §5).
//
// Validates that every icon name used by source code or bundled content
// resolves to an installed `iconsax-react-native` export (after aliasing).
// Exits non-zero on any invalid name. Bottom-nav PNG assets are not inspected.
//
//   node scripts/check-icons.mjs [--db <path>] [--root <dir>] [--quiet]
//
// `--root` / `--db` exist so tests can point the check at a fixture.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

const SCAN_DIRS = ["app", "components", "services", "content", "constants", "hooks"];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set(["node_modules", ".expo", "dist", "build"]);

function parseArgs(argv) {
  const out = { root: REPO, db: null, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") out.root = path.resolve(argv[++i]);
    else if (argv[i] === "--db") out.db = path.resolve(argv[++i]);
    else if (argv[i] === "--quiet") out.quiet = true;
  }
  if (!out.db) out.db = path.join(out.root, "assets", "database", "content.db");
  return out;
}

/**
 * Installed Iconsax export surface, read from the app's own dependency.
 * The package cannot be `require`d under plain Node (it pulls in
 * react-native-svg), so read the runtime entry Metro bundles: its
 * `exports.Name = ...` assignments are the exact export list.
 */
function loadSurface() {
  const require = createRequire(path.join(REPO, "package.json"));
  const entry = require.resolve("iconsax-react-native");
  const src = fs.readFileSync(entry, "utf8");
  const names = new Set();
  for (const m of src.matchAll(/^exports\.([A-Za-z_$][\w$]*)\s*=/gm)) names.add(m[1]);
  if (names.size < 100) {
    throw new Error(`Could not read the Iconsax export surface (found ${names.size}) from ${entry}`);
  }
  return names;
}

async function loadRegistry() {
  return import(pathToFileURL(path.join(REPO, "components", "ui", "icon-registry.ts")).href);
}

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(p);
    else if (SCAN_EXT.has(path.extname(e.name))) yield p;
  }
}

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

/** Literal `<Icon name="X" />` and `<Icon name={"X"} />` usages. */
function scanStatic(root) {
  const found = [];
  for (const d of SCAN_DIRS) {
    for (const file of walkFiles(path.join(root, d))) {
      const src = fs.readFileSync(file, "utf8");
      const rel = path.relative(root, file);
      for (const tag of src.matchAll(/<Icon\b[^>]*?\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)')\s*\})/g)) {
        const name = tag[1] ?? tag[2] ?? tag[3] ?? tag[4];
        found.push({ name, where: `${rel}:${lineOf(src, tag.index)}` });
      }
      // Icon names carried in data: `icon: "Name"`, `iconName: "Name"`.
      for (const m of src.matchAll(/\b(?:icon|iconName|icon[A-Z]\w*)\s*:\s*(?:"([A-Z]\w*)"|'([A-Z]\w*)')/g)) {
        found.push({ name: m[1] ?? m[2], where: `${rel}:${lineOf(src, m.index)}`, data: true });
      }
    }
  }
  return found;
}

/** Every `icon`-keyed string in the bundled content DB, with data identity. */
async function scanDatabase(dbPath) {
  const found = [];
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Bundled content database not found: ${dbPath}`);
  }
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const tables = db
    .prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'")
    .all()
    .map((r) => r.name);

  const visit = (value, ctx, trail) => {
    if (Array.isArray(value)) value.forEach((v, i) => visit(v, ctx, `${trail}[${i}]`));
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        const next = `${trail}.${k}`;
        if (/^(icon|iconName)$/i.test(k) && typeof v === "string") {
          const id = value.id ? ` option:${value.id}` : "";
          found.push({ name: v, where: `${ctx}${id} ${next}` });
        } else visit(v, ctx, next);
      }
    }
  };

  for (const table of tables) {
    const cols = db.prepare(`pragma table_info("${table}")`).all().map((c) => c.name);
    const idCols = ["lesson_id", "id"].filter((c) => cols.includes(c));
    for (const row of db.prepare(`select * from "${table}"`).all()) {
      const ident = idCols.map((c) => `${c}=${row[c]}`).join(" ");
      const type = row.step_type ? ` step_type=${row.step_type}` : "";
      for (const col of cols) {
        const raw = row[col];
        if (typeof raw !== "string" || !/^\s*[[{]/.test(raw)) continue;
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }
        visit(parsed, `db:${table}.${col} ${ident}${type}`, "$");
      }
      for (const col of cols) {
        if (/^icon(_name)?$/i.test(col) && typeof row[col] === "string" && row[col]) {
          found.push({ name: row[col], where: `db:${table}.${col} ${ident}` });
        }
      }
    }
  }
  db.close();
  return found;
}

export async function runCheck({ root = REPO, db = null } = {}) {
  const registry = await loadRegistry();
  const surface = loadSurface();
  const surfaceRecord = Object.fromEntries([...surface].map((n) => [n, true]));
  const failures = [];
  let checked = 0;

  const fail = (where, name, reason) => failures.push({ where, name, reason });

  // Fallback must itself be installed.
  if (!surface.has(registry.FALLBACK_ICON_NAME)) {
    fail("components/ui/icon-registry.ts", registry.FALLBACK_ICON_NAME, "fallback icon is not installed");
  }
  // Every alias must resolve to an installed export.
  for (const [alias, target] of Object.entries(registry.ICON_ALIASES)) {
    checked++;
    if (!surface.has(target)) fail("components/ui/icon-registry.ts", alias, `alias target "${target}" is not installed`);
  }

  const usages = [
    ...scanStatic(root),
    ...(await scanDatabase(db ?? path.join(root, "assets", "database", "content.db"))),
  ];
  for (const u of usages) {
    checked++;
    const res = registry.resolveIconName(u.name, surfaceRecord);
    if (!res.valid) {
      const via = res.requested === res.resolved ? "" : ` (alias -> "${res.resolved}")`;
      fail(u.where, u.name, `not an installed Iconsax export${via}`);
    }
  }
  return { failures, checked, surfaceSize: surface.size };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  process.removeAllListeners("warning"); // node:sqlite experimental notice
  const { failures, checked, surfaceSize } = await runCheck({ root: args.root, db: args.db });
  if (failures.length) {
    console.error(`check-icons: ${failures.length} invalid icon reference(s):\n`);
    for (const f of failures) console.error(`  ✗ "${f.name}"  ${f.where}\n      ${f.reason}`);
    console.error(`\n${checked} name(s) checked against ${surfaceSize} installed exports.`);
    process.exit(1);
  }
  if (!args.quiet) console.log(`check-icons: OK — ${checked} name(s) checked against ${surfaceSize} installed exports.`);
}
