/**
 * Content validation engine (shared by `npm run validate:content` and Content Studio).
 *
 * Read-only against the database handed in. Studio calls this inside an open
 * transaction so it validates an edit before it is committed.
 *
 * Rules live in scripts/lib/content-rules.mjs; see docs/CONTENT_QUESTION_QUALITY.md.
 */

import {
  checkPlaceholders,
  checkPunctuation,
  checkQuestion,
  checkStatement,
  findConflictingDuplicates,
} from "./content-rules.mjs";
import { validateCurriculum } from "./curriculum-rules.mjs";
import { validateChat } from "./chat-rules.mjs";
import { validateScan } from "./scan-rules.mjs";
import { validateSafety } from "./safety-rules.mjs";
import { validateMap } from "./map-rules.mjs";
import { validateFeed } from "./feed-rules.mjs";
import { findInvalidIcons } from "./icon-names.mjs";
import { getStepVisuals, validateVisualBlock } from "../../content/visual-blocks.ts";

/**
 * @param {import("node:sqlite").DatabaseSync} db
 * @param {{ strictReview?: boolean, shipped?: Record<string,string[]>, retired?: Record<string,Record<string,string>> }} [options]
 *   strictReview: unverified content references are errors (publish gate).
 *   shipped/retired: ids that have shipped to users and ids deliberately retired (spec §3.5).
 * @returns {{ checked: Record<string, number>, errors: any[], warnings: any[], findings: any[] }}
 */
export function validateDatabase(db, { strictReview = false, shipped = {}, retired = {} } = {}) {
  const tableExists = (name) =>
    !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);

  const parseJson = (raw, fallback) => {
    try {
      return raw === null || raw === undefined || raw === "" ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  /** @type {Array<{table: string, id: string, field: string, rule: string, severity: string, message: string, text?: string}>} */
  const findings = [];
  /** counts per surface */
  const checked = new Map();
  const bump = (surface) => checked.set(surface, (checked.get(surface) ?? 0) + 1);

  function record(table, id, results, text) {
    for (const r of results) {
      findings.push({ table, id, field: r.field, rule: r.rule, severity: r.severity, message: r.message, text });
    }
  }

  const isTrueFalseOptions = (options) =>
    Array.isArray(options) &&
    options.length === 2 &&
    String(options[0]).trim().toLowerCase() === "true" &&
    String(options[1]).trim().toLowerCase() === "false";

  const conflictPool = []; // stems across surfaces for cross-pool conflict detection

  function addConflictCandidate(id, text, options, correct) {
    if (!Array.isArray(options) || typeof correct !== "number" || !options[correct]) return;
    conflictPool.push({ id, text, options: options.map(String), correct });
  }

  // ---------------------------------------------------------------------------
  // quiz_questions
  // ---------------------------------------------------------------------------
  if (tableExists("quiz_questions")) {
    for (const row of db.prepare("SELECT * FROM quiz_questions ORDER BY quiz_id, position").all()) {
      bump("quiz_questions");
      const options = parseJson(row.options, null);
      const correct = parseJson(row.correct_answer, row.correct_answer);
      const id = `${row.quiz_id}/${row.id}`;
      record(
        "quiz_questions",
        id,
        checkQuestion({
          kind: row.type,
          text: row.question,
          options: options ?? undefined,
          correct,
          explanation: row.explanation,
          hasVisual: !!row.image,
          shuffled: false,
        }),
        row.question,
      );
      if (row.type === "multiple_choice") addConflictCandidate(`quiz_questions:${id}`, row.question, options, correct);
    }
  }

  // ---------------------------------------------------------------------------
  // mythbuster_questions (options are shuffled at runtime)
  // ---------------------------------------------------------------------------
  if (tableExists("mythbuster_questions")) {
    for (const row of db.prepare("SELECT * FROM mythbuster_questions ORDER BY difficulty, position").all()) {
      bump("mythbuster_questions");
      const options = parseJson(row.options, null);
      const correct = parseJson(row.correct_answer, row.correct_answer);
      record(
        "mythbuster_questions",
        row.id,
        checkQuestion({
          kind: row.type,
          text: row.question,
          options: options ?? undefined,
          correct,
          explanation: row.explanation,
          shuffled: true,
        }),
        row.question,
      );
      if (row.type === "multiple_choice") addConflictCandidate(`mythbuster_questions:${row.id}`, row.question, options, correct);
    }
  }

  // ---------------------------------------------------------------------------
  // lesson_steps
  // ---------------------------------------------------------------------------
  const visualIds = new Map(); // block id -> where it first appeared
  const VISUAL_KEYS = ["image", "visual", "visuals", "blocks", "media", "diagram", "figure"];
  const hasVisualData = (data) => VISUAL_KEYS.some((k) => data[k]);

  if (tableExists("lesson_steps")) {
    for (const row of db.prepare("SELECT * FROM lesson_steps ORDER BY lesson_id, position").all()) {
      const data = parseJson(row.data, {});
      const id = `${row.lesson_id}/${row.id}`;
      bump(`lesson_steps:${row.step_type}`);
      // Structured visual blocks (docs/completed/VISUAL_LESSON_BLOCKS.md): required fields, sources, unique ids.
      getStepVisuals(data).forEach((block, i) => {
        bump("visual_blocks");
        const verdict = validateVisualBlock(block);
        const field = `visuals[${i}]`;
        for (const message of verdict.errors) {
          findings.push({ table: "lesson_steps", id, field, rule: "visual-block", severity: "error", message });
        }
        for (const message of verdict.warnings) {
          findings.push({ table: "lesson_steps", id, field, rule: "visual-block", severity: "warning", message });
        }
        const blockId = block && typeof block === "object" ? block.id : undefined;
        if (typeof blockId === "string") {
          if (visualIds.has(blockId)) {
            findings.push({ table: "lesson_steps", id, field, rule: "visual-block-id", severity: "error", message: `visual id "${blockId}" is already used in ${visualIds.get(blockId)}` });
          } else visualIds.set(blockId, id);
        }
      });
      switch (row.step_type) {
        case "assessment": {
          const options = Array.isArray(data.options) ? data.options : undefined;
          // Lesson assessments always store a numeric option index (True/False is options[0]/options[1]).
          record(
            "lesson_steps",
            id,
            checkQuestion({
              kind: isTrueFalseOptions(options) ? "true_false" : "multiple_choice",
              text: data.question,
              options,
              correct: data.correctIndex,
              explanation: data.explanation,
              hasVisual: hasVisualData(data),
              shuffled: false,
            }),
            data.question,
          );
          if (!isTrueFalseOptions(options)) addConflictCandidate(`lesson_steps:${id}`, data.question, options, data.correctIndex);
          break;
        }
        case "lab": {
          record(
            "lesson_steps",
            id,
            checkQuestion({
              kind: "lab",
              text: data.task,
              textField: "task",
              options: data.options,
              correct: data.correctAnswer,
              explanation: data.explanation,
              hasVisual: hasVisualData(data),
              shuffled: false,
            }),
            data.task,
          );
          // The lab description is the on-screen scenario; check it for placeholders/punctuation only.
          if (data.description !== undefined) {
            record("lesson_steps", id, [...checkPlaceholders(data.description, "description"), ...checkPunctuation(data.description, "description")], data.description);
          }
          break;
        }
        case "myth_buster": {
          for (const field of ["myth", "reality"]) {
            record("lesson_steps", id, checkStatement(data[field], field), data[field]);
          }
          if (data.explanation !== undefined) {
            record("lesson_steps", id, [...checkPlaceholders(data.explanation, "explanation"), ...checkPunctuation(data.explanation, "explanation")], data.explanation);
          }
          break;
        }
        case "micro_learn":
        case "briefing":
        case "debrief": {
          const texts = [];
          for (const [key, value] of Object.entries(data)) {
            if (typeof value === "string") texts.push([key, value]);
            if (Array.isArray(value)) value.forEach((v, i) => typeof v === "string" && texts.push([`${key}[${i}]`, v]));
          }
          for (const [key, value] of texts) {
            if (["icon", "image", "mission"].includes(key)) continue;
            record("lesson_steps", id, checkPlaceholders(value, key), value);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // myths (Myth-or-Fact statements)
  // ---------------------------------------------------------------------------
  if (tableExists("myths")) {
    for (const row of db.prepare("SELECT * FROM myths ORDER BY id").all()) {
      bump("myths");
      record("myths", row.id, checkStatement(row.myth_statement, "myth_statement"), row.myth_statement);
      record("myths", row.id, checkStatement(row.reality, "reality"), row.reality);
      record("myths", row.id, checkPlaceholders(row.title, "title"), row.title);
    }
  }

  // ---------------------------------------------------------------------------
  // Cross-pool conflicts: same stem, different answers.
  // ---------------------------------------------------------------------------
  for (const { a, b } of findConflictingDuplicates(conflictPool)) {
    const [table, ...rest] = a.id.split(":");
    findings.push({
      table,
      id: rest.join(":"),
      field: "question",
      rule: "conflicting-duplicate",
      severity: "error",
      message: `marks "${a.options[a.correct]}" correct, but ${b.id} lists it as a wrong answer for the same question`,
      text: a.text,
    });
  }

  // -------------------------------------------------------------------------
  // Curriculum v2: units, lessons made of cards, the item bank, references.
  // -------------------------------------------------------------------------
  const curriculum = validateCurriculum(db, { strictReview });
  for (const [surface, n] of Object.entries(curriculum.checked)) checked.set(surface, (checked.get(surface) ?? 0) + n);
  findings.push(...curriculum.findings);

  // -------------------------------------------------------------------------
  // NPC feed and mini blog (docs/NPC_FEED_SPEC.md §6): templates, pieces, comments.
  // -------------------------------------------------------------------------
  const feed = validateFeed(db, { strictReview });
  for (const [surface, n] of Object.entries(feed.checked)) checked.set(surface, (checked.get(surface) ?? 0) + n);
  findings.push(...feed.findings);

  // -------------------------------------------------------------------------
  // NPC chats (docs/PHONE_SPEC.md §5.2): the teachers' threads on the phone.
  // -------------------------------------------------------------------------
  const chat = validateChat(db);
  for (const [surface, n] of Object.entries(chat.checked)) checked.set(surface, (checked.get(surface) ?? 0) + n);
  findings.push(...chat.findings);

  // -------------------------------------------------------------------------
  // Atom Scanner (docs/PHONE_SPEC.md §8): targets, their elements and their sources.
  // -------------------------------------------------------------------------
  const scan = validateScan(db, { strictReview });
  for (const [surface, n] of Object.entries(scan.checked)) checked.set(surface, (checked.get(surface) ?? 0) + n);
  findings.push(...scan.findings);

  // Safety Guide cards and Nuclear Map sites (docs/PHONE_SPEC.md §5.9, §5.8): sourced, and every source checked by a person at the publish gate.
  for (const part of [validateSafety(db, { strictReview }), validateMap(db, { strictReview })]) {
    for (const [surface, n] of Object.entries(part.checked)) checked.set(surface, (checked.get(surface) ?? 0) + n);
    findings.push(...part.findings);
  }

  // -------------------------------------------------------------------------
  // unit_statements (Myth Buster, Quick Play): a unit's deck of myth-or-fact statements.
  // -------------------------------------------------------------------------
  if (tableExists("unit_statements")) {
    const QUICK_PLAY_DECK = 10; // Quick Play asks the whole deck
    const unitIds = new Set(tableExists("units") ? db.prepare("SELECT id FROM units").all().map((r) => r.id) : []);
    const perUnit = new Map();
    const stmt = (row, field, rule, severity, message) => findings.push({ table: "unit_statements", id: row.id, field, rule, severity, message, text: row.statement });
    for (const row of db.prepare("SELECT * FROM unit_statements ORDER BY unit_id, position").all()) {
      bump("unit_statements");
      perUnit.set(row.unit_id, (perUnit.get(row.unit_id) ?? []).concat(row));
      if (!unitIds.has(row.unit_id)) stmt(row, "unit_id", "statement-unit", "error", "the unit does not exist");
      const text = String(row.statement ?? "").trim();
      if (!text) stmt(row, "statement", "statement-text", "error", "the statement is required");
      else if (text.length > 160) stmt(row, "statement", "statement-length", "warning", `a statement fits on a swipe card: 160 characters or fewer (this is ${text.length})`);
      if (!String(row.explanation ?? "").trim()) stmt(row, "explanation", "statement-explanation", "warning", "say why it is a myth or a fact");
    }
    for (const unitId of unitIds) {
      const rows = perUnit.get(unitId) ?? [];
      const id = rows[0]?.id ?? unitId;
      const unit = (field, rule, severity, message) => findings.push({ table: "unit_statements", id, field, rule, severity, message });
      if (rows.length !== QUICK_PLAY_DECK) unit("unit_id", "unit-deck-size", "warning", `unit "${unitId}" has ${rows.length} statement(s); Quick Play asks ${QUICK_PLAY_DECK}`);
      if (rows.length > 0 && !rows.some((r) => r.verdict === "myth")) unit("verdict", "unit-deck-mix", "warning", `unit "${unitId}" has no myth`);
      if (rows.length > 0 && !rows.some((r) => r.verdict === "fact")) unit("verdict", "unit-deck-mix", "warning", `unit "${unitId}" has no fact`);
    }
  }

  // -------------------------------------------------------------------------
  // Icons: every icon name in content must be an installed Iconsax export.
  // -------------------------------------------------------------------------
  const iconTables = ["lesson_steps", "myths", "encyclopedia_entries", "quizzes", "quiz_questions", "lessons", "units", "lesson_cards", "items"].filter(tableExists);
  for (const hit of findInvalidIcons(db, iconTables)) {
    findings.push({ table: hit.table, id: hit.id, field: hit.field, rule: "invalid-icon", severity: "error", message: `"${hit.name}" is not an installed Iconsax icon` });
  }

  // -------------------------------------------------------------------------
  // Id stability: an id that has shipped may not disappear unless it is retired.
  // User state (bookmarks, progress) and other content refer to these ids.
  // -------------------------------------------------------------------------
  for (const [table, ids] of Object.entries(shipped)) {
    if (!tableExists(table)) continue;
    const present = new Set(db.prepare(`SELECT id FROM ${table}`).all().map((r) => r.id));
    for (const id of ids) {
      if (present.has(id) || retired[table]?.[id]) continue;
      findings.push({
        table,
        id,
        field: "id",
        rule: "shipped-id-missing",
        severity: "error",
        message: `id shipped in an earlier release but is missing; restore it or add it to content/retired-ids.json with a reason`,
      });
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity !== "error");
  return { checked: Object.fromEntries(checked), errors, warnings, findings };
}
