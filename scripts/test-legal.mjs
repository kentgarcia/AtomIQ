#!/usr/bin/env node
/**
 * Privacy Policy and Terms of Service: shape and consistency with the app.
 * Run: npm run test:legal
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const privacy = loadTs("content/legal/privacy.ts");
const terms = loadTs("content/legal/terms.ts");
const legal = loadTs("constants/legal.ts");

const docs = [
  ["privacy", privacy.PRIVACY_SECTIONS, privacy.PRIVACY_HIGHLIGHTS],
  ["terms", terms.TERMS_SECTIONS, terms.TERMS_HIGHLIGHTS],
];
const text = (sections) => sections.map((s) => `${s.title}\n${s.body}`).join("\n");

test("sections are numbered one after another, with a title and a body", () => {
  for (const [name, sections] of docs) {
    sections.forEach((s, i) => {
      assert.ok(s.title.startsWith(`${i + 1}. `), `${name}: "${s.title}" should be section ${i + 1}`);
      assert.ok(s.body.trim().length > 40, `${name}: section ${i + 1} is empty`);
    });
  }
});

test("each document has a short summary and ends with a contact section", () => {
  for (const [name, sections, highlights] of docs) {
    assert.ok(highlights.length >= 4 && highlights.length <= 6, `${name}: ${highlights.length} highlights`);
    assert.equal(sections.at(-1).title.replace(/^\d+\. /, ""), "Contact");
  }
});

test("a bullet is a whole line that starts with a bullet and a space", () => {
  for (const [name, sections] of docs) {
    for (const s of sections) {
      for (const line of s.body.split("\n")) {
        assert.ok(!/^•\S/.test(line), `${name}: bullet without a space in "${line.slice(0, 40)}"`);
        assert.ok(line.trim().length > 0, `${name}: empty paragraph in ${s.title}`);
      }
    }
  }
});

test("no placeholders or leftovers", () => {
  for (const [name, sections, highlights] of docs) {
    let all = `${text(sections)}\n${highlights.join("\n")}`;
    // The real contact address may be a Gmail one; only an unknown @gmail address is a placeholder
    if (legal.LEGAL_CONTACT_EMAIL) all = all.split(legal.LEGAL_CONTACT_EMAIL).join("");
    assert.ok(!/TODO|FIXME|XXX|lorem|\[[A-Z ]{3,}\]|example\.com|@gmail/i.test(all), `${name}: placeholder text`);
  }
});

test("the version and date are the shared ones", () => {
  assert.match(legal.LEGAL_LAST_UPDATED, /^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  assert.match(legal.LEGAL_VERSION, /^\d+\.\d+$/);
  assert.equal(privacy.PRIVACY_VERSION, legal.LEGAL_VERSION);
  assert.equal(terms.TERMS_UPDATED, legal.LEGAL_LAST_UPDATED);
  assert.ok(text(privacy.PRIVACY_SECTIONS).includes(`version ${legal.LEGAL_VERSION}`));
  assert.ok(text(terms.TERMS_SECTIONS).includes(`version ${legal.LEGAL_VERSION}`));
});

test("privacy: covers what a data-protection regime and the app stores ask for", () => {
  const all = text(privacy.PRIVACY_SECTIONS);
  for (const needle of [
    "Republic Act No. 10173",
    "National Privacy Commission",
    "Delete Account",
    "Children",
    "transparency",
    "legitimate purpose",
    "proportionality",
    "do not sell",
    "access",
    "erased or blocked",
    "kept until you remove it",
    "Unsplash",
  ]) {
    assert.ok(all.toLowerCase().includes(needle.toLowerCase()), `privacy policy never mentions "${needle}"`);
  }
});

test("privacy: its claims match the app", () => {
  const app = JSON.parse(fs.readFileSync("app.json", "utf8")).expo;
  assert.deepEqual(app.android.permissions, ["INTERNET"], "the policy says INTERNET is the only permission");
  const deps = Object.keys(JSON.parse(fs.readFileSync("package.json", "utf8")).dependencies);
  for (const sdk of deps.filter((d) => /analytics|sentry|firebase|amplitude|mixpanel|admob|ads|crashlytics|notifications/i.test(d))) {
    assert.fail(`the policy says there is no analytics, ads or notifications, but ${sdk} is installed`);
  }
  const wipe = fs.readFileSync("services/database.ts", "utf8");
  assert.ok(wipe.includes("deleteAccountData"), "Delete Account exists");
  assert.ok(fs.readFileSync("app/settings.tsx", "utf8").includes("AsyncStorage.clear()"), "Delete Account clears the settings storage");
});

test("terms: the feature list is current and the removed names are gone", () => {
  const all = text(terms.TERMS_SECTIONS);
  for (const lab of ["Radiation Shield", "Build an Atom", "Radioactive Decay"]) assert.ok(all.includes(lab), `terms never name ${lab}`);
  for (const old of ["Dose Visualizer", "Energy Showdown", "on-device leaderboard", "simulated"]) {
    assert.ok(!all.includes(old), `terms still mention "${old}"`);
  }
});

test("terms: the clauses a strong set of terms needs are there", () => {
  const all = text(terms.TERMS_SECTIONS).toLowerCase();
  for (const needle of [
    "license",
    "educational purpose and safety",
    "never try to obtain",
    "no cash value",
    "fictional",
    "as is",
    "limitation of liability",
    "governing law",
    "unenforceable",
    "feedback",
    "ending these terms",
    "changes to these terms",
  ]) {
    assert.ok(all.includes(needle), `terms never mention "${needle}"`);
  }
});

test("the contact line works with and without an address", () => {
  const line = legal.contactLine("privacy");
  assert.ok(line.length > 40);
  if (legal.LEGAL_CONTACT_EMAIL) assert.ok(line.includes(legal.LEGAL_CONTACT_EMAIL));
  else assert.ok(line.includes("app store"));
});
