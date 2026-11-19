/**
 * The NPC feed vocabulary (docs/NPC_FEED_SPEC.md §5 and §6), as plain data and a few pure helpers.
 *
 * Framework-free and dependency-free on purpose: the validator (scripts/lib/feed-rules.mjs), the
 * Content Studio and the app's cores (services/feed-core.ts, services/blog-core.ts) all read the
 * same names, so the app mirrors this file rather than inventing its own. Change a trigger, a
 * placeholder or a block type here first.
 */

/** `feed_templates.kind` (also the CHECK in schema.sql). */
export const FEED_KINDS = ["celebrate", "milestone", "nudge", "tease"];

/** `feed_templates.chip` (also the CHECK in schema.sql): what a post's button opens. */
export const FEED_CHIPS = ["lesson", "unit", "quests", "ranks"];

/**
 * The poster id of a post written from the learner's own point of view ("I kept a 7 day streak"). A
 * template with this as its whole `poster_pool` is the learner's voice; it is not an NPC.
 */
export const LEARNER_POSTER = "learner";

/** Streak lengths that fire a `streak` post (§5.1). */
export const STREAK_DAYS = [3, 7, 14, 30, 60, 100];

/** `chest_opened` periods. */
export const CHEST_PERIODS = ["daily", "weekly"];

/** `rank_change` directions: the learner passed the rival, or the rival passed the learner. */
export const RANK_DIRECTIONS = ["passed", "passed_by"];

/** A `comeback` post needs at least this many days away (§5.1). */
export const COMEBACK_MIN_DAYS = 3;

/**
 * Condition field types:
 *   unit / lesson / npc / blog  an id of that table
 *   bool                        true or false
 *   days                        one of STREAK_DAYS
 *   minDays                     an integer >= COMEBACK_MIN_DAYS
 *   period                      one of CHEST_PERIODS
 *   direction                   one of RANK_DIRECTIONS
 *
 * `placeholders` are the {names} a template of that trigger may use: only what the event can supply.
 * `chips` are the buttons a post of that trigger may carry (the event decides the target).
 * `template: false` means the trigger has no templates (a blog card's text is the piece's hook).
 */
export const FEED_TRIGGERS = {
  lesson_complete: {
    condition: { unitId: { type: "unit", required: true }, lessonId: { type: "lesson" }, perfect: { type: "bool" } },
    placeholders: ["lesson", "unit", "name"],
    chips: ["lesson", "unit"],
    dedupe: "lesson:<lessonId>",
  },
  checkpoint_pass: {
    condition: { unitId: { type: "unit", required: true } },
    placeholders: ["unit", "name"],
    chips: ["unit"],
    dedupe: "checkpoint:<unitId>",
  },
  unit_complete: {
    condition: { unitId: { type: "unit", required: true } },
    placeholders: ["unit", "name"],
    chips: ["unit"],
    dedupe: "unit:<unitId>",
  },
  testout_pass: {
    condition: { unitId: { type: "unit", required: true } },
    placeholders: ["unit", "name"],
    chips: ["unit"],
    dedupe: "testout:<unitId>",
  },
  streak: {
    condition: { days: { type: "days", required: true } },
    placeholders: ["days", "name"],
    chips: ["quests"],
    dedupe: "streak:<days>",
  },
  chest_opened: {
    condition: { period: { type: "period" } },
    placeholders: ["name"],
    chips: ["quests"],
    dedupe: "chest:<period>:<dayKey>",
  },
  first_lesson: {
    condition: {},
    placeholders: ["lesson", "unit", "name"],
    chips: ["lesson"],
    dedupe: "first-lesson",
  },
  comeback: {
    condition: { minDays: { type: "minDays" } },
    placeholders: ["name"],
    chips: [],
    dedupe: "comeback:<dayKey>",
  },
  daily_quests_done: {
    condition: {},
    placeholders: ["name"],
    chips: ["quests"],
    dedupe: "quests:<dayKey>",
  },
  blog_unlocked: {
    condition: { blogId: { type: "blog", required: true } },
    placeholders: [],
    chips: [],
    dedupe: "blog:<blogId>",
    template: false,
  },
  rank_change: {
    condition: { direction: { type: "direction" }, npcId: { type: "npc" } },
    placeholders: ["rival", "name"],
    chips: ["ranks"],
    dedupe: "rank:<dayKey>",
  },
};

export const FEED_TRIGGER_KEYS = Object.keys(FEED_TRIGGERS);

/** Triggers a template may use (every trigger except `blog_unlocked`). */
export const TEMPLATE_TRIGGER_KEYS = FEED_TRIGGER_KEYS.filter((k) => FEED_TRIGGERS[k].template !== false);

/** Every placeholder any trigger can supply. */
export const FEED_PLACEHOLDERS = ["lesson", "unit", "days", "rival", "name"];

/** Hard limit on a rendered-from template (§6): the text of a post is one to three lines. */
export const FEED_TEXT_MAX = 220;

// ---------------------------------------------------------------------------
// Blog (§4.3, §5.2, §6)
// ---------------------------------------------------------------------------

/** `blog_posts.blocks` vocabulary: every block is a hardcoded component in the reader. */
export const BLOCK_TYPES = ["p", "h", "quote", "fact", "figure", "list", "next"];

/** Block types whose text counts towards the 120 to 350 words. */
export const COUNTED_BLOCK_TYPES = ["p", "quote", "fact", "list"];

/** `blog_posts.unlock.trigger`: the feed vocabulary, plus `none` (open from the start). */
export const BLOG_UNLOCK_TRIGGERS = ["none", "lesson_complete", "unit_complete", "streak"];

export const BLOG_LIMITS = {
  wordsMin: 120,
  wordsMax: 350,
  hookMax: 120,
  titleMax: 80,
  commentsMax: 4,
  commentMax: 200,
  /** Reading speed behind `read_min`. */
  wordsPerMinute: 200,
};

const wordsIn = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;

/** Words in the counted blocks (p, quote, fact, list items). Headings, captions and the `next` label are not counted. */
export function blogWordCount(blocks) {
  let n = 0;
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b || typeof b !== "object") continue;
    if (b.t === "list") for (const item of Array.isArray(b.items) ? b.items : []) n += wordsIn(item);
    else if (COUNTED_BLOCK_TYPES.includes(b.t)) n += wordsIn(b.text);
  }
  return n;
}

/** Whole minutes to read `words` words, at least 1: ceil(words / 200). Stored as `blog_posts.read_min`. */
export function readingMinutes(words) {
  return Math.max(1, Math.ceil(words / BLOG_LIMITS.wordsPerMinute));
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/** The {names} used in a template text, in order, with repeats. */
export function placeholdersIn(text) {
  return [...String(text ?? "").matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
}

/**
 * Fill a template. Throws on a placeholder that is unknown or has no value, so a bad template fails
 * loudly instead of posting "{rival}" to a learner.
 * @param {string} text
 * @param {Record<string, string | number>} values
 */
export function renderFeedText(text, values) {
  return String(text).replace(/\{([^{}]*)\}/g, (_m, name) => {
    if (!FEED_PLACEHOLDERS.includes(name)) throw new Error(`unknown placeholder {${name}}`);
    if (values[name] === undefined || values[name] === null) throw new Error(`no value for {${name}}`);
    return String(values[name]);
  });
}
