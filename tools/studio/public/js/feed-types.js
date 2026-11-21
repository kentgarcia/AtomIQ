// Editors for the NPC feed (docs/features/NPC_FEED_SPEC.md §6): feed templates and blog pieces.
// The vocabulary (triggers, their condition fields and placeholders, block types, limits) comes from
// the server (state.meta.feedVocab, from scripts/lib/feed-vocab.mjs), so the panels and the
// validator can never disagree. The previews redraw while you type.

import { api, el, state } from "./core.js";
import { buildForm } from "./form.js";

const vocab = () => state.meta.feedVocab;

const sel = (key, label, options, extra = {}) => ({ key, label, type: "select", options, ...extra });
const txt = (key, label, extra = {}) => ({ key, label, type: "text", ...extra });
const area = (key, label, rows = 3, extra = {}) => ({ key, label, type: "textarea", rows, ...extra });
const num = (key, label, extra = {}) => ({ key, label, type: "number", ...extra });

const idField = (isNew, hint) =>
  txt("id", "Id", {
    required: true,
    readonly: !isNew,
    hint: isNew ? hint : "The id is fixed once the item exists.",
    placeholder: "kebab-case-id",
  });

const parse = (raw, fallback) => {
  if (raw && typeof raw === "object") return raw;
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const truncate = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

// ---------------------------------------------------------------------------
// lookups (names of NPCs, titles of lessons and units), cached for the session
// ---------------------------------------------------------------------------

let npcPromise;
const npcs = () => (npcPromise ??= api("/api/rows/npcs?limit=100").then((r) => new Map(r.rows.map((n) => [n.id, n]))).catch(() => new Map()));
const titlePromises = new Map();
const titles = (table) => {
  if (!titlePromises.has(table)) titlePromises.set(table, api(`/api/refs?table=${table}`).then((r) => new Map(r.items.map((i) => [i.id, i.label]))).catch(() => new Map()));
  return titlePromises.get(table);
};

/** Redraw `draw(values)` whenever anything in the editor changes, until the widget leaves the page. */
function livePreview(box, ctx, draw) {
  let timer;
  const events = ["input", "change", "click"];
  const stop = () => events.forEach((e) => document.removeEventListener(e, run, true));
  function run() {
    if (!box.isConnected) return stop();
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        draw(ctx.live());
      } catch {
        /* the form has invalid JSON for a moment: keep the last drawing */
      }
    }, 80);
  }
  events.forEach((e) => document.addEventListener(e, run, true));
}

// ---------------------------------------------------------------------------
// feed templates
// ---------------------------------------------------------------------------

function conditionFieldDef(key, def) {
  const v = vocab();
  const label = key + (def.required ? "" : " (optional)");
  switch (def.type) {
    case "unit":
      return txt(key, label, { required: !!def.required, suggest: { table: "units", column: "id" } });
    case "lesson":
      return txt(key, label, { suggest: { table: "lessons", column: "id" }, hint: "A lesson of the unit above: the template then only answers that lesson." });
    case "npc":
      return txt(key, label, { suggest: { table: "npcs", column: "id" } });
    case "blog":
      return txt(key, label, { required: true, suggest: { table: "blog_posts", column: "id" } });
    case "bool":
      return { key, label, type: "checkbox", checkLabel: "Only for a perfect run (no mistakes)" };
    case "days":
      return sel(key, label, v.STREAK_DAYS, { required: true });
    case "minDays":
      return num(key, label, { min: v.COMEBACK_MIN_DAYS, step: 1 });
    case "period":
      return sel(key, label, v.CHEST_PERIODS, { optional: true });
    case "direction":
      return sel(key, label, v.RANK_DIRECTIONS, { optional: true });
    default:
      return txt(key, label);
  }
}

/** The condition fields of the chosen trigger. The trigger select re-renders the form, so this follows it. */
const conditionField = {
  key: "condition",
  type: "custom",
  label: "Condition",
  hint: "Which events this template answers. Leave an optional field empty to match any.",
  build(values, notify) {
    const spec = vocab().FEED_TRIGGERS[values.trigger];
    const defs = Object.entries(spec?.condition ?? {}).map(([key, d]) => conditionFieldDef(key, d));
    const box = el("div", "widget");
    if (!defs.length) {
      box.append(el("div", "hint", "This trigger has no condition fields."));
      return { el: box, get: () => ({}) };
    }
    const form = buildForm(defs, values.condition ?? {}, { notify, preserve: false, clean: true });
    box.append(form.el);
    return { el: box, get: () => form.get(), validate: () => form.validate() };
  },
};

function samplesFor(v, lessonTitles, unitTitles, npcMap) {
  const c = v.condition ?? {};
  const rival = c.npcId && npcMap.get(c.npcId)?.name;
  return {
    lesson: lessonTitles.get(c.lessonId) ?? "Isotopes",
    unit: unitTitles.get(c.unitId) ?? "Inside the Atom",
    days: String(c.days ?? 7),
    rival: rival ?? "Mina",
    name: "Alex",
  };
}

/** A post as the learner would see it, filled with sample values. */
const templatePreview = {
  key: "__preview",
  type: "custom",
  label: "Preview",
  build(_values, _notify, ctx) {
    const box = el("div", "feedprev");
    const draw = async (v) => {
      const vo = vocab();
      const spec = vo.FEED_TRIGGERS[v.trigger];
      const [lessonTitles, unitTitles, npcMap] = await Promise.all([titles("lessons"), titles("units"), npcs()]);
      const samples = samplesFor(v, lessonTitles, unitTitles, npcMap);
      const problems = [];
      const text = String(v.text ?? "").replace(/\{([^{}]*)\}/g, (_m, name) => {
        if (!vo.FEED_PLACEHOLDERS.includes(name) || !(spec?.placeholders ?? []).includes(name)) {
          problems.push(`{${name}} is not supplied by ${v.trigger}`);
          return `{${name}}`;
        }
        return samples[name];
      });
      const poster = v.npc_id ? npcMap.get(v.npc_id) : null;
      const pool = (v.poster_pool ?? []).map((id) => npcMap.get(id)?.name ?? id);
      const reactors = (v.reactors ?? []).map((id) => npcMap.get(id)?.name ?? id);

      const card = el("div", "feedprev-post");
      const head = el("div", "feedprev-head");
      head.append(el("span", "feedprev-head-dot", (poster?.name ?? pool[0] ?? "?").slice(0, 1)));
      const who = el("div");
      who.append(el("strong", null, poster ? poster.name : pool.length ? `one of ${pool.join(", ")}` : "no poster"), el("span", "hint", ` · ${poster?.title ?? "chosen when the post is made"} · 2h`));
      head.append(who);
      card.append(head, el("p", "feedprev-text", text || "(no text yet)"));
      const foot = el("div", "feedprev-foot");
      if (v.chip) foot.append(el("span", "chip-btn", `Opens the ${v.chip}`));
      foot.append(el("span", "hint", reactors.length ? `Always reacts: ${reactors.join(", ")}` : "Reactors chosen at random"));
      card.append(foot);

      const count = el("div", `hint${text.length > vo.FEED_TEXT_MAX ? " error-text" : ""}`, `${String(v.text ?? "").length} / ${vo.FEED_TEXT_MAX} characters before filling in. Allowed placeholders: ${(spec?.placeholders ?? []).map((p) => `{${p}}`).join(" ") || "none"}.`);
      box.replaceChildren(card, count, ...problems.map((p) => el("div", "error-text", p)));
    };
    draw(_values);
    if (ctx.live) livePreview(box, ctx, draw);
    return { el: box, get: () => undefined };
  },
};

const conditionSummary = (r) => {
  const c = parse(r.condition, {});
  return Object.entries(c).map(([k, v]) => `${k}=${v}`).join(" ") || "any";
};

const FEED_TEMPLATES = {
  table: "feed_templates",
  label: "Feed templates",
  singular: "feed template",
  group: "Feed",
  icon: "💬",
  titleOf: (r) => truncate(r.text, 70),
  subOf: (r) => `${r.npc_id ? r.npc_id.replace(/^npc-/, "") : `pool(${parse(r.poster_pool, []).map((n) => n.replace(/^npc-/, "")).join(",")})`} · ${r.kind} · ${conditionSummary(r)}`,
  groupBy: (r) => r.trigger,
  groupOrder: () => vocab().TEMPLATE_TRIGGER_KEYS,
  sortBy: (r) => `${r.npc_id ?? "~"}${r.id}`,
  newRow: () => ({ id: "", npc_id: null, poster_pool: [], kind: "celebrate", trigger: "lesson_complete", condition: {}, text: "", chip: null, reactors: [], weight: 1 }),
  fields: (isNew) => [
    idField(isNew, "e.g. ft-hal-lesson-isotopes-1. Once published it can't be renamed."),
    sel("trigger", "Trigger", vocab().TEMPLATE_TRIGGER_KEYS, { required: true, affects: true, hint: "The event that creates this post." }),
    conditionField,
    sel("kind", "Kind", vocab().FEED_KINDS, { hint: "celebrate and milestone skew reactions to clap and love, tease to wow." }),
    txt("npc_id", "Poster", { nullable: true, suggest: { table: "npcs", column: "id" }, hint: "An NPC id. Leave empty to choose from the pool below." }),
    { key: "poster_pool", label: "Poster pool (when there is no poster)", type: "refs", kinds: "npcs", hint: 'Or just "learner": the post is written in the learner\'s own voice (streaks), with their avatar.' },
    area("text", "Text", 3, { required: true, hint: `Up to ${vocab().FEED_TEXT_MAX} characters. Write it speaking to the learner (“You finished…”) or about them (“Someone just…”). Put a lesson title in quotes: “{lesson}”.` }),
    sel("chip", "Button", vocab().FEED_CHIPS, { nullable: true, hint: "What the post's chip opens. Allowed chips depend on the trigger." }),
    { key: "reactors", label: "Always reacts", type: "refs", kinds: "npcs", hint: "For a unit milestone, the unit's teacher. Never the poster." },
    num("weight", "Weight", { min: 1, step: 1, hint: "Higher is picked more often among templates that match." }),
    templatePreview,
  ],
};

// ---------------------------------------------------------------------------
// blog pieces
// ---------------------------------------------------------------------------

const BLOCK_LABELS = { p: "Paragraph", h: "Heading", quote: "Quote", fact: "Did you know?", figure: "Figure", list: "List", next: "Closing teaser" };

const wordsIn = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
function blogWords(blocks) {
  const counted = vocab().COUNTED_BLOCK_TYPES;
  let n = 0;
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b || typeof b !== "object") continue;
    if (b.t === "list") for (const item of b.items ?? []) n += wordsIn(item);
    else if (counted.includes(b.t)) n += wordsIn(b.text);
  }
  return n;
}
const minutesFor = (words) => Math.max(1, Math.ceil(words / vocab().BLOG_LIMITS.wordsPerMinute));

const blockList = {
  key: "blocks",
  label: "Body",
  type: "list",
  itemName: "Block",
  hint: "Short paragraphs, a hook in the first two lines, a question or small surprise per screen. End with a closing teaser.",
  variants: {
    typeKey: "t",
    typeLabel: "Block",
    labels: BLOCK_LABELS,
    types: {
      p: { fields: [area("text", "Text", 3, { required: true })] },
      h: { fields: [txt("text", "Heading", { required: true })] },
      quote: { fields: [area("text", "Line in the author's voice", 2, { required: true })] },
      fact: { fields: [area("text", "Fact", 3, { required: true })] },
      figure: {
        fields: () => [
          sel("ref", "Picture", vocab().artIds.map((id) => ({ value: id, label: `${id} · ${vocab().artNames[id] ?? ""}` })), { required: true }),
          txt("caption", "Caption", { required: true }),
        ],
      },
      list: { fields: [{ key: "items", label: "Items", type: "strings" }] },
      next: {
        fields: [
          txt("label", "Button label", { required: true }),
          txt("lessonId", "Opens lesson", { nullable: true, suggest: { table: "lessons", column: "id" }, hint: "Exactly one of lesson or unit." }),
          txt("unitId", "Opens unit", { nullable: true, suggest: { table: "units", column: "id" } }),
        ],
      },
    },
  },
  itemLabel: (b) => `${truncate(b.text ?? b.caption ?? b.label ?? (b.items ?? []).join("; "), 60)}`,
  newItem: (type) => ({ t: type, ...(type === "figure" ? { ref: "atom", caption: "" } : type === "list" ? { items: [] } : type === "next" ? { label: "" } : { text: "" }) }),
  addLabel: "＋ Add block",
};

const blogComments = {
  key: "__children",
  label: "Comments (informational, 0 to 4)",
  type: "list",
  matchKey: "id",
  itemName: "Comment",
  hint: "From NPCs other than the author, one each, up to 200 characters: extra detail, a plain-words clarification, a pointer to a lesson, or a gentle myth correction. A piece may have none.",
  item: {
    fields: (item) => [
      txt("id", "Id", { required: true, readonly: !!item.created_at, hint: item.created_at ? undefined : "Unique across all comments, e.g. bc-the-smallest-thing-ray." }),
      txt("npc_id", "Commenter", { required: true, suggest: { table: "npcs", column: "id" } }),
      area("text", "Comment", 3, { required: true }),
      {
        key: "chip",
        label: "Chip",
        type: "group",
        optional: true,
        enableLabel: "Points at a lesson or an encyclopedia entry",
        preserve: false,
        fields: [txt("lessonId", "Lesson id", { nullable: true, suggest: { table: "lessons", column: "id" } }), txt("entryId", "Encyclopedia entry id", { nullable: true, suggest: { table: "encyclopedia_entries", column: "id" } })],
      },
    ],
  },
  itemLabel: (c) => `${(c.npc_id ?? "").replace(/^npc-/, "")}: ${truncate(c.text ?? "", 60)}`,
  newItem: () => ({ id: `bc-${Date.now().toString(36)}`, npc_id: "", text: "" }),
  onDuplicate: (copy) => {
    copy.id = `${copy.id}-copy`;
    delete copy.created_at;
    delete copy.updated_at;
  },
  addLabel: "＋ Add comment",
};

/** unlock = { trigger, lessonId | unitId | days }: the fields follow the chosen trigger. */
const unlockGroup = {
  key: "unlock",
  label: "Unlocks when",
  type: "group",
  preserve: false,
  fields: (cur) => [
    sel("trigger", "Trigger", vocab().BLOG_UNLOCK_TRIGGERS, { affects: true, hint: "none: open from the start. The first piece of a unit is none or its first lesson; the last one is unit_complete." }),
    ...(cur.trigger === "lesson_complete" ? [txt("lessonId", "Lesson id", { required: true, suggest: { table: "lessons", column: "id" } })] : []),
    ...(cur.trigger === "unit_complete" ? [txt("unitId", "Unit id", { required: true, suggest: { table: "units", column: "id" } })] : []),
    ...(cur.trigger === "streak" ? [sel("days", "Streak days", vocab().STREAK_DAYS)] : []),
  ],
};

function renderBlock(b, authorName) {
  switch (b.t) {
    case "h":
      return el("h4", null, b.text);
    case "quote": {
      const q = el("blockquote", null, `“${b.text ?? ""}”`);
      q.append(el("cite", null, ` ${authorName}`));
      return q;
    }
    case "fact": {
      const f = el("div", "readerprev-fact");
      f.append(el("strong", null, "Did you know? "), document.createTextNode(b.text ?? ""));
      return f;
    }
    case "figure": {
      const f = el("figure", "readerprev-figure");
      f.append(el("div", "readerprev-art", `${b.ref ?? "?"}`), el("figcaption", null, b.caption ?? ""));
      return f;
    }
    case "list": {
      const ul = el("ul");
      for (const item of b.items ?? []) ul.append(el("li", null, item));
      return ul;
    }
    case "next": {
      const n = el("div", "readerprev-next");
      n.append(el("span", "chip-btn", `${b.label ?? ""}`), el("span", "hint", ` opens ${b.lessonId ? `lesson ${b.lessonId}` : b.unitId ? `unit ${b.unitId}` : "nothing yet"}`));
      return n;
    }
    default:
      return el("p", null, b.text ?? "");
  }
}

/** The piece as the reader will show it, with the word count and reading time, the sources and the comments. */
const blogPreview = {
  key: "__preview",
  type: "custom",
  label: "Reader preview",
  build(_values, _notify, ctx) {
    const box = el("div", "readerprev");
    const draw = async (v) => {
      const vo = vocab();
      const npcMap = await npcs();
      const author = npcMap.get(v.npc_id)?.name ?? v.npc_id ?? "?";
      const words = blogWords(v.blocks);
      const { wordsMin, wordsMax, hookMax } = vo.BLOG_LIMITS;
      const ok = words >= wordsMin && words <= wordsMax;

      const readout = el("div", `readerprev-readout${ok ? "" : " bad"}`);
      readout.append(
        el("strong", null, `${words} words`),
        document.createTextNode(` · ${minutesFor(words)} min read (saved as read_min) · limit ${wordsMin} to ${wordsMax}`),
        document.createTextNode(` · hook ${String(v.hook ?? "").length}/${hookMax}`),
        document.createTextNode(` · ${(v.__links ?? []).length} source(s)`),
      );

      const page = el("article", "readerprev-page");
      page.append(el("div", "readerprev-cover", `cover: ${v.cover ?? "?"}${vo.artNames[v.cover] ? ` (${vo.artNames[v.cover]})` : ""}`));
      page.append(el("h3", null, v.title || "(no title)"), el("div", "hint", `by ${author} · ${minutesFor(words)} min`), el("p", "readerprev-hook", v.hook ?? ""));
      for (const b of Array.isArray(v.blocks) ? v.blocks : []) if (b && typeof b === "object") page.append(renderBlock(b, author));

      const comments = Array.isArray(v.__children) ? v.__children : [];
      if (comments.length) {
        const thread = el("div", "readerprev-comments");
        thread.append(el("div", "hint", `${comments.length} comment${comments.length === 1 ? "" : "s"}, read-only`));
        for (const c of comments) {
          const row = el("div", "readerprev-comment");
          row.append(el("strong", null, npcMap.get(c.npc_id)?.name ?? c.npc_id ?? "?"), document.createTextNode(`: ${c.text ?? ""}`));
          if (c.chip) row.append(el("span", "chip-btn", c.chip.lessonId ? `lesson ${c.chip.lessonId}` : c.chip.entryId ? `entry ${c.chip.entryId}` : "chip"));
          thread.append(row);
        }
        page.append(thread);
      } else page.append(el("div", "hint", "No comments on this piece."));
      box.replaceChildren(readout, page);
    };
    draw(_values);
    if (ctx.live) livePreview(box, ctx, draw);
    return { el: box, get: () => undefined };
  },
};

const BLOG_POSTS = {
  table: "blog_posts",
  label: "Blog pieces",
  singular: "blog piece",
  group: "Feed",
  icon: "📝",
  titleOf: (r) => r.title,
  subOf: (r) => `${(r.npc_id ?? "").replace(/^npc-/, "")} · ${r.read_min} min · ${parse(r.unlock, {}).trigger ?? "?"}`,
  groupBy: (r) => r.unit_id ?? "(no unit)",
  sortBy: (r) => String(r.position).padStart(4, "0"),
  newRow: () => ({ id: "", npc_id: "", unit_id: null, lesson_id: null, position: 0, title: "", hook: "", cover: "atom", read_min: 1, unlock: { trigger: "none" }, blocks: [{ t: "p", text: "" }, { t: "next", label: "" }], reactors: [] }),
  children: { table: "blog_comments", field: blogComments },
  links: {
    table: "blog_references",
    column: "reference_id",
    field: { type: "refs", kinds: "content_references", label: "Sources", hint: "At least one verified source (open it on Content references and mark it verified). Unverified sources block publishing." },
  },
  // read_min is always computed from the words, so it can never go stale.
  beforeSave(row) {
    row.read_min = minutesFor(blogWords(row.blocks));
  },
  fields: (isNew) => [
    idField(isNew, "e.g. blog-the-smallest-thing. Once published it can't be renamed."),
    txt("npc_id", "Author", { required: true, suggest: { table: "npcs", column: "id" }, hint: "The unit's teacher." }),
    txt("unit_id", "Unit", { nullable: true, suggest: { table: "units", column: "id" } }),
    txt("lesson_id", "Related lesson", { nullable: true, suggest: { table: "lessons", column: "id" } }),
    num("position", "Position in the unit", { min: 0, step: 1 }),
    txt("title", "Title", { required: true }),
    area("hook", "Hook (one line on the blog card)", 2, { required: true, hint: `Up to ${vocab().BLOG_LIMITS.hookMax} characters.` }),
    sel("cover", "Cover picture", vocab().artIds.map((id) => ({ value: id, label: `${id} · ${vocab().artNames[id] ?? ""}` })), { required: true, hint: "A picture from the lesson object art." }),
    num("read_min", "Reading time (min)", { readonly: true, hint: "Computed from the words when you save." }),
    unlockGroup,
    { key: "reactors", label: "Always reacts", type: "refs", kinds: "npcs", hint: "Never the author." },
    blockList,
    blogPreview,
  ],
};

export const FEED_TYPES = [FEED_TEMPLATES, BLOG_POSTS];

// ---------------------------------------------------------------------------
// chat nodes (docs/features/PHONE_SPEC.md section 5.2): what a teacher says on the phone and the replies that follow
// ---------------------------------------------------------------------------

const chatVocab = () => state.meta.chatVocab;

const chatReplies = {
  key: "replies",
  label: "Replies (the pills under the message)",
  type: "list",
  itemName: "Reply",
  hint: "Two to six, all of the same Type (chips, or reactions, or stickers, never a mix). A reply with an action and no next node is a link: it opens that page, sends nothing and is drawn as its own kind of button (keep at least one real reply beside it). Each goes to another node of this teacher (next), opens something (action), or both. A sign-off has none.",
  item: {
    fields: () => [
      sel("type", "Type", chatVocab().CHAT_REPLY_TYPES, { hint: `text: a chip with the label (the default). emoji: a sticker, the label is one of ${chatVocab().CHAT_STICKERS.join(", ")}. react: a reaction on the teacher's last message, the label is one of ${chatVocab().CHAT_REACTIONS.join(", ")}. A sticker or a reaction can end the story (no next, no action).` }),
      txt("label", "Label", { required: true, hint: `Text: up to ${chatVocab().CHAT_LIMITS.label} characters, as a phrase: "What's next?". Sticker or reaction: its id.` }),
      txt("next", "Goes to node", { nullable: true, suggest: { table: "chat_nodes", column: "id" }, hint: "A node of the same teacher (not an unprompted one)." }),
      {
        key: "action",
        label: "Action",
        type: "group",
        optional: true,
        enableLabel: "Opens something",
        preserve: false,
        fields: [
          sel("screen", "Opens", Object.keys(chatVocab().CHAT_ACTIONS), { required: true, hint: "next-lesson: the next lesson of the teacher's unit. mythbuster: a Quick Play round (id = a unit, empty = the teacher's own)." }),
          txt("id", "Id", { nullable: true, hint: "A lesson, path node, AtomDex entry or unit id; the app id for 'app'. Leave empty for next-lesson." }),
        ],
      },
    ],
  },
  itemLabel: (r) => `${r.label ?? ""} ${r.next ? `→ ${r.next.replace(/^chat-/, "")}` : r.action ? `→ opens ${r.action.screen}` : ""}`,
  newItem: () => ({ label: "" }),
  addLabel: "＋ Add reply",
};

const CHAT_NODES = {
  table: "chat_nodes",
  label: "Chat nodes",
  singular: "chat node",
  group: "Phone",
  icon: "📱",
  titleOf: (r) => truncate(r.text, 70),
  subOf: (r) => `${String(r.npc_id).replace(/^npc-/, "")} · ${r.kind}${r.trigger ? ` · ${r.trigger}` : ""}`,
  groupBy: (r) => r.npc_id,
  sortBy: (r) => String(r.position).padStart(4, "0"),
  newRow: () => ({ id: "", npc_id: "", kind: "reply", trigger: null, title: null, text: "", pose: "idle", replies: [], position: 0 }),
  fields: (isNew) => [
    idField(isNew, "e.g. chat-hal-isotope. Once published it can't be renamed."),
    txt("npc_id", "Teacher", { required: true, suggest: { table: "npcs", column: "id" } }),
    sel("kind", "Kind", chatVocab().CHAT_KINDS, { required: true, affects: true, hint: "greeting: opens the free chat (one per teacher; the learner can start any number of them). reply: an answer. unprompted: opens a story thread when its trigger happens. sign_off: ends the thread." }),
    txt("title", "Story title", { nullable: true, hint: `A story's first node only (unprompted needs one): the subject line of the thread in Chats, up to ${chatVocab().CHAT_TITLE_MAX} characters.` }),
    txt("trigger", "Trigger", { nullable: true, hint: "Unprompted only, what unlocks the story: app_installed:<app id>, unit_complete:<unit id>, lessons_completed:<n>, level_reached:<n> or welcome_back. Each unlocks once; the learner can replay it." }),
    area("text", "What the teacher says", 6, { required: true, hint: `Plain text, in the teacher's voice. A blank line starts a new bubble: a long message is several short ones (up to ${chatVocab().CHAT_LIMITS.parts}) that arrive one after another, each up to ${chatVocab().CHAT_LIMITS.text} characters. Nothing is filled in, so no {braces}.` }),
    sel("pose", "Pose", chatVocab().poses, { hint: "Used when the teacher is drawn beside the message." }),
    num("position", "Order within the teacher", { min: 0, step: 1 }),
    chatReplies,
  ],
};

// ---------------------------------------------------------------------------
// scan targets (docs/features/PHONE_SPEC.md section 8): what the Atom Scanner can scan, its elements and its sources
// ---------------------------------------------------------------------------

const scanVocab = () => state.meta.scanVocab;

const scanComposition = {
  key: "composition",
  label: "Made of (main elements first)",
  type: "list",
  itemName: "Element",
  hint: "Which elements are present, never how much: no percentages. Each symbol must be on the periodic table.",
  item: {
    fields: () => [
      txt("symbol", "Symbol", { required: true, hint: "e.g. Na" }),
      txt("note", "Note", { nullable: true, hint: `Up to ${scanVocab().SCAN_LIMITS.note} characters, e.g. "in sugars". No amounts.` }),
    ],
  },
  itemLabel: (r) => `${r.symbol ?? ""}${r.note ? ` · ${r.note}` : ""}`,
  newItem: () => ({ symbol: "" }),
  addLabel: "＋ Add element",
};

const SCAN_TARGETS = {
  table: "scan_targets",
  label: "Scan targets",
  singular: "scan target",
  group: "Phone",
  icon: "🔬",
  titleOf: (r) => r.name,
  subOf: (r) => `${r.scene} · ${parse(r.composition, []).map((c) => c.symbol).join(" ")}`,
  groupBy: (r) => r.scene,
  sortBy: (r) => String(r.position).padStart(4, "0"),
  newRow: () => ({ id: "", name: "", scene: "kitchen", object: "water", blurb: "", composition: [{ symbol: "" }], fun_fact: "", atomdex_entry_id: null, position: 0 }),
  links: {
    table: "scan_target_references",
    column: "reference_id",
    field: { type: "refs", kinds: "content_references", label: "Sources", hint: "At least one. Open each on Content references and mark it verified once you have checked it supports the claim; unverified sources block publishing." },
  },
  fields: (isNew) => [
    idField(isNew, "e.g. scan-banana. Once published it can't be renamed."),
    txt("name", "Name", { required: true, hint: `Up to ${scanVocab().SCAN_LIMITS.name} characters, e.g. "A banana".` }),
    sel("scene", "Scene", scanVocab().SCAN_SCENES, { required: true, hint: "Where it stands. The scene's picture and the thing's place in it are code (scan-scenes.ts); a new target also needs a place there (test:scanner checks)." }),
    sel("object", "Picture", scanVocab().artIds.map((id) => ({ value: id, label: `${id} · ${scanVocab().artNames[id] ?? ""}` })), { required: true, hint: "A picture from the lesson object art." }),
    area("blurb", "One line under the name", 2, { required: true, hint: `Up to ${scanVocab().SCAN_LIMITS.blurb} characters.` }),
    scanComposition,
    area("fun_fact", "Fun fact", 3, { required: true, hint: `Up to ${scanVocab().SCAN_LIMITS.funFact} characters. Only what the sources support; no percentages.` }),
    txt("atomdex_entry_id", "AtomDex entry", { nullable: true, suggest: { table: "encyclopedia_entries", column: "id" }, hint: "Optional: shows a See in AtomDex button. Leave empty when there is no matching entry." }),
    num("position", "Order within the scene", { min: 0, step: 1 }),
  ],
};

// ---------------------------------------------------------------------------
// safety cards (docs/features/PHONE_SPEC.md section 5.9) and map sites (section 5.8): sourced, and every source checked by a person before publishing
// ---------------------------------------------------------------------------

const safetyVocab = () => state.meta.safetyVocab;
const mapVocab = () => state.meta.mapVocab;

const SOURCES_LINK = (table, column, hint) => ({ table, column, field: { type: "refs", kinds: "content_references", label: "Sources", hint } });

const SAFETY_CARDS = {
  table: "safety_cards",
  label: "Safety cards",
  singular: "safety card",
  group: "Phone",
  icon: "🛟",
  titleOf: (r) => r.title,
  subOf: (r) => `${r.section} · ${parse(r.steps, []).length} lines`,
  groupBy: (r) => r.section,
  sortBy: (r) => String(r.position).padStart(4, "0"),
  newRow: () => ({ id: "", section: "basics", title: "", summary: "", steps: [""], icon: "ShieldTick", entry_id: null, position: 0 }),
  links: SOURCES_LINK("safety_card_references", "reference_id", "At least one. This is safety advice: word every line from the source, then open it on Content references and mark it verified once you have checked it says so. Unverified sources block publishing."),
  fields: (isNew) => [
    idField(isNew, "e.g. safety-time-distance-shielding. Once published it can't be renamed."),
    sel("section", "Section", safetyVocab().SAFETY_SECTIONS, { required: true, hint: "basics, happens (if something happens) or myths." }),
    txt("title", "Title", { required: true, hint: `Up to ${safetyVocab().SAFETY_LIMITS.title} characters.` }),
    txt("summary", "One line on the list", { required: true, hint: `Up to ${safetyVocab().SAFETY_LIMITS.summary} characters.` }),
    { key: "steps", label: "Lines on the card", type: "strings", hint: `${safetyVocab().SAFETY_LIMITS.minSteps} to ${safetyVocab().SAFETY_LIMITS.steps} short lines, each up to ${safetyVocab().SAFETY_LIMITS.step} characters. Plain sentences that follow the source.` },
    txt("icon", "Icon", { required: true, hint: "An icon name from the app's icon set, e.g. ShieldTick." }),
    txt("entry_id", "AtomDex entry", { nullable: true, suggest: { table: "encyclopedia_entries", column: "id" }, hint: "Optional: shows a See in AtomDex button." }),
    num("position", "Order within the section", { min: 0, step: 1 }),
  ],
};

const MAP_SITES = {
  table: "map_sites",
  label: "Map sites",
  singular: "map site",
  group: "Phone",
  icon: "🗺️",
  titleOf: (r) => r.name,
  subOf: (r) => `${r.kind} · ${r.place} · ${r.year}`,
  groupBy: (r) => r.kind,
  sortBy: (r) => String(r.position).padStart(4, "0"),
  newRow: () => ({ id: "", name: "", place: "", kind: "history", year: "", lat: 0, lon: 0, blurb: "", fact: "", entry_id: null, position: 0 }),
  links: SOURCES_LINK("map_site_references", "reference_id", "At least one. Open each on Content references and mark it verified once you have checked it supports the claim; unverified sources block publishing."),
  fields: (isNew) => [
    idField(isNew, "e.g. site-chernobyl. Once published it can't be renamed."),
    txt("name", "Name", { required: true, hint: `Up to ${mapVocab().MAP_LIMITS.name} characters.` }),
    txt("place", "Place", { required: true, hint: `City or region and country, up to ${mapVocab().MAP_LIMITS.place} characters.` }),
    sel("kind", "Kind", mapVocab().MAP_KINDS, { required: true, hint: "Sets the pin's colour." }),
    txt("year", "Year", { required: true, hint: `Text, up to ${mapVocab().MAP_LIMITS.year} characters, e.g. 1986 or 1938 to 1942.` }),
    num("lat", "Latitude", { step: 0.01, hint: "Decimal degrees, -90 to 90 (south is negative)." }),
    num("lon", "Longitude", { step: 0.01, hint: "Decimal degrees, -180 to 180 (west is negative)." }),
    area("blurb", "One line under the name", 2, { required: true, hint: `Up to ${mapVocab().MAP_LIMITS.blurb} characters.` }),
    area("fact", "Fact", 3, { required: true, hint: `Up to ${mapVocab().MAP_LIMITS.fact} characters. Only what the sources support; sober for accidents and the 1945 bombings, no graphic detail.` }),
    txt("entry_id", "AtomDex entry", { nullable: true, suggest: { table: "encyclopedia_entries", column: "id" }, hint: "Optional: shows a See in AtomDex button." }),
    num("position", "Order", { min: 0, step: 1 }),
  ],
};

export const CHAT_TYPES = [CHAT_NODES, SCAN_TARGETS, SAFETY_CARDS, MAP_SITES];
