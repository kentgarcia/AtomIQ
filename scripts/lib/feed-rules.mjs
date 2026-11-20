/**
 * NPC feed and mini blog validation (docs/features/NPC_FEED_SPEC.md §6 rules).
 *
 * `validateFeedData` is pure (plain objects in, findings out) so tests can feed it fixtures;
 * `validateFeed` reads the content database and calls it. `validateDatabase` runs it, so
 * `npm run validate:content`, Content Studio saves and the publish gate all enforce it.
 *
 * Findings use the same shape as the other validators: { table, id, field, rule, severity, message }.
 * A blog comment's id is `<blog id>/<comment id>`, so Studio can match it to its piece.
 * Unverified sources are warnings in a draft and errors at the publish gate (`strictReview`).
 */

import { isArtId } from "../../components/lesson/visual/object-art.ts";
import { checkPlaceholders } from "./content-rules.mjs";
import {
  BLOCK_TYPES,
  BLOG_LIMITS,
  BLOG_UNLOCK_TRIGGERS,
  CHEST_PERIODS,
  COMEBACK_MIN_DAYS,
  FEED_CHIPS,
  FEED_KINDS,
  FEED_TEXT_MAX,
  FEED_TRIGGERS,
  LEARNER_POSTER,
  RANK_DIRECTIONS,
  STREAK_DAYS,
  TEMPLATE_TRIGGER_KEYS,
  blogWordCount,
  placeholdersIn,
  readingMinutes,
} from "./feed-vocab.mjs";

const isRec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isInt = (v) => Number.isInteger(v);

const parseJson = (raw, fallback) => {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/** A string with `!!` or three or more exclamation marks reads as shouting. */
export const hasExclamationRun = (text) => /!{2,}/.test(String(text ?? "")) || (String(text ?? "").match(/!/g) ?? []).length > 2;

/**
 * @typedef {Object} FeedData
 * @property {Array<{id: string}>} units
 * @property {Array<{id: string, unit_id: string}>} lessons
 * @property {Array<{id: string}>} npcs
 * @property {Array<{id: string, verified: number|boolean}>} references
 * @property {Array<string>} [entryIds] encyclopedia entry ids
 * @property {Array<any>} templates  poster_pool / condition / reactors already parsed
 * @property {Array<any>} posts      unlock / blocks / reactors already parsed
 * @property {Array<any>} comments   chip already parsed
 * @property {Array<{blog_id: string, reference_id: string}>} blogRefs
 */

/**
 * @param {FeedData} data
 * @param {{ strictReview?: boolean }} [options]
 * @returns {{ checked: Record<string, number>, findings: any[] }}
 */
export function validateFeedData(data, { strictReview = false } = {}) {
  const findings = [];
  const checked = { feed_templates: 0, blog_posts: 0, blog_comments: 0 };
  const add = (table, id, field, rule, severity, message, text) => findings.push({ table, id, field, rule, severity, message, ...(text ? { text } : {}) });
  const err = (table, id, field, rule, message, text) => add(table, id, field, rule, "error", message, text);
  const warn = (table, id, field, rule, message, text) => add(table, id, field, rule, "warning", message, text);

  const unitIds = new Set(data.units.map((u) => u.id));
  const lessonUnit = new Map(data.lessons.map((l) => [l.id, l.unit_id]));
  const npcIds = new Set(data.npcs.map((n) => n.id));
  const entryIds = new Set(data.entryIds ?? []);
  const refById = new Map(data.references.map((r) => [r.id, r]));
  const postIds = new Set(data.posts.map((p) => p.id));
  const npcList = (list, table, id, field, rule) => {
    if (!Array.isArray(list) || list.some((x) => typeof x !== "string")) {
      err(table, id, field, rule, "must be a list of NPC ids");
      return [];
    }
    for (const n of list) if (!npcIds.has(n)) err(table, id, field, rule, `"${n}" is not an NPC`);
    return list;
  };

  // -------------------------------------------------------------------------
  // feed templates
  // -------------------------------------------------------------------------
  const T = "feed_templates";
  for (const t of data.templates) {
    checked.feed_templates++;
    const id = t.id;
    const spec = FEED_TRIGGERS[t.trigger];

    if (!FEED_KINDS.includes(t.kind)) err(T, id, "kind", "feed-kind", `kind must be one of ${FEED_KINDS.join(", ")}`);
    if (!isInt(t.weight) || t.weight < 1) err(T, id, "weight", "feed-weight", "weight must be a whole number of 1 or more");

    // poster and reactors
    // A pool of just "learner" is the learner's own voice (a streak post); it cannot be mixed with NPCs.
    const learnerVoice = Array.isArray(t.poster_pool) && t.poster_pool.length === 1 && t.poster_pool[0] === LEARNER_POSTER && !t.npc_id;
    if (!learnerVoice && Array.isArray(t.poster_pool) && t.poster_pool.includes(LEARNER_POSTER)) err(T, id, "poster_pool", "feed-poster", `"${LEARNER_POSTER}" must be the only entry of the pool`);
    const pool = learnerVoice ? [LEARNER_POSTER] : Array.isArray(t.poster_pool) ? npcList(t.poster_pool.filter((x) => x !== LEARNER_POSTER), T, id, "poster_pool", "feed-poster") : (err(T, id, "poster_pool", "feed-poster", "poster_pool must be a list of NPC ids"), []);
    if (t.npc_id !== null && t.npc_id !== undefined && t.npc_id !== "") {
      if (!npcIds.has(t.npc_id)) err(T, id, "npc_id", "feed-poster", `"${t.npc_id}" is not an NPC`);
    } else if (pool.length === 0) {
      err(T, id, "npc_id", "feed-poster", "a template needs a poster (npc_id) or a poster_pool");
    }
    const reactors = npcList(t.reactors, T, id, "reactors", "feed-reactors");
    if (t.npc_id && reactors.includes(t.npc_id)) err(T, id, "reactors", "feed-reactors", "the poster cannot react to its own post");

    // trigger and condition
    if (!spec) {
      err(T, id, "trigger", "feed-trigger", `"${t.trigger}" is not a trigger (${TEMPLATE_TRIGGER_KEYS.join(", ")})`);
    } else {
      if (spec.template === false) err(T, id, "trigger", "feed-trigger", `${t.trigger} has no templates: a blog card's text is the piece's hook`);
      const cond = isRec(t.condition) ? t.condition : null;
      if (!cond) err(T, id, "condition", "feed-condition", "condition must be a JSON object");
      else {
        for (const key of Object.keys(cond)) {
          if (!(key in spec.condition)) err(T, id, "condition", "feed-condition", `${t.trigger} has no condition field "${key}" (it has: ${Object.keys(spec.condition).join(", ") || "none"})`);
        }
        for (const [key, def] of Object.entries(spec.condition)) {
          const v = cond[key];
          if (v === undefined) {
            if (def.required) err(T, id, "condition", "feed-condition", `${t.trigger} needs condition.${key}`);
            continue;
          }
          const bad = (m) => err(T, id, "condition", "feed-condition", `condition.${key} ${m}`);
          switch (def.type) {
            case "unit":
              if (!unitIds.has(v)) bad(`"${v}" is not a unit`);
              break;
            case "lesson":
              if (!lessonUnit.has(v)) bad(`"${v}" is not a lesson`);
              else if (cond.unitId !== undefined && lessonUnit.get(v) !== cond.unitId) bad(`"${v}" is not in unit "${cond.unitId}"`);
              break;
            case "npc":
              if (!npcIds.has(v)) bad(`"${v}" is not an NPC`);
              break;
            case "blog":
              if (!postIds.has(v)) bad(`"${v}" is not a blog piece`);
              break;
            case "bool":
              if (typeof v !== "boolean") bad("must be true or false");
              break;
            case "days":
              if (!STREAK_DAYS.includes(v)) bad(`must be one of ${STREAK_DAYS.join(", ")}`);
              break;
            case "minDays":
              if (!isInt(v) || v < COMEBACK_MIN_DAYS) bad(`must be a whole number of ${COMEBACK_MIN_DAYS} or more`);
              break;
            case "period":
              if (!CHEST_PERIODS.includes(v)) bad(`must be one of ${CHEST_PERIODS.join(", ")}`);
              break;
            case "direction":
              if (!RANK_DIRECTIONS.includes(v)) bad(`must be one of ${RANK_DIRECTIONS.join(", ")}`);
              break;
            default:
              break;
          }
        }
      }
      // chip
      if (t.chip !== null && t.chip !== undefined) {
        if (!FEED_CHIPS.includes(t.chip)) err(T, id, "chip", "feed-chip", `chip must be one of ${FEED_CHIPS.join(", ")}`);
        else if (!spec.chips.includes(t.chip)) err(T, id, "chip", "feed-chip", `a ${t.trigger} post cannot open "${t.chip}" (allowed: ${spec.chips.join(", ") || "none"})`);
      }
    }

    // text
    const text = String(t.text ?? "");
    if (!text.trim()) err(T, id, "text", "feed-text", "text is empty");
    if (text.length > FEED_TEXT_MAX) err(T, id, "text", "feed-text", `text is ${text.length} characters; the limit is ${FEED_TEXT_MAX}`, text);
    if (hasExclamationRun(text)) err(T, id, "text", "feed-text", "no exclamation-mark runs (at most two exclamation marks, never !!)", text);
    const allowed = spec?.placeholders ?? [];
    for (const name of new Set(placeholdersIn(text))) {
      if (!allowed.includes(name)) err(T, id, "text", "feed-placeholder", `{${name}} is not supplied by ${t.trigger} (it supplies: ${allowed.map((p) => `{${p}}`).join(" ") || "nothing"})`, text);
    }
    const stray = text.replace(/\{[^{}]*\}/g, "");
    if (/[{}]/.test(stray)) err(T, id, "text", "feed-placeholder", "unbalanced { } in the text", text);
  }

  // coverage: a lesson_complete and a unit_complete template per unit, a template for every trigger
  for (const u of data.units) {
    for (const trigger of ["lesson_complete", "unit_complete"]) {
      if (!data.templates.some((t) => t.trigger === trigger && isRec(t.condition) && t.condition.unitId === u.id)) {
        err("units", u.id, "feed_templates", "feed-coverage", `unit needs at least one ${trigger} feed template (condition.unitId = "${u.id}")`);
      }
    }
  }
  for (const key of TEMPLATE_TRIGGER_KEYS) {
    if (!data.templates.some((t) => t.trigger === key)) err(T, `trigger:${key}`, "trigger", "feed-coverage", `no feed template uses the ${key} trigger`);
  }

  // -------------------------------------------------------------------------
  // blog pieces
  // -------------------------------------------------------------------------
  const B = "blog_posts";
  for (const p of data.posts) {
    checked.blog_posts++;
    const id = p.id;
    if (!npcIds.has(p.npc_id)) err(B, id, "npc_id", "blog-meta", `author "${p.npc_id}" is not an NPC`);
    if (p.unit_id && !unitIds.has(p.unit_id)) err(B, id, "unit_id", "blog-unit", `unit "${p.unit_id}" does not exist`);
    if (p.lesson_id) {
      if (!lessonUnit.has(p.lesson_id)) err(B, id, "lesson_id", "blog-unit", `lesson "${p.lesson_id}" does not exist`);
      else if (p.unit_id && lessonUnit.get(p.lesson_id) !== p.unit_id) err(B, id, "lesson_id", "blog-unit", `lesson "${p.lesson_id}" is not in unit "${p.unit_id}"`);
    }
    if (!isInt(p.position)) err(B, id, "position", "blog-meta", "position must be a whole number");
    if (!isStr(p.title)) err(B, id, "title", "blog-meta", "title is required");
    else if (p.title.length > BLOG_LIMITS.titleMax) err(B, id, "title", "blog-meta", `title is ${p.title.length} characters; the limit is ${BLOG_LIMITS.titleMax}`);
    for (const f of checkPlaceholders(p.title, "title")) err(B, id, "title", "placeholder", f.message, p.title);

    // hook
    const hook = String(p.hook ?? "");
    if (!hook.trim()) err(B, id, "hook", "blog-hook", "the hook is required");
    else if (hook.length > BLOG_LIMITS.hookMax) err(B, id, "hook", "blog-hook", `the hook is ${hook.length} characters; the limit is ${BLOG_LIMITS.hookMax}`, hook);
    for (const f of checkPlaceholders(hook, "hook")) err(B, id, "hook", "placeholder", f.message, hook);

    // cover
    if (!isArtId(p.cover)) err(B, id, "cover", "blog-cover", `cover "${p.cover}" is not a picture in the lesson object art`);

    // unlock
    const unlock = p.unlock;
    if (!isRec(unlock) || !BLOG_UNLOCK_TRIGGERS.includes(unlock.trigger)) {
      err(B, id, "unlock", "blog-unlock", `unlock.trigger must be one of ${BLOG_UNLOCK_TRIGGERS.join(", ")}`);
    } else if (unlock.trigger === "lesson_complete") {
      if (!lessonUnit.has(unlock.lessonId)) err(B, id, "unlock", "blog-unlock", `unlock.lessonId "${unlock.lessonId}" is not a lesson`);
    } else if (unlock.trigger === "unit_complete") {
      if (!unitIds.has(unlock.unitId)) err(B, id, "unlock", "blog-unlock", `unlock.unitId "${unlock.unitId}" is not a unit`);
    } else if (unlock.trigger === "streak") {
      if (!STREAK_DAYS.includes(unlock.days)) err(B, id, "unlock", "blog-unlock", `unlock.days must be one of ${STREAK_DAYS.join(", ")}`);
    }

    // reactors
    const reactors = npcList(p.reactors, B, id, "reactors", "blog-reactors");
    if (reactors.includes(p.npc_id)) err(B, id, "reactors", "blog-reactors", "the author cannot react to their own piece");

    // blocks
    const blocks = p.blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      err(B, id, "blocks", "blog-blocks", "blocks must be a non-empty list");
    } else {
      blocks.forEach((b, i) => {
        const where = `blocks[${i}]`;
        if (!isRec(b) || !BLOCK_TYPES.includes(b.t)) {
          err(B, id, where, "blog-blocks", `block type must be one of ${BLOCK_TYPES.join(", ")}`);
          return;
        }
        const need = (key) => {
          if (!isStr(b[key])) err(B, id, where, "blog-blocks", `a ${b.t} block needs "${key}"`);
          else for (const f of checkPlaceholders(b[key], key)) err(B, id, where, "placeholder", f.message, b[key]);
        };
        switch (b.t) {
          case "p":
          case "h":
          case "quote":
          case "fact":
            need("text");
            break;
          case "figure":
            if (!isArtId(b.ref)) err(B, id, where, "blog-blocks", `figure ref "${b.ref}" is not a picture in the lesson object art`);
            need("caption");
            break;
          case "list":
            if (!Array.isArray(b.items) || b.items.length === 0 || b.items.some((x) => !isStr(x))) err(B, id, where, "blog-blocks", "a list block needs a non-empty items list of text");
            else for (const item of b.items) for (const f of checkPlaceholders(item, "items")) err(B, id, where, "placeholder", f.message, item);
            break;
          case "next": {
            need("label");
            const targets = ["lessonId", "unitId"].filter((k) => b[k] !== undefined);
            if (targets.length !== 1) err(B, id, where, "blog-blocks", "a next block points at exactly one of lessonId or unitId");
            else if (targets[0] === "lessonId" && !lessonUnit.has(b.lessonId)) err(B, id, where, "blog-blocks", `next lessonId "${b.lessonId}" is not a lesson`);
            else if (targets[0] === "unitId" && !unitIds.has(b.unitId)) err(B, id, where, "blog-blocks", `next unitId "${b.unitId}" is not a unit`);
            break;
          }
          default:
            break;
        }
      });
      const last = blocks[blocks.length - 1];
      if (!isRec(last) || last.t !== "next") err(B, id, "blocks", "blog-next", "the piece must close with a next block (a teaser with a button that opens a lesson or unit)");
      blocks.forEach((b, i) => {
        if (isRec(b) && b.t === "next" && i !== blocks.length - 1) err(B, id, `blocks[${i}]`, "blog-next", "a next block can only be the last block");
      });

      const words = blogWordCount(blocks);
      if (words < BLOG_LIMITS.wordsMin || words > BLOG_LIMITS.wordsMax) {
        err(B, id, "blocks", "blog-words", `the piece has ${words} words in its p, quote, fact and list blocks; it must have ${BLOG_LIMITS.wordsMin} to ${BLOG_LIMITS.wordsMax}`);
      }
      if (!isInt(p.read_min) || p.read_min !== readingMinutes(words)) {
        err(B, id, "read_min", "blog-read-min", `read_min is ${p.read_min} but ${words} words is ${readingMinutes(words)} min (ceil(words / ${BLOG_LIMITS.wordsPerMinute}))`);
      }
    }

    // sources
    const linked = data.blogRefs.filter((r) => r.blog_id === id).map((r) => refById.get(r.reference_id)).filter(Boolean);
    const sev = strictReview ? err : warn;
    if (linked.length === 0) sev(B, id, "references", "blog-source", "needs at least one verified source (link a content reference)");
    else if (!linked.some((r) => r.verified)) sev(B, id, "references", "blog-source", `none of its ${linked.length} source(s) has been opened and confirmed by a person (blocks publish)`);
  }

  // coverage hint: each unit gets a piece at its start and one at its end (§5.2)
  for (const u of data.units) {
    const mine = data.posts.filter((p) => p.unit_id === u.id);
    if (mine.length === 0) continue; // no pieces yet: units are written one at a time
    const start = (p) => p.unlock?.trigger === "none" || (p.unlock?.trigger === "lesson_complete" && lessonUnit.get(p.unlock.lessonId) === u.id);
    if (!mine.some(start)) warn("units", u.id, "blog_posts", "blog-coverage", "no blog piece opens this unit (unlock none, or its first lesson)");
    if (!mine.some((p) => p.unlock?.trigger === "unit_complete" && p.unlock.unitId === u.id)) warn("units", u.id, "blog_posts", "blog-coverage", "no blog piece unlocks when this unit is complete");
  }

  // -------------------------------------------------------------------------
  // blog comments
  // -------------------------------------------------------------------------
  const C = "blog_comments";
  const byPost = new Map();
  for (const c of data.comments) {
    checked.blog_comments++;
    const id = `${c.blog_id}/${c.id}`;
    const post = data.posts.find((p) => p.id === c.blog_id);
    if (!post) {
      err(C, id, "blog_id", "blog-comment", `piece "${c.blog_id}" does not exist`);
      continue;
    }
    if (!byPost.has(c.blog_id)) byPost.set(c.blog_id, []);
    byPost.get(c.blog_id).push(c);

    if (!npcIds.has(c.npc_id)) err(C, id, "npc_id", "blog-comment", `commenter "${c.npc_id}" is not an NPC`);
    else if (c.npc_id === post.npc_id) err(C, id, "npc_id", "blog-comment-author", "the author cannot comment on their own piece");
    const text = String(c.text ?? "");
    if (!text.trim()) err(C, id, "text", "blog-comment", "text is empty");
    else if (text.length > BLOG_LIMITS.commentMax) err(C, id, "text", "blog-comment-length", `a comment is ${text.length} characters; the limit is ${BLOG_LIMITS.commentMax}`, text);
    for (const f of checkPlaceholders(text, "text")) err(C, id, "text", "placeholder", f.message, text);
    if (c.chip !== null && c.chip !== undefined) {
      const keys = isRec(c.chip) ? Object.keys(c.chip) : [];
      if (keys.length !== 1 || !["lessonId", "entryId"].includes(keys[0])) {
        err(C, id, "chip", "blog-comment-chip", 'a chip is {"lessonId": ...} or {"entryId": ...}');
      } else if (keys[0] === "lessonId" && !lessonUnit.has(c.chip.lessonId)) {
        err(C, id, "chip", "blog-comment-chip", `lesson "${c.chip.lessonId}" does not exist`);
      } else if (keys[0] === "entryId" && !entryIds.has(c.chip.entryId)) {
        err(C, id, "chip", "blog-comment-chip", `encyclopedia entry "${c.chip.entryId}" does not exist`);
      }
    }
  }
  for (const [blogId, list] of byPost) {
    if (list.length > BLOG_LIMITS.commentsMax) err(B, blogId, "comments", "blog-comment-count", `a piece has at most ${BLOG_LIMITS.commentsMax} comments (this has ${list.length})`);
    const seen = new Set();
    for (const c of list) {
      if (seen.has(c.npc_id)) err(C, `${blogId}/${c.id}`, "npc_id", "blog-comment-dup", `${c.npc_id} already comments on this piece; one comment each`);
      seen.add(c.npc_id);
    }
  }

  return { checked, findings };
}

/**
 * Validate the feed tables of an open content database. A database without them (an older
 * schema) has nothing to check.
 * @param {import("node:sqlite").DatabaseSync} db
 * @param {{ strictReview?: boolean }} [options]
 */
export function validateFeed(db, { strictReview = false } = {}) {
  const has = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if (!has("feed_templates") || !has("blog_posts")) return { checked: {}, findings: [] };
  const all = (sql) => db.prepare(sql).all();
  const data = {
    units: all("SELECT id FROM units"),
    lessons: all("SELECT id, unit_id FROM lessons"),
    npcs: has("npcs") ? all("SELECT id FROM npcs") : [],
    references: has("content_references") ? all("SELECT id, verified FROM content_references") : [],
    entryIds: has("encyclopedia_entries") ? all("SELECT id FROM encyclopedia_entries").map((r) => r.id) : [],
    templates: all("SELECT * FROM feed_templates ORDER BY id").map((r) => ({
      ...r,
      poster_pool: parseJson(r.poster_pool, null),
      condition: parseJson(r.condition, null),
      reactors: parseJson(r.reactors, null),
    })),
    posts: all("SELECT * FROM blog_posts ORDER BY unit_id, position, id").map((r) => ({
      ...r,
      unlock: parseJson(r.unlock, null),
      blocks: parseJson(r.blocks, null),
      reactors: parseJson(r.reactors, null),
    })),
    comments: has("blog_comments") ? all("SELECT * FROM blog_comments ORDER BY blog_id, position").map((r) => ({ ...r, chip: parseJson(r.chip, null) })) : [],
    blogRefs: has("blog_references") ? all("SELECT blog_id, reference_id FROM blog_references") : [],
  };
  return validateFeedData(data, { strictReview });
}
