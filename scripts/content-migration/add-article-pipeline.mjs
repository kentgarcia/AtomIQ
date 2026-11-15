#!/usr/bin/env node
/**
 * Article / research pipeline migration (spec §5.4). Idempotent and additive:
 *
 *   1. ALTER TABLE ... ADD COLUMN for the pipeline metadata on `articles` and
 *      `posts` (only the columns that are missing; nothing is dropped or rewritten).
 *   2. Honest backfill of the existing rows. Rows that already carry review
 *      metadata (source_type != '') are never touched, so later human edits survive.
 *
 * Why a plain migration script and not a runtime ALTER: content.db ships as a
 * read-only bundle and is re-copied onto the device whenever its content hash
 * (CONTENT_DB_VERSION, derived by scripts/sync-content.js) changes. User data
 * (profile, progress, bookmarks, activity) lives in separate local stores, so a
 * new bundle never touches it.
 *
 *   node --no-warnings scripts/content-migration/add-article-pipeline.mjs [--dry-run] [--db path]
 *
 * Does not run sync-content; the release step does.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

/** Date of the review/link check recorded by this backfill. */
const CHECKED_ON = "2026-11-14";

const SOURCE_TYPES = "'', 'government-agency', 'international-organization', 'research-institution', 'university', 'industry-association', 'standards-body', 'news-media', 'encyclopedia', 'textbook', 'other'";
const REVIEW_STATUSES = "'draft', 'needs-review', 'in-review', 'reviewed', 'outdated'";
const SUMMARY_ORIGINS = "'unknown', 'original', 'adapted', 'excerpt'";

/** Columns added to BOTH tables. */
const SHARED_COLUMNS = [
  ["source_type", `TEXT NOT NULL DEFAULT '' CHECK (source_type IN (${SOURCE_TYPES}))`],
  ["source_note", "TEXT NOT NULL DEFAULT ''"],
  ["source_published_date", "TEXT"],
  ["review_status", `TEXT NOT NULL DEFAULT 'needs-review' CHECK (review_status IN (${REVIEW_STATUSES}))`],
  ["last_reviewed", "TEXT NOT NULL DEFAULT ''"],
  ["reviewed_by", "TEXT"],
  ["review_notes", "TEXT"],
  ["summary_origin", `TEXT NOT NULL DEFAULT 'unknown' CHECK (summary_origin IN (${SUMMARY_ORIGINS}))`],
  ["related_lessons", "TEXT NOT NULL DEFAULT '[]' CONSTRAINT {t}_related_lessons_json CHECK (json_valid(related_lessons))"],
  ["related_concepts", "TEXT NOT NULL DEFAULT '[]' CONSTRAINT {t}_related_concepts_json CHECK (json_valid(related_concepts))"],
  ["related_elements", "TEXT NOT NULL DEFAULT '[]' CONSTRAINT {t}_related_elements_json CHECK (json_valid(related_elements))"],
];

/** Extra columns so feed posts carry the same reader metadata as articles. */
const POST_ONLY_COLUMNS = [
  ["read_time", "INTEGER NOT NULL DEFAULT 0"],
  ["difficulty", "TEXT CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced'))"],
  ["related_myths", "TEXT NOT NULL DEFAULT '[]' CONSTRAINT posts_related_myths_json CHECK (json_valid(related_myths))"],
];

// ---------------------------------------------------------------------------
// Backfill data. Nothing here claims a review that did not happen.
// ---------------------------------------------------------------------------

const EDITORIAL_AUTHOR = {
  name: "AtomIQ Editorial Team",
  avatar: "@/assets/images/mascot/profile.png",
  title: "Educational summary",
};

const GENERIC_HOMEPAGE_NOTE =
  "Source link is a site homepage, not the specific page the summary draws on. Find and link the exact page, re-check the facts, then mark reviewed.";

const articleBackfill = {
  "how-reactors-work": {
    source_type: "industry-association",
    source_note: "General nuclear-power background from the World Nuclear Association. AtomIQ's article is a plain-language summary written in its own words, not a copy of the source.",
    related_lessons: ["nuclear-fission", "nuclear-energy-explained"],
    related_concepts: ["nuclear-reactor", "control-rods", "moderator", "chain-reaction", "nuclear-fission"],
    related_elements: ["U"],
    review_notes: `${GENERIC_HOMEPAGE_NOTE} The previous byline ("Prof. James Anderson, Nuclear Engineer") was an unverified editorial persona and was replaced by the AtomIQ Editorial Team.`,
    legacyPersona: true,
  },
  "nuclear-history": {
    source_type: "industry-association",
    source_note: "Historical background from the World Nuclear Association. AtomIQ's timeline is a summary written in its own words.",
    related_lessons: ["history-of-nuclear-science", "meet-the-atom"],
    related_concepts: ["henri-becquerel", "marie-curie", "enrico-fermi", "otto-hahn", "nuclear-fission"],
    related_elements: ["U", "Ra", "Po"],
    review_notes: `${GENERIC_HOMEPAGE_NOTE} The previous byline ("Dr. Robert Kim, Nuclear Historian") was an unverified editorial persona and was replaced. Check every date in the timeline against a primary or encyclopedic source.`,
    legacyPersona: true,
  },
  "nuclear-vs-renewables": {
    source_type: "international-organization",
    source_note: "Climate-context reference: the Intergovernmental Panel on Climate Change (IPCC). The article is AtomIQ's own summary of the nuclear-and-renewables debate, not an IPCC text.",
    related_lessons: ["nuclear-energy-explained", "environmental-protection"],
    related_concepts: ["nuclear-reactor"],
    related_elements: ["Li"],
    review_notes: `${GENERIC_HOMEPAGE_NOTE} The article also takes an advocacy tone ("false choice", "partners, not rivals"); reword it neutrally or label it as opinion before release. Byline was an unverified persona ("Dr. Maria Rodriguez") and was replaced.`,
    legacyPersona: true,
  },
  "nuclear-waste-management": {
    source_type: "international-organization",
    source_note: "Waste-management background from the International Atomic Energy Agency (IAEA). AtomIQ's summary is written in its own words.",
    related_lessons: ["environmental-protection", "nuclear-policy"],
    related_myths: ["nuclear-waste-forever"],
    related_concepts: ["radioactive-waste", "spent-fuel", "low-level-waste", "vitrification"],
    related_elements: ["U", "Pu"],
    review_notes: `${GENERIC_HOMEPAGE_NOTE} Verify the waste-volume percentages quoted in the body. Byline was an unverified persona ("Dr. Lisa Park") and was replaced.`,
    legacyPersona: true,
  },
  "radiation-in-daily-life": {
    source_type: "international-organization",
    source_note: "Background-radiation context from UNSCEAR (UN Scientific Committee on the Effects of Atomic Radiation). AtomIQ's article is its own summary; it does not reproduce the report.",
    related_lessons: ["background-radiation", "measuring-radiation"],
    related_myths: ["all-radiation-manmade"],
    related_concepts: ["background-radiation", "cosmic-radiation", "radon", "ionizing-radiation"],
    related_elements: ["U", "K", "Th"],
    review_notes: `${GENERIC_HOMEPAGE_NOTE} The source name cites "UNSCEAR Report 2020"; confirm the exact report/chapter and the dose figures quoted. Byline was an unverified persona ("Dr. Sarah Chen") and was replaced.`,
    legacyPersona: true,
  },
};

const FEED_NOTE_COPIED =
  "Body text reads as copied or very lightly edited from the source. Rewrite as an original AtomIQ summary (or obtain permission) before this item is marked reviewed.";

const postBackfill = {
  "ai-cancer-treatment": { source_type: "international-organization", summary_origin: "excerpt", difficulty: "intermediate", related_concepts: ["x-ray"], note: "IAEA news item on AI-assisted radiotherapy contouring (ELAISA study).", review: `${FEED_NOTE_COPIED} Automated link check was blocked (HTTP 403) on ${CHECKED_ON}; open it manually.` },
  "nuclear-agriculture": { source_type: "government-agency", summary_origin: "excerpt", difficulty: "beginner", related_lessons: ["industrial-agricultural-uses"], related_myths: ["myths-facts-15"], note: "ANSTO (Australian Nuclear Science and Technology Organisation) educational page on nuclear science in food and agriculture.", review: FEED_NOTE_COPIED },
  "nuclear-fission-science": { source_type: "international-organization", summary_origin: "excerpt", difficulty: "beginner", related_lessons: ["nuclear-fission", "nuclear-energy-explained"], related_concepts: ["nuclear-fission", "nuclear-fusion"], related_elements: ["U", "Kr"], note: "IAEA explainer on what nuclear energy is.", review: `${FEED_NOTE_COPIED} Link check blocked (HTTP 403) on ${CHECKED_ON}.` },
  "nuclear-safety-stats": { source_type: "government-agency", summary_origin: "excerpt", difficulty: "intermediate", related_lessons: ["nuclear-safety-systems"], note: "Philippines Department of Energy briefing (PDF) on nuclear science and energy.", review: `${FEED_NOTE_COPIED} The source PDF did not respond on ${CHECKED_ON} (legacy.doe.gov.ph); the link may be dead. Locate a stable copy or replace the source. The headline claims about health burden need a citable figure.` },
  "nuclear-science": { source_type: "international-organization", summary_origin: "excerpt", difficulty: "beginner", related_lessons: ["history-of-nuclear-science"], note: "OECD Nuclear Energy Agency (NEA) overview page on nuclear science.", review: `${FEED_NOTE_COPIED} Link check blocked (HTTP 403) on ${CHECKED_ON}.` },
  "nutec-plastics": { source_type: "international-organization", summary_origin: "excerpt", difficulty: "intermediate", related_lessons: ["environmental-protection", "industrial-agricultural-uses"], note: "IAEA news item about the NUTEC Plastics forum in the Philippines.", review: `${FEED_NOTE_COPIED} Link check blocked (HTTP 403) on ${CHECKED_ON}; the source is a video page.` },
  "philippines-nuclear": { source_type: "government-agency", summary_origin: "excerpt", difficulty: "beginner", related_lessons: ["nuclear-policy"], note: "DOST-PNRI (Philippine Nuclear Research Institute) announcement of Atomic Energy Week.", review: `${FEED_NOTE_COPIED} The link is the PNRI homepage, not the announcement. Link check blocked (HTTP 403) on ${CHECKED_ON}. Event dates are time-limited; consider archiving this item.` },
  "radioisotopes-production": { source_type: "government-agency", summary_origin: "excerpt", difficulty: "intermediate", related_lessons: ["what-is-isotope", "medical-applications"], related_concepts: ["radionuclide", "cyclotron", "isotope"], related_elements: ["Mo", "F"], note: "ANSTO educational page on what radioisotopes are and how they are produced.", review: FEED_NOTE_COPIED },
};

const SCIENCEDAILY_REVIEW =
  "Short paraphrase of a university press release republished by ScienceDaily. ScienceDaily is a news aggregator, not a primary source: link the original paper or institution release, and confirm the claim before marking reviewed.";

const scienceDailyIds = [
  "tokamak-plasma-rotation-breakthrough",
  "spin-flip-solar-efficiency-breakthrough",
  "fusion-diagnostics-roadmap",
  "quantum-geometry-bends-electrons",
  "self-interacting-dark-matter-collapse",
  "nuclear-clock-jewelers-trick",
  "next-gen-dark-matter-detectors",
  "gravitational-waves-dark-matter-fingerprint",
  "fuze3-z-pinch-pressure-record",
  "quantum-circuits-nuclear-physics-scale",
  "dark-matter-fifth-force-test",
  "floating-raindrop-electricity-device",
];
for (const id of scienceDailyIds) {
  postBackfill[id] = {
    source_type: "news-media",
    summary_origin: "adapted",
    difficulty: "advanced",
    note: "ScienceDaily news summary of a university or lab press release; the named institution is the original source of the research.",
    review: SCIENCEDAILY_REVIEW,
    related_elements: id === "nuclear-clock-jewelers-trick" ? ["Th"] : undefined,
  };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA busy_timeout = 10000");
const log = [];
const columnsOf = (table) => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
const readingMinutes = (text) => Math.max(1, Math.ceil(String(text).trim().split(/\s+/).length / 200));
const json = (v) => JSON.stringify(v ?? []);

db.exec("BEGIN IMMEDIATE");
try {
  for (const table of ["articles", "posts"]) {
    const have = columnsOf(table);
    const wanted = [...SHARED_COLUMNS, ...(table === "posts" ? POST_ONLY_COLUMNS : [])];
    for (const [name, def] of wanted) {
      if (have.has(name)) continue;
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def.replaceAll("{t}", table)}`);
      log.push(`+ ${table}.${name}`);
    }
  }

  const now = Math.floor(Date.now() / 1000);

  const updateArticle = db.prepare(`
    UPDATE articles SET source_type = ?, source_note = ?, review_status = 'needs-review', last_reviewed = ?,
      review_notes = ?, summary_origin = ?, related_lessons = ?, related_concepts = ?, related_elements = ?,
      related_myths = ?, author = ?, updated_at = ?
    WHERE id = ? AND source_type = ''`);
  for (const [id, b] of Object.entries(articleBackfill)) {
    const row = db.prepare("SELECT related_myths FROM articles WHERE id = ?").get(id);
    if (!row) { log.push(`! articles/${id} not found`); continue; }
    const myths = [...new Set([...JSON.parse(row.related_myths || "[]"), ...(b.related_myths ?? [])])];
    const r = updateArticle.run(
      b.source_type, b.source_note, CHECKED_ON, b.review_notes, "original",
      json(b.related_lessons), json(b.related_concepts), json(b.related_elements), json(myths),
      JSON.stringify(EDITORIAL_AUTHOR), now, id,
    );
    log.push(`${r.changes ? "~" : "="} articles/${id}`);
  }

  const updatePost = db.prepare(`
    UPDATE posts SET source_type = ?, source_note = ?, review_status = 'needs-review', last_reviewed = ?,
      review_notes = ?, summary_origin = ?, related_lessons = ?, related_concepts = ?, related_elements = ?,
      related_myths = ?, read_time = ?, difficulty = ?, updated_at = ?
    WHERE id = ? AND source_type = ''`);
  for (const [id, b] of Object.entries(postBackfill)) {
    const row = db.prepare("SELECT content FROM posts WHERE id = ?").get(id);
    if (!row) { log.push(`! posts/${id} not found`); continue; }
    const r = updatePost.run(
      b.source_type, b.note, CHECKED_ON, b.review, b.summary_origin,
      json(b.related_lessons), json(b.related_concepts), json(b.related_elements), json(b.related_myths),
      readingMinutes(row.content), b.difficulty, now, id,
    );
    log.push(`${r.changes ? "~" : "="} posts/${id}`);
  }

  const orphanPosts = db.prepare("SELECT id FROM posts WHERE source_type = ''").all();
  const orphanArticles = db.prepare("SELECT id FROM articles WHERE source_type = ''").all();
  for (const r of [...orphanPosts, ...orphanArticles]) log.push(`? no backfill entry for ${r.id}; validate:content will flag it`);

  if (dryRun) db.exec("ROLLBACK");
  else db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  console.error(`Migration aborted, nothing written: ${error.message}`);
  process.exit(1);
}

console.log(log.join("\n"));
console.log(`\n${dryRun ? "[dry-run] " : ""}article pipeline migration done (${dbPath}).`);
