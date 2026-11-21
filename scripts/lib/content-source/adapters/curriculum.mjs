/**
 * Curriculum adapter v1 (docs/features/CONTENT_SOURCE_PHASE5_SPEC.md section 3): `units`, `unit_references`, `path_nodes`,
 * `objectives`, `items`, `lessons`, `lesson_references` and `lesson_cards`, in four kinds of file under units/<unit>/:
 *
 *   unit.atomiq                          the unit and its sources
 *   path.atomiq                          the map nodes
 *   objectives/NNN-<objective>.atomiq    an objective and its items
 *   lessons/NNN-<lesson>.atomiq          a lesson, its sources and its cards
 *
 * (units/<unit>/statements.atomiq belongs to the `statements` adapter.) Every file but unit.atomiq names its unit in the
 * header (`unit: inside-the-atom`). Positions are derived from file order (objectives by NNN within the unit, nodes and
 * cards and sources by their order in the file); a unit's own `position` is written because units are ordered by number,
 * not by folder name.
 *
 * `data` of an item or a card is written as one attribute per key (the keys are listed below and an unknown key is a
 * write error, never a silent loss): text as lines, long text as a block, lists of objects as a block of JSON lines.
 * A figure is `figure: <id>` (+ `figure_args`, `alt`, `caption`) or an inline `figure_scene` JSON block.
 */
import { decodeValue, encodeValue } from "../core/values.mjs";
import { defineAdapter } from "./engine.mjs";

const entry = (key, value, lines = null) => ({ key, value, lines, line: null, comments: [] });
const isRec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

// --- figure: { ref | scene, args?, altText?, caption?, source? } <-> figure, figure_args, figure_scene, alt, caption, figure_source
const FIGURE_KEYS = [
  { key: "figure", type: "id" },
  { key: "figure_args", type: "json" },
  { key: "figure_scene", type: "json" },
  { key: "alt", type: "text" },
  { key: "caption", type: "text" },
  { key: "figure_source", type: "json" },
];
const FIGURE_FIELDS = { ref: "figure", args: "figure_args", scene: "figure_scene", altText: "alt", caption: "caption", source: "figure_source" };

function encodeFigure(fig) {
  if (!isRec(fig)) throw new Error("figure must be an object");
  const extra = Object.keys(fig).filter((k) => !(k in FIGURE_FIELDS));
  if (extra.length) throw new Error(`figure has "${extra[0]}", which the lesson format cannot write`);
  if (("ref" in fig) === ("scene" in fig)) throw new Error("a figure has a ref or a scene, never both and never neither");
  const out = [];
  for (const [field, key] of Object.entries(FIGURE_FIELDS)) {
    if (fig[field] === undefined) continue;
    out.push(...encodeValue({ col: key, type: FIGURE_KEYS.find((k) => k.key === key).type }, fig[field]));
  }
  // canonical order: figure, figure_args, figure_scene, alt, caption, figure_source
  return out.sort((a, b) => FIGURE_KEYS.findIndex((k) => k.key === a.key) - FIGURE_KEYS.findIndex((k) => k.key === b.key));
}

function decodeFigure(byKey) {
  const fig = {};
  for (const [field, key] of Object.entries(FIGURE_FIELDS)) {
    const es = byKey.get(key);
    if (!es) continue;
    const got = decodeValue({ col: key, type: FIGURE_KEYS.find((k) => k.key === key).type }, es);
    if ("value" in got) fig[field] = got.value;
  }
  return Object.keys(fig).length ? fig : undefined;
}

/**
 * A `data` column written as attributes. `specs` is the canonical list: { key, data (the key inside `data`), type }.
 * With `rest`, every other key of `data` goes to one JSON attribute of that name (sim cards' `config`).
 */
function dataField(col, specs, { figure = null, rest = null, restWhen = () => false } = {}) {
  const keys = [...specs.map((s) => s.key), ...(figure ? FIGURE_KEYS.map((k) => k.key) : []), ...(rest ? [rest] : [])];
  return {
    col,
    type: "custom",
    keys,
    default: {},
    omitDefault: true,
    encode(data, row) {
      if (!isRec(data)) throw new Error(`${col} must be an object`);
      const left = new Set(Object.keys(data));
      const out = [];
      const emitFigure = () => {
        if (figure && left.has("figure")) {
          left.delete("figure");
          out.push(...encodeFigure(data.figure));
        }
      };
      for (const s of specs) {
        if (data[s.data] !== undefined) {
          left.delete(s.data);
          out.push(...encodeValue({ col: s.key, type: s.type }, data[s.data]));
        }
        if (s.key === figure) emitFigure();
      }
      emitFigure();
      if (left.size) {
        if (!(rest && restWhen(row))) throw new Error(`${col} has "${[...left][0]}", which the lesson format cannot write for ${row.kind ? `a ${row.kind} ` : "an "}${row.type} (add it to the adapter's list)`);
        out.push(...encodeValue({ col: rest, type: "json" }, Object.fromEntries([...left].map((k) => [k, data[k]]))));
      }
      return out;
    },
    decode(entries) {
      const byKey = new Map();
      for (const e of entries) {
        if (!byKey.has(e.key)) byKey.set(e.key, []);
        byKey.get(e.key).push(e);
      }
      const data = {};
      for (const s of specs) {
        const es = byKey.get(s.key);
        if (!es) continue;
        const got = decodeValue({ col: s.key, type: s.type }, es);
        if ("value" in got) data[s.data] = got.value;
      }
      if (figure) {
        const f = decodeFigure(byKey);
        if (f) data.figure = f;
      }
      if (rest && byKey.has(rest)) {
        const got = decodeValue({ col: rest, type: "json" }, byKey.get(rest));
        if (isRec(got.value)) Object.assign(data, got.value);
      }
      return data;
    },
  };
}

const S = (key, type, data = key) => ({ key, type, data });

// item data, by key (canonical order). `figure` goes after `prompt`/`statement`.
const ITEM_SPECS = [
  S("prompt", "prose"),
  S("statement", "prose"),
  S("input", "text"),
  S("mode", "text"),
  S("options", "jsonl"),
  S("bank", "jsonl"),
  S("buckets", "jsonl"),
  S("items", "jsonl"),
  S("pairs", "jsonl"),
  S("scene", "json"),
  S("targets", "jsonl"),
  S("answer", "text"),
  S("animate_on_correct", "json", "animateOnCorrect"),
  S("explanation", "prose"),
];
const CARD_SPECS = [
  S("title", "text"),
  S("speaker", "id"),
  S("tag", "text"),
  S("predicts", "id", "predictCardId"),
  S("figure_at", "int", "figureAt"),
  S("connected", "json"),
  S("visual", "json"),
  S("task", "text"),
  S("hint", "text"),
  S("body", "prose"),
];

const itemData = dataField("data", ITEM_SPECS, { figure: "prompt" });
const cardData = dataField("data", CARD_SPECS, { figure: "predicts", rest: "config", restWhen: (row) => row.kind === "sim" });

// a unit's guidebook: { summary, termIds, ...extra }
const guidebook = {
  col: "guidebook",
  type: "custom",
  keys: ["summary", "terms", "guidebook_extra"],
  default: {},
  omitDefault: true,
  encode(g) {
    if (!isRec(g)) throw new Error("guidebook must be an object");
    const { summary, termIds, ...extra } = g;
    const out = [];
    if (summary !== undefined) out.push(...encodeValue({ col: "summary", type: "prose" }, summary));
    if (termIds !== undefined) out.push(...encodeValue({ col: "terms", type: "list" }, termIds));
    if (Object.keys(extra).length) out.push(...encodeValue({ col: "guidebook_extra", type: "json" }, extra));
    return out;
  },
  decode(entries) {
    const by = (k) => entries.filter((e) => e.key === k);
    const g = {};
    if (by("summary").length) g.summary = decodeValue({ col: "summary", type: "prose" }, by("summary")).value;
    if (by("terms").length) g.termIds = decodeValue({ col: "terms", type: "list" }, by("terms")).value;
    if (by("guidebook_extra").length) Object.assign(g, decodeValue({ col: "guidebook_extra", type: "json" }, by("guidebook_extra")).value);
    return g;
  },
};

const pad = (i) => String((i + 1) * 10).padStart(3, "0");
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byPos = (a, b) => a.position - b.position;

export const curriculumAdapter = defineAdapter({
  name: "curriculum",
  version: 1,
  dir: "units",
  owns: (rel) => /^units\/[^/]+\/(unit|path)\.atomiq$/.test(rel) || /^units\/[^/]+\/(objectives|lessons)\/[^/]+\.atomiq$/.test(rel),
  scope: [{ col: "unit_id", key: "unit", type: "id", nullable: true }],
  records: [
    {
      keyword: "unit",
      table: "units",
      id: ["id"],
      fields: [
        { col: "position", type: "int" },
        { col: "title", type: "text", translatable: true },
        { col: "subtitle", type: "text", default: "", omitDefault: true, translatable: true },
        { col: "icon", type: "text", default: "", omitDefault: true },
        { col: "tone", type: "text", default: "primary", omitDefault: true },
        { col: "teacher_npc_id", key: "teacher", type: "id", nullable: true },
        { col: "goal", type: "text", default: "", omitDefault: true, translatable: true },
        guidebook,
        { col: "description", type: "prose", default: "", translatable: true },
      ],
    },
    {
      keyword: "source",
      table: "unit_references",
      id: ["reference_id"],
      parent: { keyword: "unit", map: { unit_id: "id" } },
      position: { col: "position", scope: ["unit_id"], base: 0 },
      fields: [],
    },
    {
      keyword: "objective",
      table: "objectives",
      id: ["id"],
      scope: ["unit_id"],
      position: { col: "position", scope: ["unit_id"], base: 0 },
      fields: [
        { col: "statement", type: "text", translatable: true },
        { col: "misconception", type: "text", nullable: true, translatable: true },
      ],
    },
    {
      keyword: "item",
      table: "items",
      id: ["id"],
      parent: { keyword: "objective", map: { objective_id: "id" } },
      fields: [
        { col: "type", type: "id" },
        { col: "difficulty", type: "int", default: 1, omitDefault: true },
        { col: "surfaces", type: "list" },
        { col: "reference_ids", key: "references", type: "list" },
        { ...itemData, translatable: true },
      ],
    },
    {
      keyword: "lesson",
      table: "lessons",
      id: ["id"],
      scope: ["unit_id"],
      fields: [
        { col: "title", type: "text", translatable: true },
        { col: "estimated_minutes", key: "minutes", type: "int" },
        { col: "xp_reward", key: "xp", type: "int", default: 0, omitDefault: true },
        { col: "teaches", type: "list" },
        { col: "relies_on", type: "list" },
        { col: "description", type: "prose", default: "", translatable: true },
      ],
    },
    {
      keyword: "cite",
      table: "lesson_references",
      id: ["reference_id"],
      parent: { keyword: "lesson", map: { lesson_id: "id" } },
      position: { col: "position", scope: ["lesson_id"], base: 0 },
      fields: [{ col: "supports", type: "text", default: "", omitDefault: true, translatable: true }],
    },
    {
      keyword: "card",
      table: "lesson_cards",
      id: ["id"],
      parent: { keyword: "lesson", map: { lesson_id: "id" } },
      position: { col: "position", scope: ["lesson_id"], base: 0 },
      fields: [
        { col: "kind", type: "id" },
        { col: "type", type: "id" },
        { col: "tier", type: "text", default: "core", omitDefault: true },
        { col: "item_id", key: "item", type: "id", nullable: true },
        { col: "scored", type: "int", default: 1, omitDefault: true },
        { ...cardData, translatable: true },
      ],
    },
    {
      keyword: "node",
      table: "path_nodes",
      id: ["id"],
      scope: ["unit_id"],
      position: { col: "position", scope: ["unit_id"], base: 0 },
      fields: [
        { col: "kind", type: "id" },
        { col: "lesson_id", key: "lesson", type: "id", nullable: true },
        { col: "config", type: "json", default: {}, omitDefault: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const units = (rowsByTable.units ?? []).slice().sort(byPos);
    const objectives = rowsByTable.objectives ?? [];
    const items = rowsByTable.items ?? [];
    const lessons = rowsByTable.lessons ?? [];
    const cards = rowsByTable.lesson_cards ?? [];
    const nodes = rowsByTable.path_nodes ?? [];
    const lessonCites = rowsByTable.lesson_references ?? [];
    const unitCites = rowsByTable.unit_references ?? [];
    const files = [];
    for (const u of units) {
      const dir = `units/${u.id}`;
      files.push({
        path: `${dir}/unit.atomiq`,
        scope: { unit_id: null },
        items: [
          { keyword: "unit", row: u },
          ...unitCites.filter((r) => r.unit_id === u.id).sort(byPos).map((row) => ({ keyword: "source", row })),
        ],
      });
      const unitNodes = nodes.filter((n) => n.unit_id === u.id).sort(byPos);
      if (unitNodes.length) files.push({ path: `${dir}/path.atomiq`, scope: { unit_id: u.id }, items: unitNodes.map((row) => ({ keyword: "node", row })) });
      objectives
        .filter((o) => o.unit_id === u.id)
        .sort(byPos)
        .forEach((o, i) =>
          files.push({
            path: `${dir}/objectives/${pad(i)}-${o.id}.atomiq`,
            scope: { unit_id: u.id },
            items: [{ keyword: "objective", row: o }, ...items.filter((it) => it.objective_id === o.id).sort(byId).map((row) => ({ keyword: "item", row }))],
          }),
        );
      // lessons in the order the map plays them, then any that no node uses
      const firstNode = new Map();
      for (const n of unitNodes) if (n.lesson_id && !firstNode.has(n.lesson_id)) firstNode.set(n.lesson_id, n.position);
      lessons
        .filter((l) => l.unit_id === u.id)
        .sort((a, b) => (firstNode.get(a.id) ?? 1e9) - (firstNode.get(b.id) ?? 1e9) || byId(a, b))
        .forEach((l, i) =>
          files.push({
            path: `${dir}/lessons/${pad(i)}-${l.id}.atomiq`,
            scope: { unit_id: u.id },
            items: [
              { keyword: "lesson", row: l },
              ...lessonCites.filter((r) => r.lesson_id === l.id).sort(byPos).map((row) => ({ keyword: "cite", row })),
              ...cards.filter((c) => c.lesson_id === l.id).sort(byPos).map((row) => ({ keyword: "card", row })),
            ],
          }),
        );
    }
    return files;
  },
});
