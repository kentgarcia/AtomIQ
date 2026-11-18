/**
 * Curriculum v2 validation (docs/LESSON_RESTRUCTURE_SPEC.md §6.2 and §10.6).
 *
 * Read-only against the database handed in. Returns findings in the same shape as
 * content-validate.mjs; `validateDatabase` calls it, so `npm run validate:content`,
 * Content Studio saves and publish all enforce it.
 */

import { checkPlaceholders, checkPunctuation } from "./content-rules.mjs";
import { checkScene } from "../../content/visual-blocks.ts";
import { FORBIDDEN_NAMES } from "../../components/npc/npc-palette.ts";
import { NPC_POSES } from "../../components/npc/npc-art.ts";
import { isArtId } from "../../components/lesson/visual/object-art.ts";
import { bubblesFor } from "../../components/lesson/conversation-core.ts";
import { ITEM_TYPES, NON_CHOICE_ITEM_TYPES, SIM_TYPES, TEACH_TYPES } from "../../content/curriculum/types.ts";
import { checkDecayWaitData } from "../../content/curriculum/decay-wait-core.ts";
import { checkDecayChainData } from "../../content/curriculum/decay-chain-core.ts";
import { checkRadiationIdData } from "../../content/curriculum/radiation-id-core.ts";

export const LIMITS = {
  cardsMin: 8,
  cardsMax: 16,
  wordsTarget: 60,
  wordsHard: 80,
  maxConsecutiveNonInteractive: 2,
  minInteractiveShare: 0.5,
  minNonChoice: 2,
  objectivesMin: 2,
  objectivesMax: 4,
  minScoredPerObjective: 2,
  minItemsPerObjective: 4,
  minutesMin: 3,
  minutesMax: 6,
};

const TERM_RE = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;

const isRec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** Plain text of a string with [[id|shown]] markers resolved to what the learner sees. */
export const plainText = (s) => String(s ?? "").replace(TERM_RE, "$2");
export const wordCount = (s) => plainText(s).trim().split(/\s+/).filter(Boolean).length;

function parseJson(raw, fallback) {
  try {
    return raw === null || raw === undefined || raw === "" ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {import("node:sqlite").DatabaseSync} db
 * @param {{ strictReview?: boolean }} [options] strictReview: unverified references are errors (publish gate)
 * @returns {{ checked: Record<string, number>, findings: any[] }}
 */
export function validateCurriculum(db, { strictReview = false } = {}) {
  const has = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  const findings = [];
  const checked = {};
  const bump = (k) => (checked[k] = (checked[k] ?? 0) + 1);
  if (!has("units") || !has("lessons") || !has("lesson_cards")) return { checked, findings };

  const add = (table, id, field, rule, severity, message, text) => findings.push({ table, id, field, rule, severity, message, ...(text ? { text } : {}) });
  const err = (t, i, f, r, m, text) => add(t, i, f, r, "error", m, text);
  const warn = (t, i, f, r, m, text) => add(t, i, f, r, "warning", m, text);

  const all = (sql, ...p) => db.prepare(sql).all(...p);
  const units = all("SELECT * FROM units ORDER BY position");
  const objectives = all("SELECT * FROM objectives ORDER BY unit_id, position");
  const lessons = all("SELECT * FROM lessons ORDER BY id");
  const nodes = all("SELECT * FROM path_nodes ORDER BY unit_id, position");
  const items = all("SELECT * FROM items ORDER BY id");
  const cards = all("SELECT * FROM lesson_cards ORDER BY lesson_id, position");
  const refs = all("SELECT * FROM content_references ORDER BY id");
  const unitRefs = all("SELECT * FROM unit_references");
  const lessonRefs = all("SELECT * FROM lesson_references");
  const entryIds = new Set(has("encyclopedia_entries") ? all("SELECT id FROM encyclopedia_entries").map((r) => r.id) : []);

  const unitIds = new Set(units.map((u) => u.id));
  const objectiveById = new Map(objectives.map((o) => [o.id, o]));
  const itemById = new Map(items.map((i) => [i.id, { ...i, data: parseJson(i.data, {}), surfaces: parseJson(i.surfaces, []), reference_ids: parseJson(i.reference_ids, []) }]));
  const refIds = new Set(refs.map((r) => r.id));
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const cardsByLesson = new Map();
  for (const c of cards) (cardsByLesson.get(c.lesson_id) ?? cardsByLesson.set(c.lesson_id, []).get(c.lesson_id)).push({ ...c, data: parseJson(c.data, {}) });

  // -------------------------------------------------------------------------
  // Text checks shared by every learner-facing string
  // -------------------------------------------------------------------------
  const checkText = (table, id, field, value, opts = {}) => {
    if (!isStr(value)) return;
    for (const r of [...checkPlaceholders(value, field, opts), ...checkPunctuation(value, field)]) {
      add(table, id, r.field ?? field, r.rule, r.severity, r.message, value);
    }
    for (const m of String(value).matchAll(TERM_RE)) {
      if (entryIds.size && !entryIds.has(m[1])) err(table, id, field, "glossary-term", `term marker "${m[1]}" is not an encyclopedia entry`, value);
    }
  };

  // -------------------------------------------------------------------------
  // Units
  // -------------------------------------------------------------------------
  for (const u of units) {
    bump("units");
    const guide = parseJson(u.guidebook, {});
    checkText("units", u.id, "title", u.title);
    checkText("units", u.id, "description", u.description);
    for (const t of guide.termIds ?? []) {
      if (entryIds.size && !entryIds.has(t)) err("units", u.id, "guidebook.termIds", "glossary-term", `"${t}" is not an encyclopedia entry`);
    }
    if (!unitRefs.some((r) => r.unit_id === u.id)) err("units", u.id, "references", "unit-reference", "a unit needs at least one reference");
  }
  for (const r of unitRefs) if (!refIds.has(r.reference_id)) err("unit_references", `${r.unit_id}/${r.reference_id}`, "reference_id", "reference-missing", "reference does not exist");

  // -------------------------------------------------------------------------
  // References
  // -------------------------------------------------------------------------
  const usedRefs = new Set([...unitRefs, ...lessonRefs].map((r) => r.reference_id));
  for (const i of itemById.values()) for (const id of i.reference_ids) usedRefs.add(id);
  for (const r of refs) {
    bump("content_references");
    if (!isStr(r.publisher)) err("content_references", r.id, "publisher", "reference-incomplete", "publisher is required");
    if (!isStr(r.title)) err("content_references", r.id, "title", "reference-incomplete", "title is required");
    if (!isStr(r.url) && !(isStr(r.authors) && isStr(r.year))) {
      (r.verified ? err : warn)("content_references", r.id, "url", "reference-incomplete", "needs a URL, or authors and a year");
    }
    if (usedRefs.has(r.id) && !r.verified) {
      (strictReview ? err : warn)("content_references", r.id, "verified", "reference-unverified", "has not been opened and confirmed by a person (blocks publish)");
    }
    if (r.verified && !isStr(r.accessed)) err("content_references", r.id, "accessed", "reference-incomplete", "a verified reference needs the date it was checked");
  }

  // -------------------------------------------------------------------------
  // Objectives and ownership
  // -------------------------------------------------------------------------
  const taughtBy = new Map();
  for (const l of lessons) {
    for (const o of parseJson(l.teaches, [])) {
      if (!objectiveById.has(o)) err("lessons", l.id, "teaches", "objective-missing", `objective "${o}" does not exist`);
      else if (objectiveById.get(o).unit_id !== l.unit_id) err("lessons", l.id, "teaches", "objective-unit", `objective "${o}" belongs to another unit`);
      (taughtBy.get(o) ?? taughtBy.set(o, []).get(o)).push(l.id);
    }
  }
  for (const o of objectives) {
    bump("objectives");
    if (!unitIds.has(o.unit_id)) err("objectives", o.id, "unit_id", "objective-unit", "unit does not exist");
    checkText("objectives", o.id, "statement", o.statement);
    const owners = taughtBy.get(o.id) ?? [];
    if (owners.length !== 1) err("objectives", o.id, "teaches", "objective-owner", owners.length === 0 ? "no lesson teaches this objective" : `taught by ${owners.length} lessons (${owners.join(", ")}); exactly one lesson may teach it`);
    const real = [...itemById.values()].filter((i) => i.objective_id === o.id && i.type !== "predict");
    if (real.length < LIMITS.minItemsPerObjective) err("objectives", o.id, "items", "objective-items", `has ${real.length} question(s); needs at least ${LIMITS.minItemsPerObjective}`);
    if (!real.some((i) => i.surfaces.includes("checkpoint"))) err("objectives", o.id, "items", "objective-checkpoint", 'needs at least one item with "checkpoint" in surfaces');
  }

  // -------------------------------------------------------------------------
  // Path: order of lessons, used for the "relies on" rule
  // -------------------------------------------------------------------------
  const unitPos = new Map(units.map((u) => [u.id, u.position]));
  const lessonOrder = new Map();
  const lessonNodes = new Map();
  for (const n of nodes) {
    bump("path_nodes");
    if (!unitIds.has(n.unit_id)) err("path_nodes", n.id, "unit_id", "node-unit", "unit does not exist");
    if (n.kind === "lesson") {
      const l = lessonById.get(n.lesson_id);
      if (!l) err("path_nodes", n.id, "lesson_id", "node-lesson", "a lesson node needs an existing lesson");
      else {
        if (l.unit_id !== n.unit_id) err("path_nodes", n.id, "lesson_id", "node-lesson", "the lesson belongs to another unit");
        lessonOrder.set(l.id, (unitPos.get(n.unit_id) ?? 0) * 1000 + n.position);
        (lessonNodes.get(l.id) ?? lessonNodes.set(l.id, []).get(l.id)).push(n.id);
      }
    } else if (n.lesson_id) err("path_nodes", n.id, "lesson_id", "node-lesson", `a ${n.kind} node must not have a lesson`);
  }
  for (const l of lessons) {
    const count = lessonNodes.get(l.id)?.length ?? 0;
    if (count !== 1) err("lessons", l.id, "path", "lesson-node", count === 0 ? "the lesson is not on any path" : `the lesson is on the path ${count} times`);
  }

  // -------------------------------------------------------------------------
  // Items: shape per type
  // -------------------------------------------------------------------------
  const unique = (list) => new Set(list).size === list.length;
  function checkItem(item) {
    const id = item.id;
    const d = item.data;
    const e = (field, msg) => err("items", id, field, "item-shape", msg);
    if (!objectiveById.has(item.objective_id)) err("items", id, "objective_id", "item-objective", "objective does not exist");
    if (!ITEM_TYPES.includes(item.type)) e("type", `unknown item type "${item.type}"`);
    for (const rid of item.reference_ids) if (!refIds.has(rid)) err("items", id, "reference_ids", "reference-missing", `reference "${rid}" does not exist`);
    if (!isRec(d)) return e("data", "must be an object");
    if (item.type !== "true_or_myth" && !isStr(d.prompt)) e("prompt", "is required");
    if (item.type !== "predict" && !isStr(d.explanation)) e("explanation", "is required: say why the answer is right");
    for (const f of ["prompt", "statement", "explanation"]) checkText("items", id, f, d[f], { allowBlank: item.type === "fill" && f === "prompt" });
    // A figure on a question (a reminder strip, a table to read) is held to the same rules as a teaching card's.
    if (d.figure !== undefined) {
      if (!isRec(d.figure) || !isStr(d.figure.altText) || d.figure.altText.trim().length < 20) e("figure.altText", "a figure needs alt text (at least 20 characters)");
      const figErrs = [];
      checkScene(d.figure?.scene, "scene", figErrs);
      for (const m of figErrs) e("figure.scene", m);
      for (const sh of d.figure?.scene?.shapes ?? []) if (sh?.t === "art" && !isArtId(sh.id)) e("figure.scene", `"${String(sh.id)}" is not a picture in the lesson object art`);
    }
    const ids = (list, field) => {
      if (!Array.isArray(list) || !list.every((x) => isRec(x) && isStr(x.id))) return e(field, "must be a list of objects with an id"), false;
      if (!unique(list.map((x) => x.id))) return e(field, "ids must be unique"), false;
      return true;
    };
    // A picture id, when given, must be one of the lesson object art pictures.
    const art = (list, field) => {
      if (!Array.isArray(list)) return;
      list.forEach((x, i) => {
        if (isRec(x) && x.art !== undefined && !isArtId(x.art)) e(`${field}[${i}].art`, `"${String(x.art)}" is not a picture in the lesson object art`);
      });
    };
    switch (item.type) {
      case "choice":
        art(d.options, "options");
        if (ids(d.options, "options")) {
          if (d.options.length < 2 || d.options.length > 5) e("options", "needs 2 to 5 options");
          if (!d.options.some((o) => o.id === d.answer)) e("answer", "must be the id of one option");
          d.options.forEach((o, i) => {
            checkText("items", id, `options[${i}].label`, o.label);
            checkText("items", id, `options[${i}].note`, o.note);
            if (!isStr(o.label)) e(`options[${i}].label`, "is required");
          });
          const labels = d.options.map((o) => String(o.label).trim().toLowerCase());
          if (!unique(labels)) e("options", "two options have the same label");
        }
        break;
      case "true_or_myth":
        if (!isStr(d.statement)) e("statement", "is required");
        if (d.answer !== "true" && d.answer !== "myth") e("answer", 'must be "true" or "myth"');
        break;
      case "order":
        art(d.items, "items");
        if (ids(d.items, "items") && (d.items.length < 3 || d.items.length > 6)) e("items", "needs 3 to 6 things to order");
        break;
      case "match":
        if (ids(d.pairs, "pairs")) {
          if (d.pairs.length < 2 || d.pairs.length > 6) e("pairs", "needs 2 to 6 pairs");
          if (!d.pairs.every((p) => isStr(p.left) && isStr(p.right))) e("pairs", "every pair needs a left and a right");
          else if (!unique(d.pairs.map((p) => p.right))) e("pairs", "two pairs have the same right-hand text");
        }
        break;
      case "sort":
        art(d.items, "items");
        if (ids(d.buckets, "buckets") && ids(d.items, "items")) {
          if (d.buckets.length < 2 || d.buckets.length > 3) e("buckets", "needs 2 or 3 buckets");
          const icons = d.buckets.map((x) => x.icon);
          if (icons.some((i) => i !== undefined && !isStr(i))) e("buckets", "a group icon must be an icon name");
          else if (icons.some((i) => i === undefined)) warn("items", id, "buckets", "sort-icons", `${icons.filter((i) => i === undefined).length} of ${d.buckets.length} groups have no icon; the lesson shows a legend of icons`);
          else if (!unique(icons)) e("buckets", "two groups share an icon, so the legend could not tell them apart");
          if (d.items.length < 3) e("items", "needs at least 3 things to sort");
          const b = new Set(d.buckets.map((x) => x.id));
          if (!d.items.every((x) => b.has(x.bucket))) e("items", "every item must name an existing bucket");
          if (new Set(d.items.map((x) => x.bucket)).size < 2) e("items", "items must land in at least two different buckets");
        }
        break;
      case "fill":
        if (d.mode !== "bank" && d.mode !== "number") e("mode", 'must be "bank" or "number"');
        else if (d.mode === "bank") {
          if (ids(d.bank, "bank")) {
            if (d.bank.length < 3) e("bank", "needs at least 3 word choices");
            if (!d.bank.some((x) => x.id === d.answer)) e("answer", "must be the id of a bank entry");
          }
        } else if (!isNum(d.answer)) e("answer", "must be a number in number mode");
        if (!String(d.prompt ?? "").includes("___")) e("prompt", "needs ___ where the blank goes");
        break;
      case "estimate":
        if (!isNum(d.min) || !isNum(d.max) || d.min >= d.max) e("min", "min and max must be numbers with min < max");
        else if (!isNum(d.answer) || d.answer < d.min || d.answer > d.max) e("answer", "must be within min and max");
        if (!isNum(d.tolerance) || d.tolerance <= 0) e("tolerance", "must be a positive number");
        if (d.scale === "log" && (d.min <= 0 || (isNum(d.tolerance) && d.tolerance < 1))) e("scale", "log scale needs min > 0 and a tolerance factor >= 1");
        break;
      case "hotspot": {
        const errs = [];
        checkScene(d.scene, "scene", errs);
        for (const m of errs) e("scene", m);
        if (ids(d.targets, "targets")) {
          if (!d.targets.some((t) => t.id === d.answer)) e("answer", "must be the id of one target");
          d.targets.forEach((t, i) => {
            if (![t.x, t.y, t.r].every(isNum)) e(`targets[${i}]`, "needs numeric x, y and r");
            if (!isStr(t.label)) e(`targets[${i}].label`, "is required (screen-reader label)");
          });
        }
        break;
      }
      case "predict":
        art(d.options, "options");
        if (d.input !== "choice" && d.input !== "estimate") e("input", 'must be "choice" or "estimate"');
        else if (d.input === "choice") {
          if (ids(d.options, "options") && !d.options.some((o) => o.id === d.answer)) e("answer", "must be the id of one option");
        } else if (!isNum(d.min) || !isNum(d.max) || d.min >= d.max) e("min", "min and max must be numbers with min < max");
        if (item.surfaces.some((s) => s !== "lesson")) err("items", id, "surfaces", "item-shape", 'a prediction may only appear in "lesson"');
        break;
      default:
        break;
    }
    // Facts and numbers: ask for a reference.
    if (item.type !== "predict" && /\d/.test(plainText(d.explanation ?? "")) && item.reference_ids.length === 0) {
      warn("items", id, "reference_ids", "item-reference", "the explanation states a number or date: add a reference");
    }
  }
  for (const item of itemById.values()) {
    bump("items");
    checkItem(item);
  }

  // -------------------------------------------------------------------------
  // Lessons and cards
  // -------------------------------------------------------------------------
  const terms = (s) => [...String(s ?? "").matchAll(TERM_RE)].map((m) => m[1]);
  void terms;

  for (const l of lessons) {
    bump("lessons");
    const lc = cardsByLesson.get(l.id) ?? [];
    const teaches = parseJson(l.teaches, []);
    const reliesOn = parseJson(l.relies_on, []);
    const e = (field, rule, msg) => err("lessons", l.id, field, rule, msg);
    const w = (field, rule, msg) => warn("lessons", l.id, field, rule, msg);

    checkText("lessons", l.id, "title", l.title);
    checkText("lessons", l.id, "description", l.description);
    if (!unitIds.has(l.unit_id)) e("unit_id", "lesson-unit", "unit does not exist");
    if (l.estimated_minutes < LIMITS.minutesMin || l.estimated_minutes > LIMITS.minutesMax) w("estimated_minutes", "lesson-length", `${l.estimated_minutes} min is outside the ${LIMITS.minutesMin}-${LIMITS.minutesMax} minute target`);
    if (teaches.length < LIMITS.objectivesMin || teaches.length > LIMITS.objectivesMax) e("teaches", "lesson-objectives", `teaches ${teaches.length} objective(s); needs ${LIMITS.objectivesMin} to ${LIMITS.objectivesMax}`);
    if (!lessonRefs.some((r) => r.lesson_id === l.id)) e("references", "lesson-reference", "a lesson needs at least one reference");

    for (const o of reliesOn) {
      const owner = (taughtBy.get(o) ?? [])[0];
      if (!objectiveById.has(o)) e("relies_on", "relies-on", `objective "${o}" does not exist`);
      else if (!owner) e("relies_on", "relies-on", `objective "${o}" is not taught by any lesson`);
      else if (owner === l.id) e("relies_on", "relies-on", `objective "${o}" is taught by this lesson, not before it`);
      else if ((lessonOrder.get(owner) ?? Infinity) >= (lessonOrder.get(l.id) ?? -Infinity)) e("relies_on", "relies-on", `objective "${o}" is taught later in the path (${owner})`);
    }

    // Card count
    if (lc.length < LIMITS.cardsMin || lc.length > LIMITS.cardsMax) e("cards", "lesson-cards", `has ${lc.length} cards; needs ${LIMITS.cardsMin} to ${LIMITS.cardsMax}`);

    const core = lc.filter((c) => c.tier === "core");
    const interactive = (c) => c.kind === "item" || c.kind === "sim";
    if (core.length && core.filter(interactive).length / core.length < LIMITS.minInteractiveShare) {
      e("cards", "lesson-interactive", `only ${core.filter(interactive).length} of ${core.length} core cards are interactive; at least half must be`);
    }
    let run = 0;
    for (const c of core) {
      run = interactive(c) ? 0 : run + 1;
      if (run > LIMITS.maxConsecutiveNonInteractive) {
        e(`cards.${c.id}`, "lesson-reading-run", `more than ${LIMITS.maxConsecutiveNonInteractive} reading cards in a row`);
        break;
      }
    }

    const itemOf = (c) => (c.item_id ? itemById.get(c.item_id) : undefined);
    const nonChoice = core.filter((c) => c.kind === "sim" || (c.kind === "item" && NON_CHOICE_ITEM_TYPES.includes(itemOf(c)?.type)));
    if (nonChoice.length < LIMITS.minNonChoice) e("cards", "lesson-variety", `has ${nonChoice.length} non-choice interaction(s); needs at least ${LIMITS.minNonChoice}`);
    // Opening with a prediction is the usual pattern, not a rule: a lesson may start by teaching.
    if (!core.some((c) => c.kind === "item" && itemOf(c)?.type === "predict")) w("cards", "lesson-predict", "has no predict card; most lessons open with one");

    // Scored items per taught objective
    for (const o of teaches) {
      const scored = core.filter((c) => c.kind === "item" && c.scored && itemOf(c)?.objective_id === o).length;
      if (scored < LIMITS.minScoredPerObjective) e("cards", "lesson-scored", `objective "${o}" has ${scored} scored item(s) in the lesson; needs at least ${LIMITS.minScoredPerObjective}`);
    }

    // Card by card
    const trueMyth = [];
    for (const c of lc) {
      bump("lesson_cards");
      const cid = `${l.id}/${c.id}`;
      const ce = (field, rule, msg) => err("lesson_cards", cid, field, rule, msg);
      const d = c.data;
      if (c.kind === "teach") {
        if (!TEACH_TYPES.includes(c.type)) ce("type", "card-type", `unknown teach type "${c.type}"`);
        if (!isStr(d.body)) ce("data.body", "card-shape", "body is required");
        else {
          const words = wordCount(d.body);
          if (words > LIMITS.wordsHard) ce("data.body", "card-words", `${words} words; the limit is ${LIMITS.wordsHard}`);
          else if (words > LIMITS.wordsTarget) warn("lesson_cards", cid, "data.body", "card-words", `${words} words; aim for ${LIMITS.wordsTarget} or fewer`);
        }
        for (const f of ["title", "body", "tag"]) checkText("lesson_cards", cid, `data.${f}`, d[f]);
        if (!d.figure && !d.visual) ce("data.figure", "card-figure", "every teaching card needs a figure");
        if (d.figure) {
          if (!isStr(d.figure.altText) || d.figure.altText.trim().length < 20) ce("data.figure.altText", "card-figure", "alt text is required (at least 20 characters)");
          const errs = [];
          checkScene(d.figure.scene, "scene", errs);
          for (const m of errs) ce("data.figure.scene", "card-figure", m);
          for (const sh of d.figure.scene?.shapes ?? []) if (sh?.t === "art" && !isArtId(sh.id)) ce("data.figure.scene", "card-figure", `"${String(sh.id)}" is not a picture in the lesson object art`);
        }
        if (d.figureAt !== undefined) {
          const bubbles = isStr(d.body) ? bubblesFor(d.body, 3).length : 0;
          if (!Number.isInteger(d.figureAt) || d.figureAt < 0 || d.figureAt > bubbles) ce("data.figureAt", "card-figure-at", `must be a whole number from 0 to ${bubbles} (the number of speech bubbles before the figure)`);
          else if (!d.figure) ce("data.figureAt", "card-figure-at", "the card has no figure to place");
        }
        if (c.type === "reveal") {
          const target = lc.find((x) => x.id === d.predictCardId);
          if (!target) ce("data.predictCardId", "card-reveal", "must name a card in this lesson");
          else if (itemOf(target)?.type !== "predict") ce("data.predictCardId", "card-reveal", "must name a predict card");
          else if (lc.findIndex((x) => x.id === target.id) > lc.findIndex((x) => x.id === c.id)) ce("data.predictCardId", "card-reveal", "the prediction must come before its reveal");
        }
        if (c.scored) ce("scored", "card-shape", "a teaching card is never scored");
      } else if (c.kind === "item") {
        const item = itemOf(c);
        if (!c.item_id || !item) ce("item_id", "card-item", "an item card must point at an existing item");
        else {
          if (item.type === "predict" && c.scored) ce("scored", "card-shape", "a prediction is never scored");
          if (item.type !== "predict" && !c.scored && c.tier === "core") warn("lesson_cards", cid, "scored", "card-shape", "an unscored question is not counted toward mastery");
          if (!item.surfaces.includes("lesson")) ce("item_id", "card-item", 'the item does not list "lesson" in surfaces');
          if (!teaches.includes(item.objective_id) && !reliesOn.includes(item.objective_id)) warn("lesson_cards", cid, "item_id", "card-objective", `item tests "${item.objective_id}", which this lesson neither teaches nor relies on`);
          if (item.type === "true_or_myth") trueMyth.push(item.data.answer);
        }
        if (c.data.connected !== undefined) {
          const before = lc[lc.findIndex((x) => x.id === c.id) - 1];
          if (typeof c.data.connected !== "boolean") ce("data.connected", "card-connected", "must be true or false");
          else if (c.data.connected && before?.kind !== "teach") warn("lesson_cards", cid, "data.connected", "card-connected", "joins the lecture before it, but no teaching card comes right before; it will stand alone");
        }
      } else if (c.kind === "sim") {
        if (!SIM_TYPES.includes(c.type)) ce("type", "card-type", `unknown simulation "${c.type}"`);
        checkSim(c, cid, ce);
      } else ce("kind", "card-type", `unknown kind "${c.kind}"`);
    }
    if (trueMyth.length >= 2 && (!trueMyth.includes("true") || !trueMyth.includes("myth"))) {
      w("cards", "true-myth-mix", "true-or-myth cards are all the same answer; mix true statements and myths");
    }
  }
  for (const c of cards) {
    if (!lessonById.has(c.lesson_id)) err("lesson_cards", `${c.lesson_id}/${c.id}`, "lesson_id", "card-lesson", "lesson does not exist");
  }
  for (const r of lessonRefs) if (!refIds.has(r.reference_id)) err("lesson_references", `${r.lesson_id}/${r.reference_id}`, "reference_id", "reference-missing", "reference does not exist");

  function checkSim(c, cid, ce) {
    const d = c.data;
    if (c.type === "atom-builder") {
      if (!["build", "element", "isotope", "stability"].includes(d.mode)) ce("data.mode", "sim-shape", "mode must be build, element, isotope or stability");
      if (!isStr(d.task)) ce("data.task", "sim-shape", "task is required");
      checkText("lesson_cards", cid, "data.task", d.task);
      checkText("lesson_cards", cid, "data.hint", d.hint);
      if (!isRec(d.goal) || Object.keys(d.goal).length === 0) ce("data.goal", "sim-shape", "goal is required so completion can be checked");
      for (const o of d.objectives ?? []) if (!objectiveById.has(o)) ce("data.objectives", "sim-shape", `objective "${o}" does not exist`);
    } else if (c.type === "decay-wait" || c.type === "decay-chain" || c.type === "radiation-id") {
      // The unit 2 simulations keep their own shape rules next to their logic (content/curriculum/*-core.ts).
      const problems = c.type === "decay-wait" ? checkDecayWaitData(d) : c.type === "decay-chain" ? checkDecayChainData(d) : checkRadiationIdData(d);
      for (const m of problems) ce("data", "sim-shape", m);
      checkText("lesson_cards", cid, "data.task", d.task);
      checkText("lesson_cards", cid, "data.hint", d.hint);
      if (d.hint !== undefined && !isStr(d.hint)) ce("data.hint", "sim-shape", "hint must be text when given");
      if (c.type === "decay-chain") for (const n of d.nodes ?? []) checkText("lesson_cards", cid, "data.nodes.label", n?.label);
      if (c.type === "radiation-id") for (const k of d.cases ?? []) checkText("lesson_cards", cid, "data.cases.clue", k?.clue);
      for (const o of d.objectives ?? []) if (!objectiveById.has(o)) ce("data.objectives", "sim-shape", `objective "${o}" does not exist`);
    } else if (c.type === "scale-zoom") {
      if (!isStr(d.task)) ce("data.task", "sim-shape", "task is required");
      const stops = d.stops;
      if (!Array.isArray(stops) || stops.length < 3) ce("data.stops", "sim-shape", "needs at least 3 stops");
      else {
        if (!unique(stops.map((s) => s.id))) ce("data.stops", "sim-shape", "stop ids must be unique");
        for (let i = 1; i < stops.length; i++) {
          if (!(isNum(stops[i].meters) && isNum(stops[i - 1].meters) && stops[i].meters < stops[i - 1].meters)) {
            ce("data.stops", "sim-shape", "stops must go from larger to smaller (meters decreasing)");
            break;
          }
        }
        stops.forEach((s, i) => {
          for (const f of ["label", "sizeLabel", "note"]) if (!isStr(s[f])) ce(`data.stops[${i}].${f}`, "sim-shape", "is required");
          if (s.art !== undefined && !isArtId(s.art)) ce(`data.stops[${i}].art`, "sim-shape", `"${String(s.art)}" is not a picture in the lesson object art`);
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // NPC teachers (docs/NPC_TEACHERS_SPEC.md §7.3, rules R1 to R6)
  // -------------------------------------------------------------------------
  if (has("npcs") && has("npc_lines")) {
    const unitCols = db.prepare("PRAGMA table_info(units)").all().map((c) => c.name);
    const npcRows = all("SELECT * FROM npcs ORDER BY position");
    const npcById = new Map(npcRows.map((n) => [n.id, { ...n, spec: parseJson(n.spec, null) }]));
    const npcLines = all("SELECT * FROM npc_lines ORDER BY id");
    const HEX = /^#[0-9A-Fa-f]{6}$/;
    const WORD_LIMIT = 20;
    const SPEC_ATTRS = (s) => [s.skin?.base, s.head, s.eyes, s.nose, s.hair?.style, s.hair?.color, s.outfit?.kind, s.outfit?.color, s.accent?.kind];

    // R4: every teacher is a valid spec, has an original name, and no two are alike.
    for (const n of npcById.values()) {
      bump("npcs");
      const s = n.spec;
      if (!isRec(s)) {
        err("npcs", n.id, "spec", "npc-spec", "spec must be a JSON object");
        continue;
      }
      const colors = [s.skin?.base, s.skin?.shade, s.skin?.feature, s.hair?.color, s.hair?.shade, s.outfit?.color, s.outfit?.shade, s.accent?.color, s.accent?.shade, ...(s.outfit?.collar ? [s.outfit.collar] : [])];
      if (colors.some((c) => !isStr(c) || !HEX.test(c))) err("npcs", n.id, "spec", "npc-spec", "every colour in a spec must be #RRGGBB");
      if (!isStr(n.name) || !isStr(n.bio) || !isStr(n.title)) err("npcs", n.id, "name", "npc-spec", "name, title and bio are required");
      if (FORBIDDEN_NAMES.includes(String(n.name).toLowerCase())) err("npcs", n.id, "name", "npc-original", `"${n.name}" is the name of a Duolingo character; teachers must be original`);
      checkText("npcs", n.id, "bio", n.bio);
    }
    const list = [...npcById.values()].filter((n) => isRec(n.spec));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = SPEC_ATTRS(list[i].spec);
        const b = SPEC_ATTRS(list[j].spec);
        const differ = a.filter((v, k) => v !== b[k]).length;
        if (differ < 4) err("npcs", `${list[i].id}/${list[j].id}`, "spec", "npc-variety", `teachers must differ in at least 4 of 9 attributes (these differ in ${differ})`);
        if (list[i].spec.outfit?.color === list[j].spec.outfit?.color) err("npcs", `${list[i].id}/${list[j].id}`, "spec.outfit.color", "npc-variety", "two teachers share an outfit colour");
      }
    }

    // R1 and R2: each unit has a teacher who introduces every lesson and meets and signs off the unit.
    const unitTeacher = new Map();
    if (unitCols.includes("teacher_npc_id")) {
      for (const u of units) {
        if (!u.teacher_npc_id) {
          err("units", u.id, "teacher_npc_id", "npc-unit-teacher", "a unit needs a teacher (teacher_npc_id)");
        } else if (!npcById.has(u.teacher_npc_id)) {
          err("units", u.id, "teacher_npc_id", "npc-unit-teacher", `teacher "${u.teacher_npc_id}" does not exist`);
        } else unitTeacher.set(u.id, u.teacher_npc_id);
      }
    }
    for (const [unitId, teacher] of unitTeacher) {
      for (const kind of ["meet", "sign_off"]) {
        if (!npcLines.some((l) => l.npc_id === teacher && l.kind === kind)) err("units", unitId, "npc_lines", "npc-lines", `the teacher needs a "${kind}" line`);
      }
      for (const l of lessons.filter((x) => x.unit_id === unitId)) {
        const intros = npcLines.filter((x) => x.kind === "lesson_intro" && x.lesson_id === l.id);
        if (intros.length !== 1) err("lessons", l.id, "npc_lines", "npc-lines", `a lesson needs exactly one lesson_intro line (has ${intros.length})`);
        else if (intros[0].npc_id !== teacher) err("lessons", l.id, "npc_lines", "npc-lines", "the lesson_intro must be spoken by the unit's teacher");
      }
    }

    // R3 and R6 (ids are shipped ids, handled by the release ledger): lines are short, plain, and add no new facts.
    const lessonText = new Map();
    for (const [lessonId, cs] of cardsByLesson) lessonText.set(lessonId, JSON.stringify(cs.map((c) => c.data)));
    for (const l of npcLines) {
      bump("npc_lines");
      if (!npcById.has(l.npc_id)) err("npc_lines", l.id, "npc_id", "npc-lines", "teacher does not exist");
      if (!isStr(l.text)) {
        err("npc_lines", l.id, "text", "npc-lines", "text is required");
        continue;
      }
      if (wordCount(l.text) > WORD_LIMIT) err("npc_lines", l.id, "text", "npc-line-length", `a line is ${WORD_LIMIT} words or fewer (this is ${wordCount(l.text)})`, l.text);
      if (/\[\[|<|>/.test(l.text)) err("npc_lines", l.id, "text", "npc-line-plain", "a line is plain text (no term markers or markup)", l.text);
      if (!NPC_POSES.includes(l.pose)) err("npc_lines", l.id, "pose", "npc-lines", `pose "${l.pose}" is not one of ${NPC_POSES.join(", ")}`);
      checkText("npc_lines", l.id, "text", l.text);
      if (l.kind === "lesson_intro" && !l.lesson_id) err("npc_lines", l.id, "lesson_id", "npc-lines", "a lesson_intro line needs a lesson");
      if (l.lesson_id && !lessonById.has(l.lesson_id)) err("npc_lines", l.id, "lesson_id", "npc-lines", `lesson "${l.lesson_id}" does not exist`);
      // Voice, not content: a number in a line must come from the lesson's own cards.
      const cards = l.lesson_id ? lessonText.get(l.lesson_id) : null;
      if (cards) for (const num of l.text.match(/\d+/g) ?? []) if (!cards.includes(num)) warn("npc_lines", l.id, "text", "npc-line-facts", `the number ${num} is not in this lesson's cards: lines add no new facts`, l.text);
    }

    // R5: a story card's teller is the unit's teacher.
    for (const [lessonId, cs] of cardsByLesson) {
      const unitId = lessonById.get(lessonId)?.unit_id;
      for (const c of cs) {
        const speaker = c.data?.speaker;
        if (speaker === undefined) continue;
        if (c.type !== "story") err("lesson_cards", `${lessonId}/${c.id}`, "data.speaker", "npc-speaker", "only a story card has a speaker");
        else if (!npcById.has(speaker)) err("lesson_cards", `${lessonId}/${c.id}`, "data.speaker", "npc-speaker", `speaker "${speaker}" is not a teacher`);
        else if (unitTeacher.has(unitId) && unitTeacher.get(unitId) !== speaker) err("lesson_cards", `${lessonId}/${c.id}`, "data.speaker", "npc-speaker", "the speaker must be the unit's teacher");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Links from other content to lessons (spec §10.3)
  // -------------------------------------------------------------------------
  const lessonIds = new Set(lessons.map((l) => l.id));
  if (has("myths")) {
    for (const m of all("SELECT id, related_lessons FROM myths")) {
      for (const id of parseJson(m.related_lessons, [])) {
        if (!lessonIds.has(id)) err("myths", m.id, "related_lessons", "link-lesson", `lesson "${id}" does not exist`);
      }
    }
  }

  return { checked, findings };
}
