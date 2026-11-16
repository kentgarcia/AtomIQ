/**
 * Content validation engine (shared by `npm run validate:content` and Content Studio).
 *
 * Read-only against the database handed in. Studio calls this inside an open
 * transaction so it validates an edit before it is committed.
 *
 * Rules live in scripts/lib/content-rules.mjs; see docs/CONTENT_QUESTION_QUALITY.md.
 */

import {
  checkArticle,
  checkPlaceholders,
  checkPunctuation,
  checkQuestion,
  checkStatement,
  findConflictingDuplicates,
} from "./content-rules.mjs";
import { validateCurriculum } from "./curriculum-rules.mjs";
import { findInvalidIcons } from "./icon-names.mjs";
import { getStepVisuals, validateVisualBlock } from "../../content/visual-blocks.ts";

/**
 * @param {import("node:sqlite").DatabaseSync} db
 * @param {{ strictReview?: boolean, shipped?: Record<string,string[]>, retired?: Record<string,Record<string,string>> }} [options]
 *   strictReview: every article/post must be review_status = reviewed.
 *   shipped/retired: ids that have shipped to users and ids deliberately retired (spec §3.5).
 * @returns {{ checked: Record<string, number>, errors: any[], warnings: any[], findings: any[] }}
 */
export function validateDatabase(db, { strictReview = false, shipped = {}, retired = {} } = {}) {
  const tableExists = (name) =>
    !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  const columnsOf = (table) => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));

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
  // mythbuster_questions (also feeds Atom Maze boss + endless mode, which shuffle options)
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
  // Atom Maze: rooms + boss
  // ---------------------------------------------------------------------------
  function checkBattleQuestion(table, id, q, index) {
    const field = `questions[${index}]`;
    if (!q || typeof q !== "object") {
      record(table, id, [{ rule: "options-shape", field, severity: "error", message: "is not an object" }]);
      return;
    }
    const prefix = (results) => results.map((r) => ({ ...r, field: `${field}.${r.field}` }));
    if (q.type === "scramble") {
      record(table, id, prefix(checkQuestion({ kind: "scramble", text: q.question, correct: q.answer, textField: "question" })), q.question);
      return;
    }
    if (q.type !== "quiz") {
      record(table, id, [{ rule: "options-shape", field: `${field}.type`, severity: "error", message: `unknown question type ${JSON.stringify(q.type)}` }]);
      return;
    }
    // Maze quiz questions have no stored explanation (the room explanation is shown after the fight).
    record(
      table,
      id,
      prefix(
        checkQuestion({
          kind: "multiple_choice",
          text: q.question,
          options: q.options,
          correct: q.correctAnswer,
          explanationOptional: true,
          shuffled: true,
        }),
      ),
      q.question,
    );
    addConflictCandidate(`${table}:${id}:${index}`, q.question, q.options, q.correctAnswer);
  }

  if (tableExists("maze_rooms")) {
    for (const row of db.prepare("SELECT * FROM maze_rooms ORDER BY maze_id, position").all()) {
      const id = `${row.maze_id}/${row.id}`;
      bump("maze_rooms");
      const questions = parseJson(row.questions, []);
      if (!Array.isArray(questions) || questions.length === 0) {
        record("maze_rooms", id, [{ rule: "options-shape", field: "questions", severity: "error", message: "room has no questions" }]);
      }
      (Array.isArray(questions) ? questions : []).forEach((q, i) => checkBattleQuestion("maze_rooms", id, q, i));
      // Post-fight explanation is learner-facing text too.
      record("maze_rooms", id, [...checkPlaceholders(row.explanation, "explanation"), ...checkPunctuation(row.explanation, "explanation")], row.explanation);
    }
  }

  if (tableExists("mazes")) {
    for (const row of db.prepare("SELECT * FROM mazes ORDER BY id").all()) {
      bump("mazes");
      const boss = parseJson(row.boss, {});
      // Boss questions are drawn from mythbuster_questions at runtime; validate any inline ones too.
      if (Array.isArray(boss.questions)) boss.questions.forEach((q, i) => checkBattleQuestion("mazes", `${row.id}/boss`, q, i));
      record("mazes", row.id, [...checkPlaceholders(row.description, "description"), ...checkPunctuation(row.description, "description")], row.description);
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

  // ---------------------------------------------------------------------------
  // Articles / posts (research pipeline)
  // ---------------------------------------------------------------------------
  const lessonIds = new Set(tableExists("lessons") ? db.prepare("SELECT id FROM lessons").all().map((r) => r.id) : []);
  const mythIds = new Set(tableExists("myths") ? db.prepare("SELECT id FROM myths").all().map((r) => r.id) : []);
  const entryIds = new Set(tableExists("encyclopedia_entries") ? db.prepare("SELECT id FROM encyclopedia_entries").all().map((r) => r.id) : []);
  // Local calendar date (UTC can lag a day behind for contributors east of Greenwich).
  const nowLocal = new Date();
  const today = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, "0")}-${String(nowLocal.getDate()).padStart(2, "0")}`;

  for (const table of ["articles", "posts"]) {
    if (!tableExists(table)) continue;
    const cols = columnsOf(table);
    for (const row of db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()) {
      bump(table);
      const parsed = {
        ...row,
        author: parseJson(row.author, {}),
        related_lessons: parseJson(row.related_lessons ?? "[]", "invalid"),
        related_myths: parseJson(row.related_myths ?? "[]", "invalid"),
        related_concepts: parseJson(row.related_concepts ?? "[]", "invalid"),
        related_elements: parseJson(row.related_elements ?? "[]", "invalid"),
      };
      if (!cols.has("source_type")) {
        record(table, row.id, [{ rule: "article-metadata", field: "source_type", severity: "error", message: "schema is missing the article pipeline columns (source_type, review_status, ...)" }]);
        continue;
      }
      record(table, row.id, checkArticle(parsed, { today, lessonIds, mythIds, entryIds }), row.title);
      if (strictReview && row.review_status !== "reviewed") {
        record(table, row.id, [{ rule: "review-pending", field: "review_status", severity: "error", message: `status is "${row.review_status}"; --strict-review requires "reviewed"` }], row.title);
      }
    }
  }


  // -------------------------------------------------------------------------
  // Curriculum v2: units, lessons made of cards, the item bank, references.
  // -------------------------------------------------------------------------
  const curriculum = validateCurriculum(db, { strictReview });
  for (const [surface, n] of Object.entries(curriculum.checked)) checked.set(surface, (checked.get(surface) ?? 0) + n);
  findings.push(...curriculum.findings);

  // -------------------------------------------------------------------------
  // Icons: every icon name in content must be an installed Iconsax export.
  // -------------------------------------------------------------------------
  const iconTables = ["lesson_steps", "mazes", "maze_rooms", "myths", "encyclopedia_entries", "articles", "posts", "quizzes", "quiz_questions", "lessons", "units", "lesson_cards", "items"].filter(tableExists);
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
