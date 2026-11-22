#!/usr/bin/env node
/**
 * Release gate: one app version. `app.json` `expo.version` is the source (docs/critical/VERSIONING_SPEC.md 3.2) and
 * `package.json` `version` must equal it. The Android build number belongs to EAS (`appVersionSource: remote`), so
 * `expo.android.versionCode` must not be set in `app.json`: a number there does nothing and misleads.
 *
 *   npm run check:version
 *
 * Wired into `eas-build-post-install` next to `check:content-published`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const app = read("app.json").expo ?? {};
const pkg = read("package.json");
const eas = read("eas.json");
const problems = [];

const semver = /^\d+\.\d+\.\d+$/;
if (!semver.test(app.version ?? "")) problems.push(`app.json expo.version "${app.version}" is not MAJOR.MINOR.PATCH`);
if (pkg.version !== app.version) problems.push(`package.json version "${pkg.version}" differs from app.json expo.version "${app.version}"`);
if (app.android?.versionCode !== undefined) problems.push("app.json expo.android.versionCode is set; EAS owns the build number (remove it)");
if (eas.cli?.appVersionSource !== "remote") problems.push('eas.json cli.appVersionSource must be "remote"');
for (const profile of ["preview", "production"]) {
  if (eas.build?.[profile]?.autoIncrement !== true) problems.push(`eas.json build.${profile}.autoIncrement must be true`);
}

if (problems.length === 0) {
  console.log(`[version] ok: ${app.version}`);
  process.exit(0);
}
for (const p of problems) console.error(`[version] ERROR: ${p}`);
process.exit(1);
