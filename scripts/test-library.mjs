import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const lib = await import(pathToFileURL(path.resolve("services/library-core.ts")).href);

const refs = [
  { id: "r-iaea", kind: "official", publisher: "IAEA", title: "Radiation basics", year: "2020", url: "https://www.iaea.org/radiation/", verified: true },
  { id: "r-epa", kind: "official", publisher: "EPA", title: "Radiation sources", year: "", url: "https://epa.gov/radiation", verified: false },
  { id: "r-book", kind: "textbook", publisher: "OpenStax", title: "Atoms", year: "2016", url: "https://openstax.org/atoms", verified: true },
];
const links = [
  { refId: "r-iaea", kind: "unit", label: "Radioactivity", unitId: "radioactivity" },
  { refId: "r-iaea", kind: "lesson", label: "Dose", unitId: "radioactivity" },
  { refId: "r-book", kind: "lesson", label: "Atoms everywhere", unitId: "inside-the-atom" },
  { refId: "r-epa", kind: "blog", label: "Background", unitId: null },
  { refId: "ghost", kind: "unit", label: "Nothing", unitId: "radioactivity" },
];
const entrySources = [
  { entryId: "e1", entryTerm: "Radiation", title: "IAEA page again", url: "http://iaea.org/radiation", author: "", type: "official" },
  { entryId: "e2", entryTerm: "Quark", title: "What is a quark", url: "https://example.org/quark#top", author: "CERN", type: "article" },
  { entryId: "e3", entryTerm: "Quark", title: "What is a quark", url: "https://example.org/quark/", author: "CERN", type: "article" },
  { entryId: "e4", entryTerm: "Empty", title: "", url: "https://x.org", author: "", type: "article" },
];
const units = [
  { id: "radioactivity", title: "Radioactivity", position: 2 },
  { id: "inside-the-atom", title: "Inside the Atom", position: 1 },
  { id: "unit-3", title: "Unit 3", position: 3 },
];

test("urls that point at the same page are the same url", () => {
  assert.equal(lib.normalizeUrl("https://www.IAEA.org/radiation/#top"), "iaea.org/radiation");
  assert.equal(lib.normalizeUrl("http://iaea.org/radiation"), "iaea.org/radiation");
  assert.equal(lib.normalizeUrl("  "), "");
});

test("the library merges references, their citations and AtomDex sources, once per url", () => {
  const all = lib.buildLibrary({ references: refs, links, entrySources });
  assert.deepEqual(all.map((r) => r.id).sort(), ["r-book", "r-epa", "r-iaea", "src:example.org/quark"]);
  assert.equal(all.length, 4);
  const iaea = all.find((r) => r.id === "r-iaea");
  assert.deepEqual(iaea.citedBy, ["Unit: Radioactivity", "Lesson: Dose", "AtomDex: Radiation"]);
  assert.deepEqual(iaea.unitIds, ["radioactivity"]);
  const quark = all.find((r) => r.id === "src:example.org/quark");
  assert.deepEqual(quark.citedBy, ["AtomDex: Quark"]);
  assert.equal(quark.publisher, "CERN");
  assert.equal(quark.verified, false);
});

test("a link to a reference that does not exist, and a source with no title, are skipped", () => {
  const all = lib.buildLibrary({ references: refs, links, entrySources });
  assert.ok(!all.some((r) => r.citedBy.includes("Unit: Nothing")));
  assert.ok(!all.some((r) => r.url === "https://x.org"));
});

test("an AtomDex source with no author is credited to its site", () => {
  const all = lib.buildLibrary({ references: [], links: [], entrySources: [{ entryId: "e", entryTerm: "T", title: "A page", url: "https://www.example.com/a/b", author: "", type: "article" }] });
  assert.equal(all[0].publisher, "example.com");
});

test("the list is A to Z by title", () => {
  const all = lib.buildLibrary({ references: refs, links, entrySources });
  assert.deepEqual(all.map((r) => r.title), ["Atoms", "Radiation basics", "Radiation sources", "What is a quark"]);
});

test("by unit: the path's order, then what no unit cites, empty units left out", () => {
  const all = lib.buildLibrary({ references: refs, links, entrySources });
  const sections = lib.groupByUnit(all, units);
  assert.deepEqual(sections.map((s) => s.title), ["Inside the Atom", "Radioactivity", "More sources"]);
  assert.deepEqual(sections[0].refs.map((r) => r.id), ["r-book"]);
  assert.deepEqual(sections[2].refs.map((r) => r.id).sort(), ["r-epa", "src:example.org/quark"]);
});

test("all: one section, or none when there is nothing", () => {
  assert.equal(lib.allSection([]).length, 0);
  const all = lib.buildLibrary({ references: refs, links, entrySources });
  assert.equal(lib.allSection(all)[0].refs.length, 4);
});

test("filtering looks in the title, the publisher and what cites it", () => {
  const all = lib.buildLibrary({ references: refs, links, entrySources });
  assert.deepEqual(lib.filterRefs(all, "openstax").map((r) => r.id), ["r-book"]);
  assert.deepEqual(lib.filterRefs(all, "dose").map((r) => r.id), ["r-iaea"]);
  assert.equal(lib.filterRefs(all, "").length, 4);
  assert.equal(lib.filterRefs(all, "zzz").length, 0);
});

test("labels", () => {
  assert.equal(lib.sourceLine({ publisher: "IAEA", year: "2020", kind: "official" }), "IAEA · 2020 · Official");
  assert.equal(lib.sourceLine({ publisher: "EPA", year: "", kind: "weird" }), "EPA · Source");
  assert.equal(lib.verifiedLabel(true), "Verified");
  assert.equal(lib.verifiedLabel(false), "Unchecked");
  assert.equal(lib.citedByLine([]), "");
  assert.equal(lib.citedByLine(["a", "b"]), "a, b");
  assert.equal(lib.citedByLine(["a", "b", "c", "d"]), "a, b +2 more");
});
