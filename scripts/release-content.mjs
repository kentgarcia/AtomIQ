#!/usr/bin/env node
/**
 * Content releases (spec §3.7).
 *
 *   npm run release:content                         # status: version, unpublished changes, suggested bump
 *   npm run release:content -- --publish [--bump patch|minor|major] [--notes "text"] [--allow-unreviewed]
 *   npm run release:content -- --list
 *   npm run release:content -- --restore 1.3.2      # load a past release into the master as a draft
 *   npm run release:content -- --record-update <eas-update-group-id> [--version 1.4.0]
 *
 * Publishing validates (strict: references must be verified), typechecks, checks icons, takes a
 * pre-publish backup, then writes the snapshot, archive, ledger entry, bundle
 * and CONTENT_DB_VERSION. It prints the git and `eas update` commands; running
 * them stays a deliberate human step.
 *
 * --allow-unreviewed skips the "every content reference is verified" part of the gate
 * (everything else still applies). The release entry records that it was used.
 */
import { makePaths } from "./lib/content-paths.mjs";
import {
  BUMPS,
  PublishError,
  describeState,
  publishRelease,
  readLedger,
  recordUpdate,
  restoreRelease,
} from "./lib/releases.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const option = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};

const paths = makePaths();
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

try {
  if (flag("--list")) {
    const { releases } = readLedger(paths);
    if (!releases.length) console.log("No releases yet.");
    for (const r of [...releases].reverse()) {
      console.log(`${r.version.padEnd(10)} ${r.date}  ${r.bump.padEnd(8)} ${r.update?.groupId ? `update ${r.update.groupId}` : "update not recorded"}`);
      if (r.notes) console.log(`           ${r.notes.split("\n")[0]}`);
    }
  } else if (flag("--restore")) {
    const version = option("--restore");
    if (!version) fail("Usage: --restore <version>");
    const { preRestoreBackup } = restoreRelease(paths, version, { force: flag("--force") });
    console.log(`Restored release ${version} into the master database as a draft.`);
    if (preRestoreBackup) console.log(`Previous master saved as ${preRestoreBackup}`);
    console.log(`Publish it with: npm run release:content -- --publish --notes "Restores ${version}"`);
  } else if (flag("--record-update")) {
    const groupId = option("--record-update");
    if (!groupId || groupId.startsWith("--")) fail("Usage: --record-update <eas-update-group-id> [--version x.y.z]");
    const r = recordUpdate(paths, groupId, { version: option("--version"), channel: option("--channel") });
    console.log(`Recorded EAS update ${groupId} for release ${r.version}. Commit content/releases.json.`);
  } else if (flag("--publish")) {
    const bump = option("--bump");
    if (bump && !BUMPS.includes(bump)) fail(`--bump must be one of: ${BUMPS.join(", ")}`);
    // --json (used by Content Studio): "LOG <text>" lines, then one "RESULT <json>" line.
    const asJson = flag("--json");
    const { release, commands } = publishRelease(paths, {
      bump,
      notes: option("--notes") ?? "",
      strictReview: !flag("--allow-unreviewed"),
      log: (m) => console.log(asJson ? `LOG ${m}` : m),
      // Only the test suite sets this; Studio and humans never skip the gates.
      ...(process.env.ATOMIQ_SKIP_CHECKS === "1" ? { runChecks: () => {} } : {}),
    });
    if (asJson) {
      console.log(`RESULT ${JSON.stringify({ release, commands })}`);
    } else {
      console.log(`\nPublished content ${release.version}. Next steps:\n`);
      for (const c of commands) console.log(`  ${c}`);
      console.log("");
    }
  } else {
    const s = describeState(paths);
    console.log(`Content version : ${s.version}`);
    console.log(`Last release    : ${s.lastVersion ?? "none yet (first publish creates 1.0.0)"}`);
    console.log(`Status          : ${s.published ? "published" : `${s.unpublished ?? "?"} unpublished change(s)`}`);
    if (s.suggestion) console.log(`Suggested bump  : ${s.suggestion.bump} (${s.suggestion.reasons.join(", ") || "no changes"})`);
    if (!s.published) console.log(`\nPublish with: npm run release:content -- --publish --notes "What changed"`);
  }
} catch (err) {
  if (flag("--json")) {
    console.log(`ERROR ${JSON.stringify({ message: err.message, errors: err instanceof PublishError ? (err.errors ?? null) : null })}`);
    process.exit(1);
  }
  fail(err.message);
}
