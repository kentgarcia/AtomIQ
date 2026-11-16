// Shared helpers for Content Studio's frontend: DOM, API client, dialogs.
// Everything user-controlled goes through textContent, never innerHTML.

export const $ = (sel, root = document) => root.querySelector(sel);

/** el("div", "a b", "text") — class string and text are optional. */
export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Append children (nodes, strings, arrays; null/false are skipped) and return the parent. */
export function append(parent, ...children) {
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    parent.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return parent;
}

export function button(label, onClick, cls = "") {
  const b = el("button", cls, label);
  b.type = "button";
  if (onClick) b.onclick = onClick;
  return b;
}

export function miniBtn(label, title, onClick) {
  const b = el("button", "mini", label);
  b.type = "button";
  if (title) {
    b.title = title;
    b.setAttribute("aria-label", title);
  }
  if (onClick) b.onclick = onClick;
  return b;
}

export const debounce = (fn, ms = 200) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data ?? {};
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || res.statusText, res.status, data);
  return data;
}

/** POST that answers with newline-delimited JSON; `onLine` runs for each parsed line. */
export async function apiStream(path, body, onLine) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || res.statusText, res.status, data);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = done ? "" : lines.pop();
    for (const line of lines) if (line.trim()) onLine(JSON.parse(line));
    if (done) break;
  }
}

export const pkKey = (row, pkCols) => pkCols.map((c) => encodeURIComponent(String(row[c]))).join("~");
export const decodePk = (key) => String(key).split("~").map(decodeURIComponent);

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export function toast(msg, kind = "") {
  const t = el("div", `toast ${kind}`, msg);
  t.setAttribute("role", kind === "err" ? "alert" : "status");
  $("#toasts").append(t);
  setTimeout(() => t.remove(), kind === "err" ? 6000 : 3200);
}

/** Modal dialog. `build(body, api)` fills the body; returns { close, body }. */
export function modal({ title, build, actions = [], wide = false }) {
  const overlay = el("div", "overlay");
  const card = el("div", `dialog${wide ? " wide" : ""}`);
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  if (title) card.append(el("h2", null, title));
  const body = el("div", "dialog-body");
  card.append(body);
  const bar = el("div", "dialog-actions");
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  const api = { close, body, buttons: {} };
  for (const a of actions) {
    const b = button(a.label, async () => {
      if (a.onClick) await a.onClick(api);
      if (a.close !== false) close();
    }, a.kind ?? "ghost");
    api.buttons[a.id ?? a.label] = b;
    bar.append(b);
  }
  card.append(bar);
  overlay.append(card);
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  build?.(body, api);
  return api;
}

export function confirmDialog(message, { okLabel = "OK", danger = false, title } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    const m = modal({
      title,
      build: (body) => body.append(el("p", null, message)),
      actions: [
        { label: "Cancel", kind: "ghost", onClick: () => finish(false) },
        { label: okLabel, kind: danger ? "danger" : "primary", onClick: () => finish(true) },
      ],
    });
    // Closing with Escape / clicking outside resolves false.
    const obs = new MutationObserver(() => {
      if (!document.body.contains(m.body)) {
        finish(false);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true });
  });
}

/** Ask for a line of text (or several). Resolves null when cancelled. */
export function promptDialog(message, { placeholder = "", okLabel = "OK", multiline = false, title, initial = "", required = true } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    let input;
    const m = modal({
      title,
      build: (body) => {
        body.append(el("p", null, message));
        input = multiline ? el("textarea") : el("input");
        if (!multiline) input.type = "text";
        else input.rows = 5;
        input.placeholder = placeholder;
        input.value = initial;
        input.className = "dialog-input";
        body.append(input);
        setTimeout(() => input.focus(), 0);
      },
      actions: [
        { label: "Cancel", kind: "ghost", onClick: () => finish(null) },
        {
          label: okLabel,
          kind: "primary",
          close: false,
          onClick: (d) => {
            const v = input.value.trim();
            if (required && !v) return input.focus();
            finish(v);
            d.close();
          },
        },
      ],
    });
    const obs = new MutationObserver(() => {
      if (!document.body.contains(m.body)) {
        finish(null);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true });
  });
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function fmtTime(ts) {
  const d = new Date(typeof ts === "number" ? ts : String(ts));
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function fmtBytes(n) {
  return n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`;
}

/** Flatten an object to `path → leaf` for field-level diffs. */
export function flatten(value, prefix = "", out = {}) {
  if (Array.isArray(value)) {
    if (!value.length) out[prefix] = "[]";
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) out[prefix] = "{}";
    for (const k of keys) flatten(value[k], prefix ? `${prefix}.${k}` : k, out);
  } else {
    out[prefix] = value;
  }
  return out;
}

/** Field-level diff of two plain objects → [{ path, before, after }]. */
export function diffObjects(before, after) {
  const a = flatten(before ?? {});
  const b = flatten(after ?? {});
  const rows = [];
  for (const path of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[path] !== b[path]) rows.push({ path, before: a[path], after: b[path] });
  }
  return rows.sort((x, y) => (x.path < y.path ? -1 : 1));
}

/** Render a diff table. */
export function diffTable(rows) {
  if (!rows.length) return el("p", "hint", "No field differences.");
  const t = el("table", "diff");
  const head = el("tr");
  for (const h of ["Field", "Before", "After"]) head.append(el("th", null, h));
  t.append(head);
  for (const r of rows) {
    const tr = el("tr");
    const show = (v) => (v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));
    tr.append(el("td", "path", r.path), el("td", "before", show(r.before)), el("td", "after", show(r.after)));
    t.append(tr);
  }
  return t;
}

export const state = {
  meta: null,
  status: null,
  dirty: false,
  setDirty(v) {
    this.dirty = v;
    document.dispatchEvent(new CustomEvent("studio:dirty", { detail: v }));
  },
};
