/**
 * Content versioning tests (spec §3.1, §3.7).
 *
 * Run: npm run test:releases
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { after, describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";

import { contentHash, openDb } from "./lib/content-tables.mjs";
import {
  PublishError,
  bumpVersion,
  checkPublished,
  describeState,
  lastRelease,
  publishRelease,
  readLedger,
  recordUpdate,
  restoreRelease,
  suggestBump,
  syncContent,
} from "./lib/releases.mjs";
import { makeFixture, noChecks, query, sql } from "./lib/test-fixture.mjs";

const fixtures = [];
const fixture = () => {
  const f = makeFixture();
  fixtures.push(f);
  return f;
};
after(() => fixtures.forEach((f) => f.cleanup()));

// Content references are not all verified yet; the review gate has its own test below.
const publish = (paths, opts = {}) =>
  publishRelease(paths, { runChecks: noChecks, strictReview: false, now: new Date("2026-11-16T10:00:00"), ...opts });

describe("version arithmetic", () => {
  it("bumps", () => {
    assert.equal(bumpVersion("1.4.2", "patch"), "1.4.3");
    assert.equal(bumpVersion("1.4.2", "minor"), "1.5.0");
    assert.equal(bumpVersion("1.4.2", "major"), "2.0.0");
  });

  it("suggests from a diff", () => {
    const none = { counts: { added: {}, changed: {}, retired: {} }, removedIds: {} };
    assert.equal(suggestBump({ ...none, counts: { ...none.counts, changed: { myths: 1 } } }).bump, "patch");
    assert.equal(suggestBump({ ...none, counts: { ...none.counts, added: { quiz_questions: 6 } } }).bump, "minor");
    assert.equal(suggestBump({ ...none, counts: { ...none.counts, retired: { quiz_questions: 1 } }, removedIds: { quiz_questions: ["a/b"] } }).bump, "minor");
    assert.equal(suggestBump({ ...none, counts: { ...none.counts, retired: { myths: 1 } }, removedIds: { myths: ["x"] } }).bump, "major");
    assert.equal(suggestBump(none, { schemaChanged: true }).bump, "major");
  });
});

describe("content hash", () => {
  it("ignores VACUUM and timestamp churn", () => {
    const { paths } = fixture();
    const read = () => {
      const db = openDb(paths.master, { readOnly: true });
      try {
        return contentHash(db);
      } finally {
        db.close();
      }
    };
    const before = read();
    const db = new DatabaseSync(paths.master);
    db.exec("UPDATE lessons SET updated_at = updated_at + 999; VACUUM;");
    db.close();
    assert.equal(read(), before);
  });

  it("changes when content changes", () => {
    const { paths } = fixture();
    const read = () => {
      const db = openDb(paths.master, { readOnly: true });
      try {
        return contentHash(db);
      } finally {
        db.close();
      }
    };
    const before = read();
    sql(paths, "UPDATE myths SET title = title || ' (edited)' WHERE id = (SELECT id FROM myths LIMIT 1)");
    assert.notEqual(read(), before);
  });
});

describe("sync-content", () => {
  it("labels unpublished content as a draft and is idempotent", () => {
    const { paths } = fixture();
    const first = syncContent(paths);
    assert.match(first.version, /^0\.0\.0\+draft\.[0-9a-f]{6}$/);
    assert.equal(first.published, false);
    assert.equal(first.bundleChanged, true);
    assert.match(fs.readFileSync(paths.tsFile, "utf8"), /CONTENT_DB_VERSION = "0\.0\.0\+draft\./);

    const bytes = fs.readFileSync(paths.bundled);
    const second = syncContent(paths);
    assert.equal(second.bundleChanged, false, "same content must not rewrite the bundle");
    assert.equal(second.constantChanged, false);
    assert.deepEqual(fs.readFileSync(paths.bundled), bytes);
  });

  it("stamps content_meta into the bundle and leaves the bundle out of WAL mode", () => {
    const { paths } = fixture();
    const { version, hash } = syncContent(paths);
    const db = new DatabaseSync(paths.bundled, { readOnly: true });
    const meta = Object.fromEntries(db.prepare("SELECT key, value FROM content_meta").all().map((r) => [r.key, r.value]));
    assert.equal(meta.content_version, version);
    assert.equal(meta.content_hash, hash);
    assert.equal(meta.schema_version, "2");
    assert.equal(db.prepare("PRAGMA journal_mode").get().journal_mode, "delete");
    db.close();
    assert.equal(fs.existsSync(`${paths.bundled}-wal`), false);
  });

  it("does not put content_meta into the master snapshot or hash", () => {
    const { paths } = fixture();
    syncContent(paths);
    assert.equal(fs.existsSync(`${paths.snapshotDir}/content_meta.json`), false);
  });
});

describe("publish", () => {
  it("creates 1.0.0 as the baseline with archive, ledger, bundle and constant", () => {
    const { paths } = fixture();
    const { release, commands } = publish(paths);
    assert.equal(release.version, "1.0.0");
    assert.equal(release.bump, "baseline");
    assert.equal(release.date, "2026-11-16");
    assert.equal(release.unreviewedAllowed, true);
    assert.ok(fs.existsSync(`${paths.releasesDir}/1.0.0.db.gz`));
    assert.equal(lastRelease(readLedger(paths)).version, "1.0.0");
    assert.match(fs.readFileSync(paths.tsFile, "utf8"), /CONTENT_DB_VERSION = "1\.0\.0"/);
    assert.ok(commands.some((c) => c.includes("git tag content-v1.0.0")));
    assert.ok(commands.some((c) => c.startsWith("eas update")));
    assert.ok(fs.existsSync(paths.shippedIds));
    assert.equal(checkPublished(paths).ok, true);
    // A backup was taken first.
    assert.ok(fs.readdirSync(paths.backupDir).some((f) => f.includes("pre-publish")));
  });

  it("refuses to publish when nothing changed", () => {
    const { paths } = fixture();
    publish(paths);
    assert.throws(() => publish(paths), /Nothing to publish/);
  });

  it("shows a draft after an edit and clears it on publish", () => {
    const { paths } = fixture();
    publish(paths);
    sql(paths, "UPDATE myths SET reality = reality || ' Evidence supports this.' WHERE id = (SELECT id FROM myths LIMIT 1)");

    const state = describeState(paths);
    assert.equal(state.published, false);
    assert.match(state.version, /^1\.0\.0\+draft\./);
    assert.equal(state.unpublished, 1);
    assert.equal(state.suggestion.bump, "patch");
    assert.equal(checkPublished(paths).ok, false);
    syncContent(paths);
    assert.match(fs.readFileSync(paths.tsFile, "utf8"), /\+draft\./);

    const { release } = publish(paths, { notes: "Clarified a myth" });
    assert.equal(release.version, "1.0.1");
    assert.equal(release.bump, "patch");
    assert.equal(describeState(paths).published, true);
    assert.equal(checkPublished(paths).ok, true);
  });

  it("suggests minor for added rows and refuses a lower bump", () => {
    const { paths } = fixture();
    publish(paths);
    sql(
      paths,
      `INSERT INTO mythbuster_questions (id, difficulty, type, question, options, correct_answer, explanation, points, position)
       VALUES ('mb-test-new', 'easy', 'multiple_choice', 'Which particle carries a positive charge in the nucleus?',
               '["Proton","Neutron","Electron","Photon"]', '0', 'Protons carry positive charge; neutrons are neutral.', 5,
               (SELECT MAX(position) + 1 FROM mythbuster_questions WHERE difficulty = 'easy'))`,
    );
    assert.equal(describeState(paths).suggestion.bump, "minor");
    assert.throws(() => publish(paths, { bump: "patch" }), (e) => e instanceof PublishError && /below the suggested "minor"/.test(e.message));
    assert.equal(publish(paths).release.version, "1.1.0");
  });

  it("may raise the bump above the suggestion", () => {
    const { paths } = fixture();
    publish(paths);
    sql(paths, "UPDATE myths SET reality = reality || ' Evidence supports this.' WHERE id = (SELECT id FROM myths LIMIT 1)");
    assert.equal(publish(paths, { bump: "minor" }).release.version, "1.1.0");
  });

  it("makes retiring a shipped id a major release, only after it is listed as retired", () => {
    const { paths } = fixture();
    publish(paths);
    // A myth nothing else references, so deleting it is only a question of versioning.
    const id = "zz-temp-myth";
    sql(
      paths,
      `INSERT INTO myths (id, title, myth_statement, reality, explanation, category, difficulty, sources, related_facts, related_lessons, tags)
       VALUES (?, 'Temporary myth', 'Reactors can explode like atomic bombs.',
               'A reactor cannot explode like a bomb because its fuel is far too dilute.', 'Fuel enrichment differs.',
               'safety', 'easy', '[]', '[]', '[]', '[]')`,
      id,
    );
    assert.equal(publish(paths).release.version, "1.1.0");
    sql(paths, "DELETE FROM myths WHERE id = ?", id);

    assert.equal(describeState(paths).suggestion.bump, "major");
    // Not retired yet: validation refuses.
    assert.throws(() => publish(paths), /shipped-id-missing|Validation failed/);
    assert.equal(lastRelease(readLedger(paths)).version, "1.1.0", "failed publish must not add a release");

    fs.writeFileSync(paths.retiredIds, JSON.stringify({ myths: { [id]: "removed for accuracy" } }));
    assert.throws(() => publish(paths, { bump: "minor" }), /below the suggested "major"/);
    assert.equal(publish(paths).release.version, "2.0.0");
  });

  it("enforces the review gate unless explicitly allowed", () => {
    const { paths } = fixture();
    // The shipped content has every source verified, so un-verify one that a lesson cites.
    sql(paths, "UPDATE content_references SET verified = 0 WHERE id = (SELECT reference_id FROM lesson_references LIMIT 1)");
    assert.throws(() => publishRelease(paths, { runChecks: noChecks, strictReview: true }), /reference-unverified|Validation failed/);
    assert.equal(readLedger(paths).releases.length, 0);
  });

  it("runs the checks and stops when they fail", () => {
    const { paths } = fixture();
    assert.throws(
      () =>
        publishRelease(paths, {
          strictReview: false,
          runChecks: () => {
            throw new Error("typecheck failed");
          },
        }),
      /typecheck failed/,
    );
    assert.equal(readLedger(paths).releases.length, 0);
    assert.equal(fs.existsSync(paths.backupDir), false, "no backup before the gates pass");
  });

  it("rolls derived files back when a write fails after the backup", () => {
    const { paths } = fixture();
    publish(paths);
    sql(paths, "UPDATE myths SET reality = reality || ' Evidence supports this.' WHERE id = (SELECT id FROM myths LIMIT 1)");
    syncContent(paths);
    const ledgerBefore = fs.readFileSync(paths.ledger, "utf8");
    const tsBefore = fs.readFileSync(paths.tsFile, "utf8");
    const snapBefore = fs.readFileSync(`${paths.snapshotDir}/myths.json`, "utf8");

    // Turn the releases directory into a file so the archive write fails mid-publish.
    fs.rmSync(paths.releasesDir, { recursive: true });
    fs.writeFileSync(paths.releasesDir, "not a directory");

    assert.throws(() => publish(paths));
    assert.equal(fs.readFileSync(paths.ledger, "utf8"), ledgerBefore);
    assert.equal(fs.readFileSync(paths.tsFile, "utf8"), tsBefore);
    assert.equal(fs.readFileSync(`${paths.snapshotDir}/myths.json`, "utf8"), snapBefore);
    assert.ok(fs.readdirSync(paths.backupDir).some((f) => f.includes("pre-publish")), "the backup is kept");
  });
});

describe("restore and record", () => {
  it("restores an old release as a draft; publishing creates a new forward release", () => {
    const { paths } = fixture();
    publish(paths);
    sql(paths, "UPDATE myths SET reality = reality || ' Evidence supports this.' WHERE id = (SELECT id FROM myths LIMIT 1)");
    publish(paths); // 1.0.1

    const { preRestoreBackup } = restoreRelease(paths, "1.0.0");
    assert.ok(preRestoreBackup && fs.existsSync(preRestoreBackup));
    const state = describeState(paths);
    assert.equal(state.published, false, "1.0.0 content differs from the latest release, so it is a draft");

    const { release } = publish(paths, { notes: "Restores 1.0.0" });
    assert.equal(release.version, "1.0.2");
    assert.deepEqual(readLedger(paths).releases.map((r) => r.version), ["1.0.0", "1.0.1", "1.0.2"]);
  });

  it("restoring the latest release makes the working copy published again", () => {
    const { paths } = fixture();
    publish(paths);
    sql(paths, "UPDATE myths SET reality = reality || ' Evidence supports this.' WHERE id = (SELECT id FROM myths LIMIT 1)");
    assert.equal(describeState(paths).published, false);
    restoreRelease(paths, "1.0.0");
    assert.equal(describeState(paths).published, true);
  });

  it("refuses while Content Studio holds the database, and for unknown versions", () => {
    const { paths } = fixture();
    publish(paths);
    // A live pid other than ours: the parent process.
    fs.writeFileSync(paths.studioLock, String(process.ppid));
    assert.throws(() => restoreRelease(paths, "1.0.0"), /Studio is running/);
    fs.rmSync(paths.studioLock);
    assert.throws(() => restoreRelease(paths, "9.9.9"), /Unknown release/);
  });

  it("ignores a stale Studio lock", () => {
    const { paths } = fixture();
    publish(paths);
    fs.writeFileSync(paths.studioLock, "999999999");
    assert.doesNotThrow(() => restoreRelease(paths, "1.0.0"));
  });

  it("records the EAS update group on a release", () => {
    const { paths } = fixture();
    publish(paths);
    recordUpdate(paths, "abc-123");
    assert.equal(lastRelease(readLedger(paths)).update.groupId, "abc-123");
    assert.throws(() => recordUpdate(paths, "x", { version: "7.7.7" }), /Unknown release/);
  });
});

describe("check:content-published", () => {
  it("fails when the constant or bundle is stale", () => {
    const { paths } = fixture();
    publish(paths);
    assert.equal(checkPublished(paths).ok, true);
    fs.writeFileSync(paths.tsFile, fs.readFileSync(paths.tsFile, "utf8").replace('"1.0.0"', '"0.9.0"'));
    assert.match(checkPublished(paths).message, /npm run sync-content/);
  });
});
