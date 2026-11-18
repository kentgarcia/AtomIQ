// Spec-driven form builder for Content Studio.
//
// A form is described by an array of field definitions and produces plain JS
// values. Every content editor is configuration over this builder.
//
// Field definition:
//   { key, label, type, hint, required, readonly, placeholder, nullable,
//     options, rows, min, max, step, suggest: { table, column },
//     show: (values) => boolean,   // hidden fields keep their value
//     affects: true,               // re-render the form when this field changes
//     merge: true }                // custom widget returns several keys
//
// Types: text number textarea markdown select checkbox date strings refs icon
//        objects json group list custom section
//
// group:  { fields | (values) => fields, optional?, preserve? }
// list:   { item: { fields } | variants: { typeKey, types: { name: { fields } } },
//           newItem(type), itemLabel(item, i), matchKey?, addLabel?, sortable? }
// custom: { build(values, notify, ctx) → { el, get() } }

import { api, button, el, miniBtn } from "./core.js";

export class FormError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

// ---------------------------------------------------------------------------
// caches
// ---------------------------------------------------------------------------

const refCache = new Map();
export async function refOptions(table) {
  if (!refCache.has(table)) {
    refCache.set(
      table,
      api(`/api/refs?table=${encodeURIComponent(table)}`)
        .then((r) => r.items.map((i) => ({ id: i.id, label: i.label || i.id })))
        .catch(() => []),
    );
  }
  return refCache.get(table);
}
export const clearRefCache = () => refCache.clear();

let iconPromise;
export const iconNames = () => (iconPromise ??= api("/api/icons").catch(() => ({ names: [], aliases: {} })));

const distinctCache = new Map();
const distinct = (table, column) => {
  const k = `${table}.${column}`;
  if (!distinctCache.has(k)) {
    distinctCache.set(
      k,
      api(`/api/distinct?table=${table}&column=${column}`).then((r) => r.values).catch(() => []),
    );
  }
  return distinctCache.get(k);
};

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function fieldWrap(def, inner) {
  const wrap = el("div", `field${def.type === "group" || def.type === "list" ? " nested" : ""}`);
  wrap.dataset.key = def.key ?? "";
  if (def.label) {
    const label = el("label", null, def.label);
    if (def.required) label.append(el("span", "type", " · required"));
    wrap.append(label);
  }
  wrap.append(inner);
  if (def.hint) wrap.append(el("div", "hint", def.hint));
  return wrap;
}

function inputWidget(def, value, env, type = "text") {
  const input = el("input");
  input.type = type;
  input.value = value ?? "";
  if (def.placeholder) input.placeholder = def.placeholder;
  if (def.min != null) input.min = def.min;
  if (def.max != null) input.max = def.max;
  if (def.step != null) input.step = def.step;
  if (def.readonly) input.readOnly = true;
  input.addEventListener("input", () => env.notify());
  if (def.suggest) {
    const list = el("datalist");
    list.id = nextId("dl");
    input.setAttribute("list", list.id);
    distinct(def.suggest.table, def.suggest.column).then((vals) => vals.forEach((v) => list.append(new Option(v))));
    const box = el("div");
    box.append(input, list);
    return { el: box, input };
  }
  return { el: input, input };
}

// ---------------------------------------------------------------------------
// widgets
// ---------------------------------------------------------------------------

function textWidget(def, value, env) {
  const { el: node, input } = inputWidget(def, value, env, "text");
  return { el: node, get: () => (def.nullable && input.value === "" ? null : input.value) };
}

function numberWidget(def, value, env) {
  const { el: node, input } = inputWidget(def, value, env, "number");
  return {
    el: node,
    get: () => (input.value === "" ? (def.nullable ? null : undefined) : Number(input.value)),
  };
}

function dateWidget(def, value, env) {
  const { el: node, input } = inputWidget(def, value, env, "date");
  return { el: node, get: () => (input.value === "" ? (def.nullable ? null : "") : input.value) };
}

function textareaWidget(def, value, env) {
  const t = el("textarea", def.type === "markdown" ? "tall" : "");
  t.rows = def.rows ?? (def.type === "markdown" ? 14 : 4);
  t.value = value ?? "";
  if (def.placeholder) t.placeholder = def.placeholder;
  if (def.readonly) t.readOnly = true;
  t.spellcheck = true;
  t.addEventListener("input", () => env.notify());
  return { el: t, get: () => (def.nullable && t.value === "" ? null : t.value) };
}

function selectWidget(def, value, env, values) {
  const sel = el("select");
  const opts = (typeof def.options === "function" ? def.options(values) : def.options ?? []).map((o) =>
    typeof o === "object" ? o : { value: o, label: String(o) },
  );
  if (def.optional || def.nullable) sel.append(new Option("—", ""));
  for (const o of opts) sel.append(new Option(o.label, String(o.value)));
  const str = value == null ? "" : String(value);
  if (str !== "" && !opts.some((o) => String(o.value) === str)) sel.append(new Option(`${str} (not in list)`, str));
  sel.value = str === "" && !(def.optional || def.nullable) && opts[0] ? String(opts[0].value) : str;
  sel.disabled = !!def.readonly;
  sel.addEventListener("change", () => env.notify());
  return {
    el: sel,
    get: () => {
      if (sel.value === "") {
        if (opts.some((o) => String(o.value) === "")) return "";
        return def.nullable ? null : undefined;
      }
      const match = opts.find((o) => String(o.value) === sel.value);
      return match ? match.value : sel.value;
    },
  };
}

function checkboxWidget(def, value, env) {
  const input = el("input");
  input.type = "checkbox";
  input.checked = !!value;
  input.addEventListener("change", () => env.notify());
  const label = el("label", "checkline");
  label.append(input, document.createTextNode(` ${def.checkLabel ?? "Yes"}`));
  return { el: label, get: () => (def.asInt ? (input.checked ? 1 : 0) : input.checked) };
}

/** Chip list of free-form strings (tags, key points, quick facts…). */
function stringsWidget(_def, value, env) {
  let items = Array.isArray(value) ? value.filter((v) => v !== "" && v != null).map(String) : [];
  const box = el("div", "widget");
  const render = () => {
    box.replaceChildren();
    const chips = el("div", "chips");
    items.forEach((t, i) => {
      const c = el("span", "chip", t);
      c.append(miniBtn("✕", "Remove", () => {
        items.splice(i, 1);
        render();
        env.notify();
      }));
      chips.append(c);
    });
    if (!items.length) chips.append(el("span", "hint", "none yet"));
    const input = el("input");
    input.placeholder = "add… ↵";
    const add = () => {
      const v = input.value.trim();
      if (v && !items.includes(v)) {
        items.push(v);
        env.notify();
      }
      input.value = "";
      render();
      input.focus();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        add();
      }
    });
    input.addEventListener("blur", () => {
      if (input.value.trim()) add();
    });
    box.append(chips, input);
  };
  render();
  return { el: box, get: () => [...items] };
}

/** Chip multi-select of ids from other tables (related_*, prerequisites). */
function refsWidget(def, value, env) {
  const kinds = Array.isArray(def.kinds) ? def.kinds : [def.kinds];
  let selected = (Array.isArray(value) ? value : []).filter(Boolean).map(String);
  const box = el("div", "widget");
  const groups = kinds.map((table) => ({ table, options: [] }));
  const render = () => {
    box.replaceChildren();
    const labels = new Map(groups.flatMap((g) => g.options).map((o) => [o.id, o.label]));
    const chips = el("div", "chips");
    selected.forEach((id) => {
      const known = labels.size === 0 || labels.has(id);
      const c = el("span", `chip${known ? "" : " bad"}`, labels.get(id) || id);
      c.title = known ? id : `${id} (no such item)`;
      c.append(miniBtn("✕", "Remove", () => {
        selected = selected.filter((v) => v !== id);
        render();
        env.notify();
      }));
      chips.append(c);
    });
    if (!selected.length) chips.append(el("span", "hint", "none linked yet"));
    const sel = el("select");
    sel.append(new Option("— link an item —", ""));
    for (const g of groups) {
      const free = g.options.filter((o) => !selected.includes(o.id));
      if (!free.length) continue;
      const og = el("optgroup");
      og.label = g.table;
      free.forEach((o) => og.append(new Option(`${o.label} · ${o.id}`, o.id)));
      sel.append(og);
    }
    sel.onchange = () => {
      if (sel.value && !selected.includes(sel.value)) {
        selected.push(sel.value);
        render();
        env.notify();
      }
    };
    box.append(chips, sel);
  };
  render();
  Promise.all(groups.map(async (g) => (g.options = await refOptions(g.table)))).then(render);
  return { el: box, get: () => [...selected] };
}

/** Icon name with the installed Iconsax list as suggestions; unknown names show as an error. */
function iconWidget(_def, value, env) {
  const box = el("div", "icon-field");
  const input = el("input");
  input.type = "text";
  input.value = value ?? "";
  input.placeholder = "Iconsax name, e.g. Sun1";
  const list = el("datalist");
  list.id = nextId("icons");
  input.setAttribute("list", list.id);
  const status = el("span", "icon-status");
  let known = null;
  const check = () => {
    if (!known) return;
    const v = input.value.trim();
    const ok = !v || known.names.has(v) || known.aliases[v] !== undefined;
    status.textContent = !v ? "" : ok ? (known.aliases[v] ? `alias → ${known.aliases[v]}` : "installed") : "not an installed icon";
    status.className = `icon-status ${!v ? "" : ok ? "ok" : "bad"}`;
  };
  iconNames().then((r) => {
    known = { names: new Set(r.names), aliases: r.aliases };
    r.names.forEach((n) => list.append(new Option(n)));
    check();
  });
  input.addEventListener("input", () => {
    check();
    env.notify();
  });
  box.append(input, list, status);
  return { el: box, get: () => input.value.trim() };
}

/** Rows of small objects (sources, …) with chosen columns; extra keys on each row are preserved. */
function objectsWidget(def, value, env) {
  let rows = (Array.isArray(value) ? value : []).filter((r) => r && typeof r === "object").map(clone);
  const box = el("div", "widget objects");
  const columns = def.columns;
  const render = () => {
    box.replaceChildren();
    rows.forEach((row, i) => {
      const line = el("div", "obj-row");
      line.style.gridTemplateColumns = `${columns.map((c) => c.width ?? "1fr").join(" ")} auto`;
      for (const c of columns) {
        const inp = el("input");
        inp.type = "text";
        inp.placeholder = c.placeholder ?? c.key;
        inp.value = row[c.key] ?? "";
        inp.setAttribute("aria-label", c.placeholder ?? c.key);
        inp.addEventListener("input", () => {
          row[c.key] = inp.value;
          env.notify();
        });
        line.append(inp);
      }
      line.append(miniBtn("✕", "Remove", () => {
        rows.splice(i, 1);
        render();
        env.notify();
      }));
      box.append(line);
    });
    box.append(miniBtn(def.addLabel ?? "＋ Add", null, () => {
      rows.push(Object.fromEntries(columns.map((c) => [c.key, ""])));
      render();
      env.notify();
    }));
  };
  render();
  return {
    el: box,
    get: () =>
      rows
        .map((r) => Object.fromEntries(Object.entries(r).filter(([k, v]) => !columns.some((c) => c.key === k) || (v ?? "") !== "")))
        .filter((r) => columns.some((c) => (r[c.key] ?? "") !== "")),
  };
}

function jsonWidget(def, value, env) {
  const t = el("textarea", "tall mono");
  t.rows = def.rows ?? 8;
  const text = (v) => (v === undefined || v === null ? "" : JSON.stringify(v, null, 2));
  t.value = typeof value === "string" ? value : text(value);
  const msg = el("div", "json-error");
  const box = el("div");
  box.append(t, msg);
  const check = () => {
    msg.textContent = "";
    if (!t.value.trim()) return;
    try {
      JSON.parse(t.value);
    } catch (e) {
      msg.textContent = `Invalid JSON: ${e.message}`;
    }
  };
  t.addEventListener("blur", check);
  t.addEventListener("input", () => env.notify());
  return {
    el: box,
    get: () => {
      if (!t.value.trim()) return def.nullable ? null : undefined;
      try {
        return JSON.parse(t.value);
      } catch (e) {
        throw new FormError(`${def.label ?? def.key}: invalid JSON (${e.message})`, def.key);
      }
    },
  };
}

function groupWidget(def, value, env) {
  const box = el("div", "subform");
  const initial = value && typeof value === "object" ? value : {};
  let enabled = !def.optional || (value !== undefined && value !== null);
  const holder = el("div");
  let form = null;
  const mount = () => {
    holder.replaceChildren();
    form = buildForm(def.fields, initial, { notify: () => env.notify(), preserve: def.preserve !== false, clean: def.clean !== false, ctx: env.ctx });
    holder.append(form.el);
  };
  if (def.optional) {
    const toggle = el("input");
    toggle.type = "checkbox";
    toggle.checked = enabled;
    const label = el("label", "checkline");
    label.append(toggle, document.createTextNode(` ${def.enableLabel ?? "Enabled"}`));
    toggle.addEventListener("change", () => {
      enabled = toggle.checked;
      holder.hidden = !enabled;
      env.notify();
    });
    box.append(label);
  }
  mount();
  holder.hidden = !enabled;
  box.append(holder);
  return {
    el: box,
    get: () => (enabled ? form.get() : undefined),
    markErrors: (f) => form.markErrors(f),
    validate: () => (enabled ? form.validate().map((x) => ({ ...x, field: `${def.key}.${x.field}` })) : []),
  };
}

function customWidget(def, _value, env, values) {
  return def.build(values, () => env.notify(), env.ctx);
}

// ---------------------------------------------------------------------------
// ordered list of cards (steps, questions, rooms, shapes…)
// ---------------------------------------------------------------------------

function listWidget(def, value, env) {
  const variants = def.variants;
  const itemFields = (item) => {
    if (!variants) return typeof def.item.fields === "function" ? def.item.fields(item) : def.item.fields;
    const t = variants.types[item[variants.typeKey]];
    const rest = t ? (typeof t.fields === "function" ? t.fields(item) : t.fields) : [];
    return [
      { key: variants.typeKey, label: variants.typeLabel ?? "Type", type: "select", options: Object.keys(variants.types), affects: true },
      ...rest,
    ];
  };

  const box = el("div", "list");
  const cards = el("div", "cards");
  const addBar = el("div", "list-add");
  box.append(cards, addBar);

  /** @type {Array<{ values: any, form: any, raw: boolean, rawArea: HTMLTextAreaElement|null, card: HTMLElement, collapsed: boolean }>} */
  let items = (Array.isArray(value) ? value : []).map((v) => makeItem(clone(v), def.collapsed !== false && Array.isArray(value) && value.length > 3));

  function makeItem(values, collapsed = false) {
    const item = { values, form: null, raw: false, rawArea: null, card: null, collapsed };
    item.form = buildForm((cur) => itemFields(cur), values, {
      notify: () => env.notify(),
      preserve: true,
      clean: def.cleanItems !== false,
      ctx: env.ctx,
    });
    return item;
  }

  const itemValue = (it) => {
    if (it.raw) {
      try {
        return JSON.parse(it.rawArea.value);
      } catch (e) {
        throw new FormError(`${def.label ?? def.key}: invalid JSON in an item (${e.message})`, def.key);
      }
    }
    return it.form.get();
  };

  const labelOf = (it, i) => {
    let v;
    try {
      v = itemValue(it);
    } catch {
      v = it.values;
    }
    return def.itemLabel ? def.itemLabel(v, i) : `${def.itemName ?? "Item"} ${i + 1}`;
  };

  let dragFrom = null;
  function render() {
    cards.replaceChildren();
    items.forEach((it, i) => {
      const card = el("div", "card");
      it.card = card;
      card.dataset.index = String(i);
      const head = el("div", "card-head");
      const handle = el("span", "handle", "☰");
      handle.title = "Drag to reorder";
      handle.draggable = def.sortable !== false;
      handle.addEventListener("dragstart", (e) => {
        dragFrom = i;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(i));
      });
      card.addEventListener("dragover", (e) => {
        if (dragFrom !== null) {
          e.preventDefault();
          card.classList.add("drop");
        }
      });
      card.addEventListener("dragleave", () => card.classList.remove("drop"));
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drop");
        if (dragFrom !== null && dragFrom !== i) move(dragFrom, i);
        dragFrom = null;
      });
      const title = el("button", "card-title");
      title.type = "button";
      const type = variants ? it.form.get()[variants.typeKey] : null;
      title.append(el("span", "idx", String(i + 1)));
      if (type) title.append(el("span", "badge", variants.labels?.[type] ?? type));
      title.append(el("span", "name", labelOf(it, i)));
      title.addEventListener("click", () => {
        it.collapsed = !it.collapsed;
        render();
      });
      const actions = el("div", "card-actions");
      actions.append(
        miniBtn("▲", "Move up", () => move(i, i - 1)),
        miniBtn("▼", "Move down", () => move(i, i + 1)),
        miniBtn("{ }", "Edit as JSON", () => toggleRaw(it)),
        miniBtn("⧉", "Duplicate", () => duplicate(i)),
        miniBtn("✕", "Remove", () => remove(i)),
      );
      head.append(handle, title, actions);
      const body = el("div", "card-body");
      body.hidden = it.collapsed;
      if (it.raw) body.append(it.rawArea);
      else body.append(it.form.el);
      const errs = el("ul", "item-errors");
      errs.hidden = true;
      card.append(head, errs, body);
      cards.append(card);
    });
    addBar.replaceChildren();
    if (variants) {
      const sel = el("select");
      for (const t of Object.keys(variants.types)) sel.append(new Option(variants.labels?.[t] ?? t, t));
      addBar.append(sel, button(def.addLabel ?? "＋ Add", () => add(sel.value), "mini"));
    } else {
      addBar.append(button(def.addLabel ?? "＋ Add", () => add(), "mini"));
    }
  }

  function toggleRaw(it) {
    if (!it.raw) {
      it.rawArea = el("textarea", "tall mono");
      it.rawArea.rows = 14;
      it.rawArea.value = JSON.stringify(it.form.get(), null, 2);
      it.rawArea.addEventListener("input", () => env.notify());
      it.raw = true;
    } else {
      try {
        const v = JSON.parse(it.rawArea.value);
        const idx = items.indexOf(it);
        items[idx] = makeItem(v, false);
      } catch (e) {
        env.fail(`Fix the JSON first: ${e.message}`);
        return;
      }
    }
    render();
    env.notify();
  }

  function add(type) {
    const values = def.newItem ? def.newItem(type, items.map((it) => safeValue(it))) : {};
    items.push(makeItem(values, false));
    render();
    env.notify();
    cards.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  const safeValue = (it) => {
    try {
      return itemValue(it);
    } catch {
      return it.values;
    }
  };
  function move(from, to) {
    if (to < 0 || to >= items.length) return;
    const [it] = items.splice(from, 1);
    items.splice(to, 0, it);
    render();
    env.notify();
  }
  function duplicate(i) {
    const copy = clone(safeValue(items[i]));
    if (def.onDuplicate) def.onDuplicate(copy, items.map((it) => safeValue(it)));
    items.splice(i + 1, 0, makeItem(copy, false));
    render();
    env.notify();
  }
  function remove(i) {
    items.splice(i, 1);
    render();
    env.notify();
  }

  render();
  return {
    el: box,
    get: () => items.map(itemValue),
    validate: () => {
      const out = [];
      items.forEach((it, i) => {
        if (it.raw) return;
        const own = safeValue(it);
        for (const x of it.form.validate()) {
          out.push(def.matchKey ? { ...x, id: `${def.key}/${own[def.matchKey]}` } : { ...x, field: `${def.key}[${i}].${x.field}` });
        }
      });
      return out;
    },
    markErrors: (findings) => {
      items.forEach((it, i) => {
        const mine = [];
        for (const f of findings) {
          if (def.matchKey) {
            const v = safeValue(it)[def.matchKey];
            if (v !== undefined && String(f.id).endsWith(`/${v}`)) mine.push(f);
          } else if (String(f.field ?? "").startsWith(`${def.key}[${i}]`)) {
            mine.push({ ...f, field: String(f.field).slice(`${def.key}[${i}]`.length).replace(/^\./, "") });
          }
        }
        const card = it.card;
        if (!card) return;
        card.classList.toggle("has-error", mine.some((f) => f.severity === "error"));
        const ul = card.querySelector(".item-errors");
        ul.replaceChildren(...mine.map((f) => el("li", f.severity === "error" ? "err" : "warn", `${f.field ? `${f.field}: ` : ""}${f.message}`)));
        ul.hidden = mine.length === 0;
        if (mine.length) {
          it.collapsed = false;
          card.querySelector(".card-body").hidden = false;
        }
        if (!it.raw) it.form.markErrors(mine);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// the builder
// ---------------------------------------------------------------------------

const WIDGETS = {
  text: textWidget,
  number: numberWidget,
  date: dateWidget,
  textarea: textareaWidget,
  markdown: textareaWidget,
  select: selectWidget,
  checkbox: checkboxWidget,
  strings: stringsWidget,
  refs: refsWidget,
  icon: iconWidget,
  objects: objectsWidget,
  json: jsonWidget,
  group: groupWidget,
  list: listWidget,
};

/**
 * @param {Array|Function} fields field definitions, or a function of the current values
 * @param {object} initial starting values
 * @param {{ notify?: Function, preserve?: boolean, clean?: boolean, ctx?: object }} [opts]
 */
export function buildForm(fields, initial = {}, opts = {}) {
  const { notify = () => {}, preserve = false, clean = false, ctx = {} } = opts;
  const root = el("div", "form");
  let current = preserve ? clone(initial) ?? {} : { ...initial };
  /** @type {Array<{ def: any, widget: any, wrap: HTMLElement }>} */
  let rendered = [];

  const fieldDefs = () => (typeof fields === "function" ? fields(current) : fields);
  const failBanner = (msg) => ctx.fail?.(msg);

  function collect() {
    const out = preserve ? { ...current } : {};
    for (const { def, widget } of rendered) {
      const v = widget.get();
      // An untouched checkbox shouldn't add `false` to content that never had the key.
      if (def.type === "checkbox" && v === false && !def.asInt && !(def.key in current)) {
        delete out[def.key];
        continue;
      }
      if (!def.merge && !(def.key in current) && !def.required) {
        const empty = Array.isArray(v) ? v.length === 0 : v && typeof v === "object" && Object.keys(v).length === 0;
        if (empty) {
          delete out[def.key];
          continue;
        }
      }
      if (def.merge) Object.assign(out, v);
      else if (v === undefined) delete out[def.key];
      else out[def.key] = v;
    }
    if (clean) {
      const required = new Set(rendered.filter((r) => r.def.required).map((r) => r.def.key));
      for (const k of Object.keys(out)) {
        if (!required.has(k) && (out[k] === "" || out[k] === null || out[k] === undefined)) delete out[k];
      }
    }
    return out;
  }

  function build() {
    root.replaceChildren();
    rendered = [];
    for (const def of fieldDefs()) {
      if (def.type === "section") {
        root.append(el("h3", "section", def.label));
        continue;
      }
      if (def.show && !def.show(current)) continue;
      const env = {
        ctx: { ...ctx, fail: failBanner },
        fail: failBanner,
        notify: () => {
          notify(def.key);
          if (def.affects) {
            try {
              current = collect();
            } catch {
              /* keep the previous values while JSON is invalid */
            }
            build();
          }
        },
      };
      const value = def.merge ? current : current[def.key] ?? (def.default !== undefined ? clone(def.default) : undefined);
      let widget;
      if (def.type === "custom") widget = customWidget(def, value, env, current);
      else {
        const make = WIDGETS[def.type ?? "text"];
        if (!make) throw new Error(`Unknown field type: ${def.type}`);
        widget = make(def, value, env, current);
      }
      const wrap = fieldWrap(def, widget.el);
      if (def.readonly) wrap.classList.add("readonly");
      root.append(wrap);
      rendered.push({ def, widget, wrap });
    }
  }
  build();

  return {
    el: root,
    get: collect,
    /** Replace all values and re-render. */
    set(values) {
      current = preserve ? clone(values) ?? {} : { ...values };
      build();
    },
    /** Client-side check of required fields (the server checks the rest). */
    validate() {
      const out = [];
      for (const { def, widget } of rendered) {
        if (def.required) {
          let v;
          try {
            v = widget.get();
          } catch {
            continue;
          }
          if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
            out.push({ severity: "error", id: "", field: def.key, message: `${def.label || def.key} is required` });
          }
        }
        if (widget.validate) out.push(...widget.validate());
      }
      return out;
    },
    /** Validator findings → highlight fields and nested cards. */
    markErrors(findings) {
      for (const { def, widget, wrap } of rendered) {
        wrap.classList.remove("has-error");
        wrap.querySelector(":scope > .field-errors")?.remove();
        const mine = findings.filter((f) => {
          const head = String(f.field ?? "").split(/[.[]/)[0];
          return def.key && head === def.key && !String(f.id ?? "").includes("/");
        });
        if (mine.length && def.type !== "list" && def.type !== "group") {
          wrap.classList.add("has-error");
          const ul = el("ul", "field-errors");
          for (const f of mine) ul.append(el("li", f.severity === "error" ? "err" : "warn", f.message));
          wrap.append(ul);
        }
        if (def.type === "group") {
          const prefix = `${def.key}.`;
          widget.markErrors?.(
            findings
              .filter((f) => String(f.field ?? "").startsWith(prefix))
              .map((f) => ({ ...f, field: String(f.field).slice(prefix.length) })),
          );
        } else widget.markErrors?.(findings);
      }
    },
  };
}
