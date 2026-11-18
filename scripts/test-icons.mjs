// Icon integrity tests (docs/ICON_INTEGRITY_SPEC.md §6).  Run: npm run test:icons
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { runCheck } from "./check-icons.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UI = path.join(REPO, "components", "ui");
const registry = await import(pathToFileURL(path.join(UI, "icon-registry.ts")).href);

// Same export surface the check uses (runtime entry of the installed package).
const entry = path.join(REPO, "node_modules/iconsax-react-native/dist/cjs/index.js");
const surface = {};
for (const m of fs.readFileSync(entry, "utf8").matchAll(/^exports\.([\w$]+)\s*=/gm)) surface[m[1]] = true;

// icon-diagnostics.ts imports "./icon-registry" extensionless, which Node ESM
// cannot resolve; load a copy with explicit extensions.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "icon-test-"));
fs.copyFileSync(path.join(UI, "icon-registry.ts"), path.join(tmp, "icon-registry.ts"));
fs.copyFileSync(path.join(UI, "custom-icons.ts"), path.join(tmp, "custom-icons.ts")); // the registry imports it
fs.writeFileSync(
  path.join(tmp, "icon-diagnostics.ts"),
  fs.readFileSync(path.join(UI, "icon-diagnostics.ts"), "utf8").replace('"./icon-registry"', '"./icon-registry.ts"'),
);
const diag = await import(pathToFileURL(path.join(tmp, "icon-diagnostics.ts")).href);

function makeFixture(iconName) {
  const root = fs.mkdtempSync(path.join(tmp, "fx-"));
  fs.mkdirSync(path.join(root, "app"));
  fs.writeFileSync(path.join(root, "app", "ok.tsx"), `<Icon name="Home" />`);
  const dbPath = path.join(root, "content.db");
  const db = new DatabaseSync(dbPath);
  db.exec("create table lesson_steps (lesson_id text, id text, step_type text, data text)");
  db.prepare("insert into lesson_steps values (?,?,?,?)").run(
    "fx-lesson", "lab", "lab", JSON.stringify({ options: [{ id: "opt-1", icon: iconName }] }),
  );
  db.close();
  return { root, dbPath };
}

test("every alias resolves to an installed export", () => {
  for (const [alias, target] of Object.entries(registry.ICON_ALIASES)) {
    assert.ok(surface[target], `alias ${alias} -> ${target} is not installed`);
  }
});

test("fallback icon is installed", () => {
  assert.ok(surface[registry.FALLBACK_ICON_NAME]);
});

test("canonical and aliased names resolve; invalid/empty names use the fallback", () => {
  assert.equal(registry.resolveIconName("Home", surface).valid, true);
  assert.equal(registry.resolveIconName("Close", surface).resolved, "CloseCircle");
  for (const bad of ["Mountain", "NotAnIcon", ""]) {
    const r = registry.resolveIconName(bad, surface);
    assert.equal(r.valid, false);
    assert.equal(r.usedFallback, true);
  }
});

test("diagnostics de-duplicate by requested name and carry source context", () => {
  diag.resetIconDiagnostics();
  const warn = console.warn;
  const warnings = [];
  console.warn = (m) => warnings.push(m);
  try {
    const r = registry.resolveIconName("Bogus", surface);
    assert.equal(diag.reportIconDiagnostic({ ...r, source: "lesson:x option:y" }), true);
    assert.equal(diag.reportIconDiagnostic({ ...r }), false);
  } finally {
    console.warn = warn;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Bogus.*lesson:x option:y.*InfoCircle/);
  assert.equal(diag.getIconDiagnostics().length, 1);
});

test("check passes on the repository source and bundled database", async () => {
  const { failures } = await runCheck({ root: REPO });
  assert.deepEqual(failures, []);
});

test("check passes on a valid fixture and fails on an invalid one with identity", async () => {
  const good = makeFixture("Home");
  assert.deepEqual((await runCheck({ root: good.root, db: good.dbPath })).failures, []);

  const bad = makeFixture("Mountain");
  const { failures } = await runCheck({ root: bad.root, db: bad.dbPath });
  assert.equal(failures.length, 1);
  assert.equal(failures[0].name, "Mountain");
  assert.match(failures[0].where, /lesson_id=fx-lesson/);
  assert.match(failures[0].where, /option:opt-1/);
});

test("check CLI exits non-zero for an invalid fixture", async () => {
  const { spawnSync } = await import("node:child_process");
  const bad = makeFixture("Nope");
  const r = spawnSync(process.execPath, ["--no-warnings", path.join(REPO, "scripts/check-icons.mjs"), "--root", bad.root, "--db", bad.dbPath], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Nope/);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
