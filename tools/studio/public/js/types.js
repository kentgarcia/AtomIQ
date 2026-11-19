// Editor configuration for every content type. Everything here is data for
// form.js (field specs) plus list-pane behaviour; there is no DOM code except
// the answer-options widget.

import { el, miniBtn } from "./core.js";
import { FEED_TYPES } from "./feed-types.js";

const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"];
const DIFFICULTY_EASY = ["easy", "medium", "hard"];
const QUESTION_TYPES = ["multiple_choice", "true_false", "matching", "fill_blank"];

const sel = (key, label, options, extra = {}) => ({ key, label, type: "select", options, ...extra });
const txt = (key, label, extra = {}) => ({ key, label, type: "text", ...extra });
const area = (key, label, rows = 3, extra = {}) => ({ key, label, type: "textarea", rows, ...extra });
const num = (key, label, extra = {}) => ({ key, label, type: "number", ...extra });

const idField = (isNew, hint) =>
  txt("id", "Id", {
    required: true,
    readonly: !isNew,
    hint: isNew ? (hint ?? "Lowercase-with-dashes. Once published it can't be renamed.") : "The id is fixed once the item exists.",
    placeholder: "kebab-case-id",
  });

const childIdField = (item) =>
  txt("id", "Id", {
    required: true,
    readonly: !!item.created_at,
    hint: item.created_at ? undefined : "Unique within this parent.",
    placeholder: "kebab-case-id",
  });

// ---------------------------------------------------------------------------
// answer options (quiz questions, MythBuster, assessment steps, battle questions)
// ---------------------------------------------------------------------------

/**
 * Options + correct answer for a question. The type decides the editor:
 * multiple choice → rows with a "correct" marker; true/false → a select;
 * anything else → raw JSON (no content uses matching/fill-blank yet).
 */
export function choiceField({ optionsKey = "options", answerKey = "correct_answer", typeKey = "type", forceType, label = "Answer options" } = {}) {
  return {
    key: `__choice_${optionsKey}`,
    type: "custom",
    merge: true,
    label,
    build(values, notify) {
      const type = forceType ?? values[typeKey] ?? "multiple_choice";
      const box = el("div", "widget choice");
      const state = {
        options: Array.isArray(values[optionsKey]) ? [...values[optionsKey]] : [],
        answer: values[answerKey],
      };

      if (type === "true_false") {
        const numeric = typeof state.answer === "number";
        const current = numeric ? state.answer === 0 : state.answer === false ? false : true;
        const select = el("select");
        select.append(new Option("True", "true"), new Option("False", "false"));
        select.value = current ? "true" : "false";
        select.addEventListener("change", () => notify());
        box.append(el("div", "hint", "True / false question: choose the correct statement."), select);
        return {
          el: box,
          get: () => {
            const isTrue = select.value === "true";
            return {
              [optionsKey]: state.options.length ? state.options : ["True", "False"],
              [answerKey]: numeric ? (isTrue ? 0 : 1) : isTrue,
            };
          },
        };
      }

      if (type !== "multiple_choice") {
        const mk = (text, value) => {
          const wrap = el("div");
          wrap.append(el("div", "hint", text));
          const t = el("textarea", "mono");
          t.rows = 3;
          t.value = JSON.stringify(value ?? null);
          t.addEventListener("input", () => notify());
          wrap.append(t);
          return { wrap, t };
        };
        const o = mk(`${optionsKey} (JSON)`, state.options);
        const a = mk(`${answerKey} (JSON)`, state.answer);
        box.append(el("div", "hint", `No structured editor for "${type}" questions yet.`), o.wrap, a.wrap);
        return {
          el: box,
          get: () => {
            const parse = (t) => {
              try {
                return JSON.parse(t.value);
              } catch {
                throw new Error(`${type} options/answer: invalid JSON`);
              }
            };
            return { [optionsKey]: parse(o.t), [answerKey]: parse(a.t) };
          },
        };
      }

      const render = () => {
        box.replaceChildren();
        state.options.forEach((opt, i) => {
          const row = el("div", "opt-row");
          const correct = Number(state.answer) === i;
          const mark = el("button", `correct-mark${correct ? " on" : ""}`, correct ? "✓" : "");
          mark.type = "button";
          mark.title = correct ? "Correct answer" : "Mark as correct";
          mark.setAttribute("aria-pressed", String(correct));
          mark.addEventListener("click", () => {
            state.answer = i;
            render();
            notify();
          });
          const input = el("input");
          input.type = "text";
          input.value = typeof opt === "string" ? opt : JSON.stringify(opt);
          input.placeholder = `Option ${i + 1}`;
          input.addEventListener("input", () => {
            state.options[i] = input.value;
            notify();
          });
          row.append(mark, input, miniBtn("✕", "Remove option", () => {
            state.options.splice(i, 1);
            if (Number(state.answer) === i) state.answer = 0;
            else if (Number(state.answer) > i) state.answer = Number(state.answer) - 1;
            render();
            notify();
          }));
          box.append(row);
        });
        if (!state.options.length) box.append(el("div", "hint", "No options yet."));
        box.append(miniBtn("＋ Add option", null, () => {
          state.options.push("");
          render();
          notify();
        }));
      };
      render();
      return { el: box, get: () => ({ [optionsKey]: [...state.options], [answerKey]: state.answer ?? 0 }) };
    },
  };
}

// ---------------------------------------------------------------------------
// lessons (curriculum v2): a lesson is an ordered list of cards. Teaching cards
// carry their own text; item cards point at the shared item bank (items table).
// ---------------------------------------------------------------------------

const CARD_KINDS = ["teach", "item", "sim"];
const CARD_LABELS = { teach: "Teach", item: "Item (from the bank)", sim: "Simulation" };

const lessonCards = {
  key: "__children",
  label: "Cards",
  type: "list",
  matchKey: "id",
  itemName: "Card",
  variants: {
    typeKey: "kind",
    typeLabel: "Card kind",
    labels: CARD_LABELS,
    types: Object.fromEntries(
      CARD_KINDS.map((kind) => [
        kind,
        {
          fields: (item) => [
            childIdField(item),
            txt("type", "Card type", { required: true, hint: kind === "item" ? "Same as the item's type, e.g. choice, predict, order." : "e.g. fact, reveal, scale-zoom, atom-builder, decay-wait, decay-chain, radiation-id." }),
            sel("tier", "Tier", ["core", "deeper"]),
            ...(kind === "item" ? [txt("item_id", "Item id", { required: true, hint: "An id from the items table.", suggest: { table: "items", column: "id" } }), num("scored", "Scored (1 or 0)", { min: 0, max: 1, step: 1 })] : []),
            { key: "data", label: "Data", type: "json" },
          ],
        },
      ]),
    ),
  },
  itemLabel: (c) => `${c.kind}: ${c.data?.title || c.data?.heading || c.item_id || c.type || c.id}`,
  newItem: (kind, all) => ({
    id: `${kind}-${all.length + 1}`,
    kind,
    type: kind === "item" ? "choice" : kind === "sim" ? "scale-zoom" : "fact",
    tier: "core",
    item_id: null,
    scored: 0,
    data: {},
  }),
  onDuplicate: (copy) => {
    copy.id = `${copy.id}-copy`;
    delete copy.created_at;
    delete copy.updated_at;
  },
  addLabel: "＋ Add card",
};

// ---------------------------------------------------------------------------
// quizzes / MythBuster
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// mazes
// ---------------------------------------------------------------------------

const monsterFields = (boss) => [
  txt("id", "Id", { required: true }),
  txt("name", "Name", { required: true }),
  sel("element", "Element", ["radiation", "nuclear", "atomic", "fusion", "fission", "plasma"]),
  num("maxHp", "Max HP", { min: 1 }),
  num("attackPower", "Attack power", { min: 0 }),
  txt("sprite", "Sprite (emoji)"),
  txt("color", "Colour", { hint: "Hex colour used in the maze artwork." }),
  txt("defeatMessage", "Defeat message"),
  ...(boss ? [{ key: "isBoss", label: "Boss", type: "checkbox", checkLabel: "This is the boss" }] : []),
];

const battleQuestions = {
  key: "questions",
  label: "Battle questions",
  type: "list",
  itemName: "Question",
  variants: {
    typeKey: "type",
    typeLabel: "Kind",
    labels: { quiz: "Quiz", scramble: "Word scramble" },
    types: {
      quiz: {
        fields: [
          area("question", "Question", 2, { required: true }),
          choiceField({ optionsKey: "options", answerKey: "correctAnswer", forceType: "multiple_choice" }),
        ],
      },
      scramble: {
        fields: [area("question", "Clue", 2, { required: true }), txt("answer", "Answer (the word)", { required: true }), txt("hint", "Hint")],
      },
    },
  },
  itemLabel: (q) => q.question || "question",
  newItem: (type) => (type === "scramble" ? { type, question: "", answer: "", hint: "" } : { type: "quiz", question: "", options: ["", "", "", ""], correctAnswer: 0 }),
  addLabel: "＋ Add battle question",
};

const mazeRooms = {
  key: "__children",
  label: "Rooms",
  type: "list",
  matchKey: "id",
  itemName: "Room",
  item: {
    fields: (item) => [
      childIdField(item),
      txt("title", "Title", { required: true }),
      area("description", "Description", 2, { required: true }),
      { key: "monster", label: "Monster", type: "group", fields: monsterFields(false) },
      battleQuestions,
      num("damage_per_correct", "Damage per correct answer", { min: 0 }),
      area("explanation", "Explanation (after the monster is defeated)", 2),
      txt("next_room_id", "Next room id", { nullable: true }),
      txt("alternative_path_id", "Alternative path room id", { nullable: true }),
      {
        key: "unlock_condition",
        label: "Unlock condition",
        type: "group",
        optional: true,
        enableLabel: "Room needs an unlock condition",
        fields: [sel("type", "Type", ["score_threshold", "time_limit"]), num("value", "Value")],
      },
    ],
  },
  itemLabel: (r) => r.title || r.id || "room",
  newItem: (_t, all) => ({
    id: `room-${all.length + 1}`,
    title: "",
    description: "",
    monster: { id: "", name: "", element: "radiation", maxHp: 50, attackPower: 10, sprite: "👾", color: "#9b59b6", defeatMessage: "" },
    questions: [],
    damage_per_correct: 25,
    explanation: "",
  }),
  onDuplicate: (copy) => {
    copy.id = `${copy.id}-copy`;
    delete copy.created_at;
    delete copy.updated_at;
  },
  addLabel: "＋ Add room",
};

// ---------------------------------------------------------------------------
// the registry
// ---------------------------------------------------------------------------

/** @type {Array<any>} */
export const TYPES = [
  {
    table: "lessons",
    label: "Lessons",
    singular: "lesson",
    group: "Learn",
    icon: "📘",
    titleOf: (r) => r.title,
    subOf: (r) => `${r.unit_id} · ${r.estimated_minutes} min`,
    newRow: () => ({ id: "", title: "", description: "", unit_id: "", estimated_minutes: 8, xp_reward: 40, teaches: [], relies_on: [] }),
    children: { table: "lesson_cards", field: lessonCards },
    fields: (isNew) => [
      idField(isNew),
      txt("title", "Title", { required: true }),
      area("description", "Description", 3, { required: true }),
      txt("unit_id", "Unit", { required: true, suggest: { table: "units", column: "id" } }),
      num("estimated_minutes", "Estimated minutes", { min: 1, required: true }),
      num("xp_reward", "XP reward", { min: 0 }),
      { key: "teaches", label: "Teaches (objective ids)", type: "strings" },
      { key: "relies_on", label: "Relies on (objective ids)", type: "strings" },
    ],
  },
  {
    table: "mythbuster_questions",
    label: "MythBuster",
    singular: "question",
    group: "Learn",
    icon: "🎯",
    pool: { scopeColumn: "difficulty", order: DIFFICULTY_EASY },
    titleOf: (r) => r.question || r.id,
    subOf: (r) => `${r.difficulty} · #${r.position + 1}`,
    newRow: () => ({ id: "", difficulty: "easy", type: "multiple_choice", question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", points: 5 }),
    fields: (isNew) => [
      idField(isNew, "e.g. mb-easy-q31"),
      sel("difficulty", "Difficulty pool", DIFFICULTY_EASY, { hint: "Changing the pool moves the question to the end of the new pool." }),
      sel("type", "Type", QUESTION_TYPES, { affects: true }),
      area("question", "Question", 3, { required: true }),
      choiceField(),
      area("explanation", "Explanation", 3),
      num("points", "Points", { min: 0 }),
    ],
    beforeSave(row, ctx) {
      const pool = ctx.rows.filter((r) => r.difficulty === row.difficulty && String(r.id) !== String(row.id));
      const prior = ctx.original;
      if (!prior || prior.difficulty !== row.difficulty) row.position = pool.reduce((m, r) => Math.max(m, r.position), -1) + 1;
    },
  },
  {
    table: "myths",
    label: "Myths",
    singular: "myth",
    group: "Learn",
    icon: "💭",
    titleOf: (r) => r.title,
    subOf: (r) => `${r.category || "—"} · ${r.difficulty}`,
    newRow: () => ({ id: "", title: "", myth_statement: "", reality: "", explanation: "", category: "", difficulty: "easy", sources: [], related_facts: [], related_lessons: [], tags: [], popularity: 5 }),
    fields: (isNew) => [
      idField(isNew),
      txt("title", "Title", { required: true }),
      area("myth_statement", "The myth (the false claim)", 2, { required: true }),
      area("reality", "The reality", 3, { required: true }),
      area("explanation", "Long explanation", 8),
      txt("category", "Category", { suggest: { table: "myths", column: "category" } }),
      sel("difficulty", "Difficulty", DIFFICULTY_EASY),
      num("popularity", "How common is this myth? (1–10)", { min: 1, max: 10 }),
      txt("image", "Image", { nullable: true }),
      {
        key: "sources",
        label: "Sources",
        type: "objects",
        addLabel: "＋ Add source",
        columns: [
          { key: "title", placeholder: "Title", width: "2fr" },
          { key: "url", placeholder: "https://…", width: "2fr" },
          { key: "author", placeholder: "Author", width: "1fr" },
          { key: "date", placeholder: "Date", width: "90px" },
          { key: "type", placeholder: "Type", width: "90px" },
        ],
      },
      { key: "related_lessons", label: "Related lessons", type: "refs", kinds: "lessons" },
      { key: "related_facts", label: "Related fact ids", type: "strings" },
      { key: "tags", label: "Tags", type: "strings" },
    ],
  },
  {
    table: "unit_statements",
    label: "Unit statements",
    singular: "statement",
    group: "Learn",
    icon: "🧪",
    groupBy: (r) => r.unit_id,
    sortBy: (r) => String(r.position).padStart(4, "0"),
    titleOf: (r) => r.statement || r.id,
    subOf: (r) => `${r.verdict} · #${r.position + 1}`,
    newRow: () => ({ id: "", unit_id: "", statement: "", verdict: "myth", explanation: "" }),
    fields: (isNew) => [
      idField(isNew, "e.g. inside-the-atom-s11"),
      txt("unit_id", "Unit (the theme)", { required: true, suggest: { table: "units", column: "id" } }),
      area("statement", "Statement", 2, { required: true, hint: "One sentence that fits on a swipe card (160 characters or fewer)." }),
      sel("verdict", "Is it a myth or a fact?", ["myth", "fact"], { hint: "Myth: the statement is false. Fact: it is true." }),
      area("explanation", "Why", 3, { hint: "Shown after the answer." }),
    ],
    beforeSave(row, ctx) {
      // A new statement, or one moved to another unit, goes to the end of that unit's deck
      const deck = ctx.rows.filter((r) => r.unit_id === row.unit_id && String(r.id) !== String(row.id));
      const prior = ctx.original;
      if (!prior || prior.unit_id !== row.unit_id) row.position = deck.reduce((m, r) => Math.max(m, r.position), -1) + 1;
    },
  },
  {
    table: "mazes",
    label: "Atom Maze",
    singular: "maze",
    group: "Explore",
    icon: "🌀",
    titleOf: (r) => r.title,
    subOf: (r) => r.theme,
    newRow: () => ({ id: "", title: "", description: "", theme: "", xp_reward: 200, player_max_hp: 100, boss: { id: "", name: "", element: "nuclear", maxHp: 100, attackPower: 20, sprite: "👑", color: "#e94560", defeatMessage: "", isBoss: true } }),
    children: { table: "maze_rooms", field: mazeRooms },
    fields: (isNew) => [
      idField(isNew),
      txt("title", "Title", { required: true }),
      area("description", "Description", 2, { required: true }),
      txt("theme", "Theme"),
      num("xp_reward", "XP reward", { min: 0 }),
      num("time_limit", "Time limit (seconds)", { nullable: true }),
      num("player_max_hp", "Player HP", { min: 1 }),
      { key: "boss", label: "Final boss", type: "group", fields: monsterFields(true) },
    ],
  },
  {
    table: "encyclopedia_entries",
    label: "Encyclopedia",
    singular: "entry",
    group: "Explore",
    icon: "📚",
    titleOf: (r) => r.term,
    subOf: (r) => `${r.category || "—"} · ${r.difficulty}`,
    newRow: () => ({ id: "", term: "", definition: "", category: "", difficulty: "beginner", related_terms: [], quick_facts: [], sources: [], related_myths: [] }),
    fields: (isNew) => [
      idField(isNew),
      txt("term", "Term", { required: true }),
      area("definition", "Definition", 6, { required: true }),
      txt("category", "Category", { suggest: { table: "encyclopedia_entries", column: "category" } }),
      sel("difficulty", "Difficulty", DIFFICULTY_LEVELS),
      { key: "quick_facts", label: "Quick facts", type: "strings" },
      area("debunking_snippet", "Debunking snippet", 2, { nullable: true }),
      txt("image", "Image", { nullable: true }),
      {
        key: "sources",
        label: "Sources",
        type: "objects",
        addLabel: "＋ Add source",
        columns: [
          { key: "organization", placeholder: "Organization (e.g. IAEA)", width: "1fr" },
          { key: "title", placeholder: "Title", width: "2fr" },
          { key: "url", placeholder: "https://…", width: "2fr" },
        ],
      },
      { key: "related_terms", label: "Related terms", type: "refs", kinds: "encyclopedia_entries" },
      { key: "related_myths", label: "Related myths", type: "refs", kinds: "myths" },
    ],
  },
  ...FEED_TYPES,
];

export const TYPE_BY_TABLE = Object.fromEntries(TYPES.map((t) => [t.table, t]));

/** Child tables (steps, questions, rooms) open their parent's editor. */
export const CHILD_TO_PARENT = Object.fromEntries(TYPES.filter((t) => t.children).map((t) => [t.children.table, t.table]));

/** Generic editor for any table with no dedicated type (Raw tables). */
export function rawType(tableMeta) {
  const json = new Set(tableMeta.jsonColumns ?? []);
  const label = ["title", "term", "name", "question", "id"].find((c) => tableMeta.columns.some((x) => x.name === c));
  return {
    table: tableMeta.name,
    label: tableMeta.name,
    singular: "row",
    group: "Raw tables",
    raw: true,
    titleOf: (r) => String(r[label] ?? r[tableMeta.pkCols[0]] ?? "(row)"),
    subOf: (r) => tableMeta.pkCols.map((c) => r[c]).join(" / "),
    newRow: () => ({}),
    fields: (isNew) =>
      tableMeta.columns
        .filter((c) => !["created_at", "updated_at"].includes(c.name))
        .map((c) => {
          const base = { key: c.name, label: c.name, required: c.notnull && !c.pk, readonly: c.pk && !isNew };
          if (json.has(c.name)) return { ...base, type: "json" };
          if (/int|real|num/i.test(c.type)) return { ...base, type: "number", nullable: !c.notnull };
          return { ...base, type: /description|content|explanation|definition|statement|message/i.test(c.name) ? "textarea" : "text", nullable: !c.notnull && !c.pk };
        }),
  };
}
