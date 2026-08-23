// AtomIQ Content Studio — frontend logic (vanilla ES modules, no deps).

const $ = (sel) => document.querySelector(sel);
const api = async (path, opts) => {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
};

const state = { meta: [], table: null, rows: [], row: null, dirty: false };

function toast(msg, kind = "") {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), 3200);
}

function setView(name) {
  state.view = name;
  $("#editor-view").hidden = name !== "editor";
  $("#query-view").hidden = name !== "query";
}

// ---------------------------------------------------------------------------
// Sidebar / tables
// ---------------------------------------------------------------------------

async function loadMeta() {
  state.meta = (await api("/api/meta")).tables;
  renderTables();
}

function currentTableMeta() {
  return state.meta.find((t) => t.name === state.table);
}

function renderTables() {
  const nav = $("#table-list");
  nav.innerHTML = "";
  const total = state.meta.reduce((n, t) => n + t.count, 0);
  $("#db-info").textContent = `${state.meta.length} tables · ${total} rows`;
  for (const t of state.meta) {
    const b = document.createElement("button");
    b.innerHTML = `<span>${t.name}</span><span class="count">${t.count}</span>`;
    b.classList.toggle("active", t.name === state.table);
    b.onclick = () => selectTable(t.name);
    nav.append(b);
  }
}

async function selectTable(name) {
  state.table = name;
  renderTables();
  $("#rows-sidebar").hidden = false;
  setView(state.view || "editor");
  $("#search").value = "";
  $("#editor-title").textContent = `${name} — select a row`;
  await loadRows();
}

function titleFor(row, meta) {
  const labelCol = ["title", "term", "name", "question", "id"].find(
    (c) => meta.columns.some((col) => col.name === c),
  );
  return String(row[labelCol] ?? row[meta.pkCols[0]] ?? "(untitled)");
}

function subFor(row) {
  return Object.entries(row)
    .filter(([k]) => !["title", "term", "name", "id"].includes(k))
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v.slice(0, 60) : v}`)
    .join(" · ");
}

function pkKey(row, meta) {
  return meta.pkCols.map((c) => String(row[c])).join("~");
}

async function loadRows() {
  const q = $("#search").value.trim();
  const meta = currentTableMeta();
  const data = await api(`/api/rows/${meta.name}?limit=500${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  state.rows = data.rows;
  $("#row-count").textContent = `${data.rows.length} of ${data.total}`;
  const ul = $("#rows");
  ul.innerHTML = "";
  for (const row of data.rows) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.className = "row";
    b.innerHTML = `<span class="title"></span><span class="sub"></span>`;
    b.querySelector(".title").textContent = titleFor(row, meta);
    b.querySelector(".sub").textContent = subFor(row);
    if (state.row && pkKey(row, meta) === pkKey(state.row, meta)) b.classList.add("active");
    b.onclick = () => openRow(row, meta);
    li.append(b);
    ul.append(li);
  }
}

// ---------------------------------------------------------------------------
// Structured widgets (ported from the legacy content editor)
// ---------------------------------------------------------------------------

const REF_KINDS = {
  myths: { sql: "SELECT id, title AS label FROM myths ORDER BY title" },
  lessons: { sql: "SELECT id, title AS label FROM lessons ORDER BY title" },
  entries: { sql: "SELECT id, term AS label FROM encyclopedia_entries ORDER BY term" },
  articles: { sql: "SELECT id, title AS label FROM articles ORDER BY title" },
  posts: { sql: "SELECT id, title AS label FROM posts ORDER BY title" },
};
const refCache = {};
async function refOptions(kind) {
  if (!REF_KINDS[kind]) return [];
  if (!refCache[kind]) {
    try {
      const { rows } = await api("/api/query", { method: "POST", body: { sql: REF_KINDS[kind].sql } });
      refCache[kind] = rows.map((r) => ({ id: r.id, label: r.label || r.id }));
    } catch { refCache[kind] = []; }
  }
  return refCache[kind];
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function miniBtn(label, title) {
  const b = el("button", "mini", label);
  b.type = "button";
  if (title) b.title = title;
  return b;
}

/** Chip list of free-form strings (tags, key points, quick facts…). */
function stringListWidget(value) {
  let items = Array.isArray(value) ? value.filter(Boolean) : [];
  const box = el("div", "widget");
  const render = () => {
    box.innerHTML = "";
    const chips = el("div", "chips");
    items.forEach((t, i) => {
      const c = el("span", "chip", t);
      const x = miniBtn("✕", "Remove");
      x.onclick = () => { items.splice(i, 1); render(); };
      c.append(x);
      chips.append(c);
    });
    if (!items.length) chips.append(el("span", "hint", "none yet"));
    const input = el("input");
    input.placeholder = "add… ↵";
    const add = () => {
      const v = input.value.trim();
      if (v && !items.includes(v)) items.push(v);
      input.value = "";
      render();
      input.focus();
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });
    input.addEventListener("blur", () => { if (input.value.trim()) add(); });
    box.append(chips, input);
  };
  render();
  return { el: box, get: () => items };
}

/** Chip multi-select of ids from another table (related_myths, prerequisites…). */
async function refboxWidget(selectedIds, kinds) {
  const groupList = (Array.isArray(kinds) ? kinds : [kinds]).map((k) => ({ kind: k, options: [] }));
  const box = el("div", "widget");
  let selected = (Array.isArray(selectedIds) ? selectedIds : []).filter(Boolean);
  const render = () => {
    box.innerHTML = "";
    const meta = new Map(groupList.flatMap((g) => g.options).map((o) => [o.id, o.label]));
    const chips = el("div", "chips");
    selected.forEach((id) => {
      const c = el("span", "chip", `${meta.get(id) || id}`);
      c.title = id;
      const x = miniBtn("✕", "Remove");
      x.onclick = () => { selected = selected.filter((v) => v !== id); render(); };
      c.append(x);
      chips.append(c);
    });
    if (!selected.length) chips.append(el("span", "hint", "none linked yet"));
    const sel = el("select");
    sel.append(new Option("— link an item —", ""));
    for (const g of groupList) {
      if (!g.options.length) continue;
      const og = el("optgroup");
      og.label = g.kind;
      g.options.filter((o) => !selected.includes(o.id))
        .forEach((o) => og.append(new Option(`${o.label} · ${o.id}`, o.id)));
      if (og.children.length) sel.append(og);
    }
    sel.onchange = () => { if (sel.value && !selected.includes(sel.value)) { selected.push(sel.value); render(); } };
    box.append(chips, sel);
  };
  await Promise.all(groupList.map(async (g) => { g.options = await refOptions(g.kind); }));
  render();
  return { el: box, get: () => selected };
}

/** Row editor for sources arrays ([{organization,title,url}]). */
function sourcesWidget(value) {
  let rows = Array.isArray(value) ? value.filter(Boolean) : [];
  const box = el("div", "widget sources");
  const collect = () => Array.from(box.querySelectorAll(".src-row")).map((r) => ({
    organization: r.querySelector(".s-org").value.trim(),
    title: r.querySelector(".s-title").value.trim(),
    url: r.querySelector(".s-url").value.trim(),
  })).filter((s) => s.organization || s.title || s.url);
  const render = () => {
    box.innerHTML = "";
    rows.forEach((_s, i) => {
      const row = el("div", "src-row");
      row.innerHTML = `
        <input class="s-org" placeholder="Organization (e.g. IAEA)" />
        <input class="s-title" placeholder="Title" />
        <input class="s-url" placeholder="https://…" spellcheck="false" />`;
      const org = row.querySelector(".s-org"), t = row.querySelector(".s-title"), u = row.querySelector(".s-url");
      org.value = rows[i].organization || ""; t.value = rows[i].title || ""; u.value = rows[i].url || "";
      const del = miniBtn("✕", "Remove source");
      del.onclick = () => { rows = collect(); rows.splice(i, 1); render(); };
      row.append(del);
      row.querySelectorAll("input").forEach((inp) =>
        inp.addEventListener("input", () => { rows = collect(); }));
      box.append(row);
    });
    const add = miniBtn("＋ Add source");
    add.onclick = () => { rows = collect(); rows.push({ organization: "", title: "", url: "" }); render(); };
    box.append(add);
  };
  render();
  return { el: box, get: () => collect() };
}

/** Name / Title / Avatar inputs for author objects. */
function authorWidget(value) {
  const a = value || {};
  const box = el("div", "widget author");
  box.innerHTML = `
    <input class="a-name" placeholder="Name (e.g. Dr. Sarah Chen)" />
    <input class="a-title" placeholder="Title (optional)" />
    <input class="a-avatar" placeholder="Avatar — @/assets/… path or https://…" />`;
  box.querySelector(".a-name").value = a.name || "";
  box.querySelector(".a-title").value = a.title || "";
  box.querySelector(".a-avatar").value = a.avatar || "";
  const get = () => ({
    name: box.querySelector(".a-name").value,
    ...(box.querySelector(".a-title").value ? { title: box.querySelector(".a-title").value } : {}),
    avatar: box.querySelector(".a-avatar").value || undefined,
  });
  return { el: box, get };
}

/** Per-type form for lesson step payloads (briefing → debrief). */
function stepDataWidget(data, getType) {
  const box = el("div", "widget subform");
  const parse = () => { try { return typeof data === "string" ? JSON.parse(data) : (data || {}); } catch { return {}; } };
  let obj = parse();

  const num = (label, key, attrs = "") => {
    const f = el("label", "inline");
    f.textContent = label;
    const i = el("input"); i.type = "number"; Object.entries(attrs).forEach(([k, v]) => i.setAttribute(k, v));
    i.value = obj[key] ?? 0;
    i.addEventListener("input", () => { obj[key] = Number(i.value); });
    f.append(i);
    return f;
  };
  const txt = (label, key, ph = "") => {
    const f = el("label", "inline");
    f.textContent = label;
    const i = el("input"); i.placeholder = ph;
    i.value = obj[key] ?? "";
    i.addEventListener("input", () => { obj[key] = i.value; });
    f.append(i);
    return f;
  };
  const ta = (label, key, ph = "", rows = 3) => {
    const f = el("label", "inline block");
    f.textContent = label;
    const i = el("textarea"); i.rows = rows; i.placeholder = ph;
    i.value = obj[key] ?? "";
    i.addEventListener("input", () => { obj[key] = i.value; });
    f.append(i);
    return f;
  };
  const list = (label, key) => {
    const wrap = el("div", "block");
    const head = el("strong", null, label);
    const w = stringListWidget(obj[key]);
    wrap.append(head, w.el);
    // keep obj in sync through the chip widget's live mutations
    const obs = setInterval(() => { obj[key] = w.get(); }, 400);
    obs; // cleaned up implicitly when DOM node detached
    return wrap;
  };
  const optRows = (keyOfLabel, correctKey, numericCorrect) => {
    const wrap = el("div", "block");
    wrap.append(el("strong", null, "Options"));
    const render = () => {
      wrap.querySelectorAll(".opt-row,.opt-add").forEach((n) => n.remove());
      (obj.options || []).forEach((o, i) => {
        const row = el("div", "opt-row");
        const inp = el("input");
        inp.placeholder = "Option text…";
        inp.value = typeof o === "object" ? (o.label ?? "") : o;
        const dot = el("span", "dot");
        const mark = () => {
          const cur = obj[correctKey];
          const on = numericCorrect ? Number(cur) === i : String(cur) === String(typeof o === "object" ? o.id : i);
          dot.classList.toggle("on", on);
        };
        inp.addEventListener("input", () => {
          obj.options[i] = typeof o === "object" ? { ...o, label: inp.value } : inp.value;
        });
        const setCorrect = miniBtn("●", "Mark as correct");
        setCorrect.onclick = () => {
          obj[correctKey] = numericCorrect ? i : (typeof o === "object" ? o.id : i);
          render();
        };
        const del = miniBtn("✕", "Remove option");
        del.onclick = () => { obj.options.splice(i, 1); render(); };
        mark();
        row.append(inp, dot, setCorrect, del);
        wrap.append(row);
      });
      const add = miniBtn("＋ Add option");
      add.onclick = () => {
        obj.options = Array.isArray(obj.options) ? obj.options : [];
        obj.options.push(typeof (obj.options[0] ?? "") === "object" || keyOfLabel === "obj" ? { id: `opt${obj.options.length + 1}`, label: "" } : "");
        render();
      };
      wrap.append(add);
    };
    render();
    return wrap;
  };

  const render = () => {
    box.innerHTML = "";
    const t = getType();
    switch (t) {
      case "briefing":
        box.append(txt("Topic", "topic", "e.g. Background Radiation"),
          txt("Mission", "mission", "e.g. Discover Natural Radiation!"),
          txt("Icon", "icon", "iconsax name, e.g. Sun"));
        break;
      case "myth_buster":
        box.append(txt("Myth (the false claim)", "myth", "e.g. All radiation is man-made"),
          txt("Reality (the truth)", "reality", "e.g. 80% of exposure is natural"),
          ta("Explanation", "explanation", "Why it's a myth…", 4),
          txt("Image URL", "image", "https://… (optional)"));
        break;
      case "micro_learn":
        box.append(txt("Title", "title"), txt("Image URL", "image", "https://… (optional)"),
          ta("Content", "content", "Body text…", 5),
          list("Key points", "keyPoints"));
        break;
      case "lab":
        box.append(txt("Title", "title"), txt("Correct answer (option id)", "correctAnswer", "e.g. denver"),
          ta("Description", "description", "Context / story…", 3),
          ta("Task", "task", "What the learner should work out…", 3));
        box.append(labOptions());
        box.append(ta("Explanation", "explanation", "Shown after answering…", 4));
        break;
      case "assessment":
        box.append(ta("Question", "question", "The question…", 3));
        box.append(optRows(null, "correctIndex", true));
        box.append(num("Correct index (0-based)", "correctIndex", { min: 0, step: 1 }),
          ta("Explanation", "explanation", "Shown after answering…", 4),
          txt("Image URL", "image", "https://… (optional)"));
        break;
      case "debrief": {
        obj.rewards = obj.rewards || {};
        const xp = num("XP reward", "__xp", { min: 0, step: 10 });
        xp.querySelector("input").value = obj.rewards.xp ?? 0;
        const st = num("Stars (0–5)", "__stars", { min: 0, max: 5, step: 1 });
        st.querySelector("input").value = obj.rewards.stars ?? 3;
        xp.querySelector("input").addEventListener("input", (e) => { obj.rewards.xp = Number(e.target.value); });
        st.querySelector("input").addEventListener("input", (e) => { obj.rewards.stars = Number(e.target.value); });
        box.append(txt("Title", "title", "e.g. Radiation Reality Check!"),
          ta("Message", "message", "Congratulatory message…", 3), xp, st);
        break;
      }
      default:
        box.append(el("span", "hint", `No structured form for "${t}" — edit as JSON below.`));
        const fallback = el("textarea", "tall");
        fallback.value = pretty(JSON.stringify(obj));
        fallback.addEventListener("input", () => { try { obj = JSON.parse(fallback.value); } catch {} });
        box.append(fallback);
    }
  };
  function labOptions() {
    const wrap = el("div", "block");
    wrap.append(el("strong", null, "Options (id · label · icon)"));
    obj.options = Array.isArray(obj.options) ? obj.options : [];
    const render = () => {
      wrap.querySelectorAll(".opt-row,.opt-add").forEach((n) => n.remove());
      obj.options.forEach((o, i) => {
        const row = el("div", "opt-row lab");
        ["id", "label", "icon"].forEach((k) => {
          const inp = el("input");
          inp.placeholder = k;
          inp.value = o[k] ?? "";
          inp.addEventListener("input", () => { obj.options[i][k] = inp.value; });
          row.append(inp);
        });
        const del = miniBtn("✕", "Remove");
        del.onclick = () => { obj.options.splice(i, 1); render(); };
        row.append(del);
        wrap.append(row);
      });
      const add = miniBtn("＋ Add option");
      add.onclick = () => { obj.options.push({ id: `opt${obj.options.length + 1}`, label: "" }); render(); };
      wrap.append(add);
    };
    render();
    return wrap;
  }
  render();
  return { el: box, get: () => JSON.stringify(cleanEmpty(obj)), rerender: render };
}

function cleanEmpty(o) {
  if (Array.isArray(o)) return o.map(cleanEmpty);
  if (o && typeof o === "object") {
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (!k.startsWith("__") && v !== "" && v != null) out[k] = cleanEmpty(v);
    }
    return out;
  }
  return o;
}

/** Quiz/mythbuster question options + correct_answer, per question type. */
function questionAnswerWidget(optionsVal, answerVal, getType) {
  const box = el("div", "widget subform");
  let opts = (() => { try { return JSON.parse(optionsVal ?? "null"); } catch { return null; } })();
  if (!Array.isArray(opts)) opts = [];
  let answer = (() => { try { return typeof answerVal === "string" && answerVal.trim() !== "" ? JSON.parse(answerVal) : answerVal; } catch { return answerVal; } })();

  const render = () => {
    box.innerHTML = "";
    const t = getType();
    const wrap = el("div", "block");
    if (t === "true_false") {
      wrap.append(el("strong", null, "Options"));
      wrap.append(el("span", "hint", "True / False questions use fixed options."));
      const ans = el("label", "inline");
      ans.textContent = "Correct answer";
      const s = el("select");
      s.append(new Option("True", "true"), new Option("False", "false"));
      s.value = answer === true ? "true" : "false";
      s.addEventListener("change", () => { answer = s.value === "true"; });
      ans.append(s);
      box.append(wrap, ans);
      return;
    }
    wrap.append(el("strong", null, "Options (● marks the correct one)"));
    opts.forEach((o, i) => {
      const row = el("div", "opt-row");
      const inp = el("input");
      inp.placeholder = "Option text…";
      inp.value = typeof o === "string" ? o : JSON.stringify(o);
      inp.addEventListener("input", () => { opts[i] = inp.value; });
      const dot = el("span", "dot");
      dot.classList.toggle("on", Number(answer) === i);
      const ok = miniBtn("●", "Mark as correct");
      ok.onclick = () => { answer = i; render(); };
      const del = miniBtn("✕", "Remove option");
      del.onclick = () => { opts.splice(i, 1); if (Number(answer) === i) answer = 0; render(); };
      row.append(inp, dot, ok, del);
      wrap.append(row);
    });
    const add = miniBtn("＋ Add option");
    add.onclick = () => { opts.push(""); render(); };
    wrap.append(add);
    const ansLbl = el("label", "inline");
    ansLbl.textContent = "Correct answer (index)";
    const n = el("input"); n.type = "number"; n.min = 0; n.step = 1;
    n.value = Number(answer) || 0;
    n.addEventListener("input", () => { answer = Number(n.value); });
    ansLbl.append(n);
    box.append(wrap, ansLbl);
  };
  render();
  return {
    el: box,
    getParts: () => ({
      options: JSON.stringify(opts.filter((o) => o !== "")),
      correct_answer: JSON.stringify(answer),
    }),
  };
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function editorTitle(text) {
  $("#editor-title").textContent = text ?? (state.table ? `${state.table} — select a row` : "Select a table");
}

function isJsonColumn(col) {
  // Heuristic: app schema stores flexible payloads as TEXT holding JSON.
  return /data|json|metadata|sources|author|related|tags|options|rewards|key_points|quick_facts|correct_answer|monsters|battle_questions/i.test(col.name);
}

const ENUM_SELECTS = {
  "lesson_steps.step_type": ["briefing", "myth_buster", "micro_learn", "lab", "assessment", "debrief"],
  "quiz_questions.type": ["multiple_choice", "true_false", "matching", "fill_blank"],
  "quiz_questions.difficulty": ["easy", "medium", "hard"],
  "mythbuster_questions.type": ["multiple_choice", "true_false", "matching", "fill_blank"],
  "mythbuster_questions.difficulty": ["easy", "medium", "hard"],
    "lessons.difficulty": ["beginner", "intermediate", "advanced"],
};

/** Column → refbox kinds (related-id chip selects). */
const REF_COLUMNS = {
  "lessons.prerequisites": "lessons",
  "myths.related_lessons": "lessons",
  "encyclopedia_entries.related_terms": "entries",
  "encyclopedia_entries.related_myths": "myths",
  "encyclopedia_entries.related_articles": "articles",
  "articles.related_myths": "myths",
  "posts.related_content": ["articles", "posts", "myths", "facts"],
};

async function openRow(row, meta, isNew = false) {
  state.row = row;
  state.isNew = isNew;
  setDirty(false);
  editorTitle(`${meta.name} — ${isNew ? "new row" : titleFor(row, meta)}`);
  setView("editor");

  const form = $("#form");
  form.innerHTML = "";
  const collectors = {};   // col -> () => value
  let qaWidget = null;     // quiz/mythbuster options+answer pair

  for (const col of meta.columns) {
    const field = document.createElement("div");
    field.className = "field";
    const key = `${meta.name}.${col.name}`;
    const value = row[col.name];

    const label = document.createElement("label");
    label.innerHTML = `${col.name} <span class="type">${col.type}${col.pk ? " · pk" : ""}${col.notnull && !col.pk ? " · required" : ""}</span>`;
    field.append(label);

    // --- enum select ---------------------------------------------------------
    const choices = ENUM_SELECTS[key];
    if (choices) {
      const sel = document.createElement("select");
      sel.dataset.col = col.name;
      for (const c of choices) sel.append(new Option(c, c));
      sel.value = value ?? choices[0];
      sel.addEventListener("change", () => setDirty(true));
      field.append(sel);
      form.append(field);
      continue;
    }
    if (!choices && col.name === "difficulty" && ["easy", "medium", "hard"].includes(String(value ?? ""))) {
      const sel = document.createElement("select");
      sel.dataset.col = col.name;
      for (const c of ["easy", "medium", "hard"]) sel.append(new Option(c, c));
      sel.value = value ?? "";
      sel.addEventListener("change", () => setDirty(true));
      field.append(sel);
      form.append(field);
      continue;
    }

    // --- related-ids chip select ----------------------------------------------
    if (REF_COLUMNS[key]) {
      const ph = el("span", "hint", "loading…");
      field.append(ph);
      form.append(field);
      refboxWidget(safeParse(value), REF_COLUMNS[key]).then((w) => {
        ph.replaceWith(w.el);
        collectors[col.name] = w.get;
        w.el.addEventListener("click", () => setDirty(true), true);
        w.el.addEventListener("change", () => setDirty(true), true);
      });
      continue;
    }

    // --- sources row editor -----------------------------------------------------
    if (col.name === "sources") {
      const w = sourcesWidget(safeParse(value));
      field.append(w.el);
      w.el.addEventListener("input", () => setDirty(true), true);
      collectors[col.name] = w.get;
      form.append(field);
      continue;
    }

    // --- author object ------------------------------------------------------------
    if (col.name === "author" && ["articles", "posts"].includes(meta.name)) {
      const w = authorWidget(safeParse(value));
      field.append(w.el);
      w.el.addEventListener("input", () => setDirty(true));
      collectors[col.name] = w.get;
      form.append(field);
      continue;
    }

    // --- lesson step payload ---------------------------------------------------
    if (meta.name === "lesson_steps" && col.name === "data") {
      const typeSel = form.querySelector('[data-col="step_type"]');
      const w = stepDataWidget(value, () => typeSel?.value || "");
      field.append(w.el);
      typeSel?.addEventListener("change", () => w.rerender());
      w.el.addEventListener("input", () => setDirty(true), true);
      collectors[col.name] = w.get;
      form.append(field);
      continue;
    }

    // --- quiz / mythbuster question options + correct answer ----------------------
    if (["quiz_questions", "mythbuster_questions"].includes(meta.name) && (col.name === "options" || col.name === "correct_answer")) {
      if (col.name === "options") {
        const typeSel = form.querySelector('[data-col="type"]');
        qaWidget = questionAnswerWidget(row.options, row.correct_answer, () => typeSel?.value || "");
        typeSel?.addEventListener("change", () => setDirty(true));
        field.append(qaWidget.el);
        qaWidget.el.addEventListener("input", () => setDirty(true), true);
        collectors[col.name] = () => qaWidget.getParts().options;
        collectors.correct_answer = () => qaWidget.getParts().correct_answer;
        form.append(field);
      } else {
        field.append(el("span", "hint", "set together with the options above (● marks it)"));
        form.append(field);
      }
      continue;
    }

    // --- plain / generic JSON -------------------------------------------------------
    let input;
    if (isJsonColumn(col)) {
      input = document.createElement("textarea");
      input.classList.add("tall");
      input.value = value == null || value === "" ? "" : pretty(value);
      attachJsonValidation(field, input);
    } else if (/int|bool/i.test(col.type)) {
      input = document.createElement("input");
      input.type = "number";
      input.value = value ?? "";
    } else if ((value && String(value).length > 90) || /description|content|explanation|statement|definition|message|reality|myth|markdown|task|snippet/i.test(col.name)) {
      input = document.createElement("textarea");
      input.value = value ?? "";
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.value = value ?? "";
    }
    input.dataset.col = col.name;
    input.addEventListener("input", () => setDirty(true));
    field.append(input);
    form.append(field);
  }

  $("#btn-save").disabled = false;
  state.collectors = collectors;
  window.scrollTo(0, 0);
}

function safeParse(v) {
  if (v == null || v === "") return null;
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
}

function pretty(v) {
  try { return JSON.stringify(typeof v === "string" ? JSON.parse(v) : v, null, 2); }
  catch { return String(v); }
}

function attachJsonValidation(field, textarea) {
  const check = () => {
    const v = textarea.value.trim();
    field.classList.remove("invalid");
    field.querySelector(".json-error")?.remove();
    if (!v) return;
    try { JSON.parse(v); } catch (err) {
      field.classList.add("invalid");
      const errEl = document.createElement("div");
      errEl.className = "json-error";
      errEl.textContent = `Invalid JSON: ${err.message}`;
      field.append(errEl);
    }
  };
  textarea.addEventListener("blur", check);
}

async function saveRow() {
  const meta = currentTableMeta();
  const body = {};
  for (const input of $("#form").querySelectorAll("[data-col]")) {
    const col = meta.columns.find((c) => c.name === input.dataset.col);
    let v = input.value;
    if (isJsonColumn(col)) {
      if (!v.trim()) { body[col.name] = null; continue; }
      try { body[col.name] = JSON.stringify(JSON.parse(v)); }
      catch { toast(`Fix invalid JSON in "${col.name}"`, "err"); return; }
    } else if (/int/i.test(col.type)) {
      body[col.name] = v === "" ? null : Number(v);
    } else {
      body[col.name] = v === "" ? null : v;
    }
  }
  // structured widgets (chips, sources, author, step payloads…)
  for (const [colName, get] of Object.entries(state.collectors || {})) {
    if (typeof get === "function") body[colName] = get();
  }

  try {
    if (state.isNew) {
      const { row } = await api(`/api/rows/${meta.name}`, { method: "POST", body });
      toast("Row created", "ok");
      await loadMeta(); await loadRows(); openRow(row, meta);
    } else {
      const pk = meta.pkCols.map((c) => encodeURIComponent(state.row[c])).join("~");
      const { row } = await api(`/api/rows/${meta.name}/${pk}`, { method: "PUT", body });
      toast("Saved", "ok");
      setDirty(false);
      Object.assign(state.row, row);
      await loadMeta(); loadRows();
    }
  } catch (err) { toast(err.message, "err"); }
}

async function deleteRow() {
  const meta = currentTableMeta();
  if (!confirm(`Delete this row from ${meta.name}?`)) return;
  const pk = meta.pkCols.map((c) => encodeURIComponent(state.row[c])).join("~");
  try {
    await api(`/api/rows/${meta.name}/${pk}`, { method: "DELETE" });
    toast("Deleted", "ok");
    await loadMeta();
    backToList();
  } catch (err) { toast(err.message, "err"); }
}

function newRow() {
  const meta = currentTableMeta();
  const blank = {};
  for (const col of meta.columns) blank[col.name] = col.pk ? crypto.randomUUID() : null;
  openRow(blank, meta, true);
}

function backToList() {
  setView("editor");
  editorTitle();
  state.row = null;
}

function setDirty(v) {
  state.dirty = v;
  $("#dirty").hidden = !v;
}

// ---------------------------------------------------------------------------
// SQL console
// ---------------------------------------------------------------------------

async function runSql() {
  const sql = $("#sql-input").value;
  if (!sql.trim()) return;
  try {
    const { rows } = await api("/api/query", { method: "POST", body: { sql } });
    $("#sql-output").textContent = rows.length
      ? JSON.stringify(rows, null, 2)
      : "— no rows —";
    if (rows.length) $("#sql-output").textContent = `${rows.length} row(s)\n\n` + $("#sql-output").textContent;
  } catch (err) {
    $("#sql-output").innerHTML = `<span class="err"></span>`;
    $("#sql-output").querySelector(".err").textContent = err.message;
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

let searchTimer;
$("#search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadRows, 180);
});
$("#btn-new").onclick = newRow;
$("#btn-save").onclick = saveRow;
$("#btn-delete").onclick = deleteRow;
$("#btn-query").onclick = () => { setView("query"); $("#sql-input").focus(); };
$("#btn-close-query").onclick = () => setView("editor");
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#query-view").hidden) setView("editor");
});
$("#btn-backup").onclick = async () => {
  const { backup } = await api("/api/backup", { method: "POST" });
  toast(`Backup written to ${backup}`, "ok");
};
$("#btn-bump").onclick = async () => {
  try {
    const { version } = await api("/api/bump-version", { method: "POST" });
    toast(`CONTENT_DB_VERSION → ${version}`, "ok");
  } catch (err) { toast(err.message, "err"); }
};
$("#sql-input").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runSql();
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s" && !$("#editor-view").hidden) {
    e.preventDefault();
    saveRow();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (state.dirty) e.preventDefault();
});

loadMeta().catch((err) => toast(err.message, "err"));
