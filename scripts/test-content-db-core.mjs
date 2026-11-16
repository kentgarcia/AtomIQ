/**
 * Content seeding decision logic (spec §3.3).
 *
 * Run: npm run test:content-db
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  REQUIRED_CONTENT_TABLES,
  decideSeedAction,
  isDraftVersion,
  schemaMismatch,
  verifyCandidate,
} from "../services/content-db-core.ts";

const base = { localExists: true, localVersion: "1.2.0", integrityOk: true, bundledVersion: "1.2.0" };

describe("decideSeedAction", () => {
  it("is ready when the local copy has the bundled version and is healthy", () => {
    assert.deepEqual(decideSeedAction(base), { action: "ready" });
  });

  it("seeds when there is no local database", () => {
    assert.deepEqual(decideSeedAction({ ...base, localExists: false, localVersion: null }), {
      action: "seed",
      reason: "missing",
    });
  });

  it("seeds when the version changed, including when the bundle is OLDER (rollback)", () => {
    assert.deepEqual(decideSeedAction({ ...base, localVersion: "1.3.0" }), { action: "seed", reason: "version-changed" });
    assert.deepEqual(decideSeedAction({ ...base, localVersion: "1.1.0" }), { action: "seed", reason: "version-changed" });
  });

  it("seeds when the local copy has no content_meta (marker-file era install)", () => {
    assert.deepEqual(decideSeedAction({ ...base, localVersion: null }), { action: "seed", reason: "version-changed" });
  });

  it("seeds when versions match but the integrity check fails", () => {
    assert.deepEqual(decideSeedAction({ ...base, integrityOk: false }), { action: "seed", reason: "integrity" });
  });

  it("treats every draft hash as a different version", () => {
    const a = { ...base, localVersion: "1.2.0+draft.aaaaaa", bundledVersion: "1.2.0+draft.bbbbbb" };
    assert.equal(decideSeedAction(a).action, "seed");
  });

  it("keeps a developer preview instead of reseeding the bundle", () => {
    const preview = { ...base, localVersion: "preview-abc123", previewVersion: "preview-abc123" };
    assert.deepEqual(decideSeedAction(preview), { action: "ready" });
    // A different preview, or none recorded, falls back to the bundle.
    assert.equal(decideSeedAction({ ...preview, previewVersion: "preview-zzz" }).action, "seed");
    assert.equal(decideSeedAction({ ...preview, previewVersion: null }).action, "seed");
  });
});

describe("verifyCandidate", () => {
  const goodCounts = Object.fromEntries(REQUIRED_CONTENT_TABLES.map((t) => [t, 3]));
  const good = {
    meta: { content_version: "1.2.0", schema_version: "1" },
    quickCheck: "ok",
    tableCounts: goodCounts,
  };

  it("accepts a healthy candidate", () => {
    assert.equal(verifyCandidate(good, "1.2.0"), null);
  });

  it("rejects missing or mismatched metadata", () => {
    assert.match(verifyCandidate({ ...good, meta: null }, "1.2.0"), /content_meta is missing/);
    assert.match(verifyCandidate(good, "1.3.0"), /does not match/);
  });

  it("rejects a failed quick_check", () => {
    assert.match(verifyCandidate({ ...good, quickCheck: "database disk image is malformed" }, "1.2.0"), /integrity/);
    assert.match(verifyCandidate({ ...good, quickCheck: null }, "1.2.0"), /integrity/);
  });

  it("names every empty or missing required table", () => {
    const counts = { ...goodCounts, myths: 0, mazes: undefined };
    const message = verifyCandidate({ ...good, tableCounts: counts }, "1.2.0");
    assert.match(message, /myths/);
    assert.match(message, /mazes/);
  });
});

describe("helpers", () => {
  it("detects schema mismatches", () => {
    assert.equal(schemaMismatch({ schema_version: "1" }, 1), false);
    assert.equal(schemaMismatch({ schema_version: "2" }, 1), true);
    assert.equal(schemaMismatch(null, 1), true);
  });

  it("recognises draft versions", () => {
    assert.equal(isDraftVersion("1.4.0"), false);
    assert.equal(isDraftVersion("1.4.0+draft.a1b2c3"), true);
  });
});
