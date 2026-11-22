/**
 * The build line shown in Settings: app version, build number and content version, each its own number.
 *
 * Run: npm run test:build-info
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { appVersionLabel, buildLine, contentVersionLabel } = loadTs("services/build-info-core.ts");

test("the app version carries the build number when there is one", () => {
  assert.equal(appVersionLabel({ appVersion: "1.0.1", buildNumber: "7" }), "1.0.1 (7)");
  assert.equal(appVersionLabel({ appVersion: "1.0.1", buildNumber: null }), "1.0.1");
  assert.equal(appVersionLabel({ appVersion: "1.0.1", buildNumber: "  " }), "1.0.1");
});

test("a missing app version reads Unknown, never an invented number", () => {
  assert.equal(appVersionLabel({ appVersion: null, buildNumber: "7" }), "Unknown");
  assert.equal(appVersionLabel({ appVersion: undefined, buildNumber: undefined }), "Unknown");
  assert.equal(appVersionLabel({ appVersion: " ", buildNumber: "7" }), "Unknown");
});

test("draft content is called a draft, published content is just its version", () => {
  assert.equal(contentVersionLabel("1.2.0"), "1.2.0");
  assert.equal(contentVersionLabel("1.2.0+draft.a1b2c3"), "draft (1.2.0+draft.a1b2c3)");
});

test("the whole line", () => {
  assert.equal(buildLine({ appVersion: "1.0.1", buildNumber: "7", contentVersion: "1.2.0" }), "1.0.1 (7) · content 1.2.0");
  assert.equal(buildLine({ appVersion: "1.0.0", buildNumber: null, contentVersion: "0.0.0+draft.aabbb1" }), "1.0.0 · content draft (0.0.0+draft.aabbb1)");
});
