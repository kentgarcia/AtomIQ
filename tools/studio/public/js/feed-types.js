// Editors for the NPC feed (docs/NPC_FEED_SPEC.md §6): feed templates and blog pieces.
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
    idField(isNew, "e.g. ft-ada-lesson-isotopes-1. Once published it can't be renamed."),
    sel("trigger", "Trigger", vocab().TEMPLATE_TRIGGER_KEYS, { required: true, affects: true, hint: "The event that creates this post." }),
    conditionField,
    sel("kind", "Kind", vocab().FEED_KINDS, { hint: "celebrate and milestone skew reactions to clap and love, tease to wow." }),
    txt("npc_id", "Poster", { nullable: true, suggest: { table: "npcs", column: "id" }, hint: "An NPC id. Leave empty to choose from the pool below." }),
    { key: "poster_pool", label: "Poster pool (when there is no poster)", type: "refs", kinds: "npcs" },
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
