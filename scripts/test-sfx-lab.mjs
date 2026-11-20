/**
 * The SFX lab's data (components/dev/sfx-lab-data.ts) against the files, the catalog and the spec
 * (docs/features/SFX_EXPANSION_SPEC.md). Run: npm run test:sfx-lab
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { LAB_AREAS, LAB_DECISIONS, LAB_MOMENTS, LAB_TARGET_DB, labFiles, labTargetFor, variantLength } from "../components/dev/sfx-lab-data.ts";
import { CUES, SFX_FILES } from "../services/sfx-core.ts";

const ROOT = process.cwd();
const AUDITION = path.join(ROOT, "assets", "sfx", "audition");
const SPEC = fs.readFileSync(path.join(ROOT, "docs", "features", "SFX_EXPANSION_SPEC.md"), "utf8");
const SOURCES = fs.readFileSync(path.join(ROOT, "components", "dev", "sfx-lab-sources.ts"), "utf8");

/** Milliseconds of a 16-bit mono WAV. */
const wavMs = (file) => {
  const buf = fs.readFileSync(file);
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === "data") return Math.round((size / 2 / 44100) * 1000);
    pos += 8 + size + (size % 2);
  }
  throw new Error(`${file}: no data chunk`);
};

describe("moments", () => {
  it("have unique ids, a known area and at least one variant", () => {
    const seen = new Set();
    for (const m of LAB_MOMENTS) {
      assert.ok(!seen.has(m.id), `duplicate id ${m.id}`);
      seen.add(m.id);
      assert.ok(LAB_AREAS.includes(m.area), `${m.id}: unknown area ${m.area}`);
      assert.ok(m.variants.length >= 1, `${m.id}: no variants`);
      assert.ok(m.volume > 0 && m.volume <= 1, `${m.id}: volume ${m.volume}`);
      assert.ok(m.category in LAB_TARGET_DB, `${m.id}: category ${m.category}`);
      assert.ok(m.title && m.where, `${m.id}: needs a title and a where`);
    }
  });

  it("name real cues in today and in cue steps", () => {
    for (const m of LAB_MOMENTS) {
      if (m.today) assert.ok(m.today in CUES, `${m.id}: today ${m.today} is not a cue`);
      for (const v of m.variants) for (const s of v.steps) if (s.cue) assert.ok(s.cue in CUES, `${m.id}: cue ${s.cue}`);
    }
  });

  it("give every step exactly one source and sane numbers", () => {
    for (const m of LAB_MOMENTS) {
      for (const v of m.variants) {
        assert.ok(v.steps.length >= 1, `${m.id}: an empty variant`);
        for (const s of v.steps) {
          assert.equal(Boolean(s.file) !== Boolean(s.cue), true, `${m.id}: a step needs a file or a cue, not both`);
          assert.ok((s.at ?? 0) >= 0 && (s.at ?? 0) < 6000, `${m.id}: at ${s.at}`);
          assert.ok((s.rate ?? 1) >= 0.5 && (s.rate ?? 1) <= 2, `${m.id}: rate ${s.rate}`);
          assert.ok((s.volume ?? 1) > 0 && (s.volume ?? 1) <= 2, `${m.id}: volume ${s.volume}`);
        }
      }
    }
  });

  it("have a spec entry each", () => {
    for (const m of LAB_MOMENTS) assert.ok(SPEC.includes(`\`${m.id}\``), `docs/features/SFX_EXPANSION_SPEC.md never mentions \`${m.id}\``);
  });
});

describe("decisions", () => {
  const byId = new Map(LAB_MOMENTS.map((m) => [m.id, m]));

  it("name a real moment, and every moment has one except those still open on purpose", () => {
    for (const id of Object.keys(LAB_DECISIONS)) assert.ok(byId.has(id), `decision for unknown moment ${id}`);
    for (const m of LAB_MOMENTS) assert.ok(m.id in LAB_DECISIONS, `${m.id} has no decision (use pick: "open" to leave it open)`);
  });

  it("pick a variant that exists, or keep today only where something plays today", () => {
    for (const [id, d] of Object.entries(LAB_DECISIONS)) {
      const m = byId.get(id);
      if (typeof d.pick === "number") {
        assert.ok(Number.isInteger(d.pick) && d.pick >= 0 && d.pick < m.variants.length, `${id}: pick ${d.pick} is out of range`);
        assert.ok(((d.rate ?? 1) >= 0.5) && ((d.rate ?? 1) <= 2), `${id}: rate ${d.rate}`);
      } else {
        assert.ok(["today", "none", "open"].includes(d.pick), `${id}: pick ${d.pick}`);
        if (d.pick === "today") assert.ok(m.today, `${id}: keeps today but nothing plays today`);
      }
    }
  });
});

describe("audition files", () => {
  const names = labFiles();

  it("exist for every candidate, and nothing else is in the folder", () => {
    const onDisk = fs.readdirSync(AUDITION).filter((f) => f.endsWith(".wav")).map((f) => f.slice(0, -4)).sort();
    assert.deepEqual(onDisk, names);
  });

  it("are all required by the generated sources file, with their true length", () => {
    for (const name of names) {
      const m = new RegExp(`"${name}": \\{ source: require\\("\\.\\./\\.\\./assets/sfx/audition/${name}\\.wav"\\), ms: (\\d+) \\}`).exec(SOURCES);
      assert.ok(m, `${name} is missing from sfx-lab-sources.ts (run node scripts/prepare-audition-sfx.mjs)`);
      assert.ok(Math.abs(Number(m[1]) - wavMs(path.join(AUDITION, `${name}.wav`))) <= 2, `${name}: length in sfx-lab-sources.ts is stale`);
    }
    const required = [...SOURCES.matchAll(/^  "([^"]+)": \{ source:/gm)].map((m) => m[1]).sort();
    assert.deepEqual(required, names);
  });

  it("are cut with stopAfter only within their length", () => {
    for (const m of LAB_MOMENTS) {
      for (const v of m.variants) {
        for (const s of v.steps) {
          if (s.file && s.stopAfter !== undefined) assert.ok(s.stopAfter <= wavMs(path.join(AUDITION, `${s.file}.wav`)), `${m.id}: ${s.file} stopAfter ${s.stopAfter}`);
        }
      }
    }
  });

  it("get the loudest target of the roles they are used in", () => {
    assert.equal(labTargetFor("UI_Phone_Start_1"), LAB_TARGET_DB.stinger);
    assert.equal(labTargetFor("UI_Tab_R"), LAB_TARGET_DB.feedback);
  });
});

describe("variant length", () => {
  it("is the last step's start plus its file, cut by stopAfter", () => {
    const lengthOf = () => 1000;
    assert.equal(variantLength({ steps: [{ file: "a" }, { file: "b", at: 400 }] }, lengthOf), 1400);
    assert.equal(variantLength({ steps: [{ file: "a", stopAfter: 300 }] }, lengthOf), 300);
  });

  it("can be measured for every variant of every moment", () => {
    for (const m of LAB_MOMENTS) {
      for (const v of m.variants) {
        const ms = variantLength(v, (s) => (s.cue ? SFX_FILES[CUES[s.cue].file] : wavMs(path.join(AUDITION, `${s.file}.wav`))));
        assert.ok(ms > 0, `${m.id}: a variant of length 0`);
      }
    }
  });
});
