// The editor for one content item: form, save/delete, history, used-by, JSON.

import { ApiError, api, button, confirmDialog, diffObjects, diffTable, el, fmtTime, modal, pkKey, promptDialog, state, toast } from "./core.js";
import { buildForm, clearRefCache } from "./form.js";

const CHILD_KEY = "__children";
const LINK_KEY = "__links";

/** Findings from a 422 response, shaped for form.markErrors. */
const tag = (list, severity) => (list ?? []).map((f) => ({ severity, ...f }));

function findingsPanel(findings) {
  const box = el("div", "findings");
  box.hidden = findings.length === 0;
  if (!findings.length) return box;
  const errors = findings.filter((f) => f.severity === "error");
  box.append(el("strong", null, errors.length ? `${errors.length} problem${errors.length === 1 ? "" : "s"} to fix` : "Warnings"));
  const ul = el("ul");
  for (const f of findings.slice(0, 40)) {
    const where = [f.table !== undefined && f.id && `${f.id}`, f.field].filter(Boolean).join(" · ");
    const li = el("li", f.severity === "error" ? "err" : "warn");
    if (where) li.append(el("span", "where", where));
    li.append(document.createTextNode(` ${f.message}`));
    ul.append(li);
  }
  if (findings.length > 40) ul.append(el("li", null, `…and ${findings.length - 40} more`));
  box.append(ul);
  return box;
}

/**
 * Render an editor into `host`.
 * @param {object} cfg entry of TYPES (or rawType())
 * @param {string|null} pk encoded primary key, or null for a new item
 * @param {HTMLElement} host
 * @param {{ rows: any[], onChange(): void, open(table: string, pk: string): void, afterSave(table: string, pk: string, isNew: boolean): void, afterDelete(): void, tabInitial?: string }} hooks
 */
export async function renderEditor(cfg, pk, host, hooks) {
  const isNew = pk === null;
  host.replaceChildren(el("p", "hint pad", "Loading…"));

  let entity;
  try {
    entity = isNew ? { row: cfg.newRow(), children: {} } : (await api(`/api/entities/${cfg.table}/${pk}`)).entity;
  } catch (err) {
    host.replaceChildren(el("p", "empty", `Could not load: ${err.message}`));
    return;
  }

  const childTable = cfg.children?.table;
  const linkTable = cfg.links?.table;
  const initial = { ...entity.row };
  if (childTable) initial[CHILD_KEY] = entity.children[childTable] ?? [];
  // Link rows (a blog piece's sources) are plain ids: the form edits a list of them.
  if (linkTable) initial[LINK_KEY] = (entity.children[linkTable] ?? []).map((r) => r[cfg.links.column]);
  const original = { ...entity.row };

  const fieldDefs = () => {
    const base = cfg.fields(isNew);
    const extra = [];
    if (childTable) extra.push({ ...cfg.children.field, key: CHILD_KEY });
    if (linkTable) extra.push({ ...cfg.links.field, key: LINK_KEY });
    return [...base, ...extra];
  };

  // `live()` is the form as it is right now, for previews that redraw while you type.
  const ctx = {
    fail: (m) => toast(m, "err"),
    isNew,
    original,
    rows: hooks.rows,
    live: () => form.get(),
  };
  let form = buildForm(fieldDefs(), initial, { notify: () => markDirty(true), preserve: true, ctx });

  // --- chrome ----------------------------------------------------------------
  const head = el("div", "editor-head");
  const titleBox = el("div", "editor-title");
  const title = el("h2", null, isNew ? `New ${cfg.singular}` : cfg.titleOf(entity.row));
  const sub = el("div", "editor-sub", isNew ? cfg.label : `${cfg.label} · ${entity.row.id ?? pk}`);
  titleBox.append(title, sub);
  const dirtyBadge = el("span", "badge warn", "unsaved");
  dirtyBadge.hidden = true;
  const saveBtn = button(isNew ? "Create" : "Save", () => save(), "primary");
  saveBtn.title = "Ctrl+S";
  const delBtn = button("Delete", () => remove(), "ghost danger");
  delBtn.hidden = isNew;
  const actions = el("div", "editor-actions");
  actions.append(dirtyBadge);
  actions.append(delBtn, saveBtn);
  head.append(titleBox, actions);

  const tabs = el("div", "tabs");
  const panes = {};
  const tabNames = isNew ? ["edit"] : ["edit", "history", "used", "json"];
  const labels = { edit: "Edit", history: "History", used: "Used by", json: "JSON" };
  const body = el("div", "editor-body");
  let findingsHost = el("div");
  const editPane = el("div", "pane");
  editPane.append(findingsHost, form.el);
  panes.edit = editPane;

  const show = (name) => {
    for (const t of tabNames) {
      tabs.querySelector(`[data-tab="${t}"]`).classList.toggle("active", t === name);
      panes[t] && (panes[t].hidden = t !== name);
    }
    if (name === "history") loadHistory();
    if (name === "used") loadUsed();
    if (name === "json") loadJson();
  };
  for (const t of tabNames) {
    const b = button(labels[t], () => show(t), "tab");
    b.dataset.tab = t;
    tabs.append(b);
    if (t !== "edit") {
      panes[t] = el("div", "pane");
      panes[t].hidden = true;
    }
  }
  body.append(editPane, ...tabNames.filter((t) => t !== "edit").map((t) => panes[t]));
  host.replaceChildren(head, tabs, body);
  show(hooks.tabInitial && tabNames.includes(hooks.tabInitial) ? hooks.tabInitial : "edit");

  function markDirty(v) {
    state.setDirty(v);
    dirtyBadge.hidden = !v;
  }
  markDirty(false);

  // --- save ------------------------------------------------------------------
  function collect() {
    const values = form.get();
    const children = childTable ? values[CHILD_KEY] : undefined;
    delete values[CHILD_KEY];
    const links = linkTable ? (values[LINK_KEY] ?? []).map((id) => ({ [cfg.links.column]: id })) : undefined;
    delete values[LINK_KEY];
    if (isNew) {
      delete values.created_at;
      delete values.updated_at;
    }
    cfg.beforeSave?.(values, ctx);
    return { row: values, children, links };
  }

  function showFindings(errors, warnings) {
    const all = [...tag(errors, "error"), ...tag(warnings, "warning")];
    const panel = findingsPanel(all);
    findingsHost.replaceWith(panel);
    findingsHost = panel;
    form.markErrors(all);
    if (all.length) panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  async function save() {
    let payload;
    try {
      payload = collect();
    } catch (err) {
      toast(err.message, "err");
      return;
    }
    const missing = form.validate();
    if (missing.length) {
      showFindings(missing, []);
      toast(missing[0].message, "err");
      return;
    }
    saveBtn.disabled = true;
    try {
      const path = isNew ? `/api/entities/${cfg.table}` : `/api/entities/${cfg.table}/${pk}`;
      const out = await api(path, { method: isNew ? "POST" : "PUT", body: payload });
      markDirty(false);
      clearRefCache();
      const saved = out.entity.row;
      const newPk = pkOf(saved);
      const warnings = tag(out.warnings, "warning");
      toast(warnings.length ? `Saved with ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : "Saved", "ok");
      hooks.afterSave(cfg.table, newPk, isNew);
      if (!isNew) {
        // Re-render with what the server stored (positions, timestamps, normalised values).
        await renderEditor(cfg, newPk, host, { ...hooks, tabInitial: "edit" });
        if (warnings.length) {
          const panel = host.querySelector(".pane");
          panel?.prepend(findingsPanel(warnings));
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.data.errors) {
        showFindings(err.data.errors, err.data.warnings);
        toast(err.message || "Fix the highlighted problems", "err");
      } else toast(err.message, "err");
    } finally {
      saveBtn.disabled = false;
    }
  }

  const pkOf = (row) => (cfg.raw && hooks.pkCols ? pkKey(row, hooks.pkCols) : encodeURIComponent(String(row.id)));

  // --- delete ----------------------------------------------------------------
  async function remove() {
    const label = cfg.titleOf(entity.row);
    if (!(await confirmDialog(`Delete “${label}”?${childTable ? " Its steps/questions/rooms are deleted with it." : ""} You can restore it from Backups → Recently deleted.`, { okLabel: "Delete", danger: true, title: "Delete" }))) return;
    const url = `/api/entities/${cfg.table}/${pk}`;
    try {
      try {
        await api(url, { method: "DELETE" });
      } catch (err) {
        if (!(err instanceof ApiError) || !err.data.needsReason) throw err;
        const reason = await promptDialog(`“${label}” has shipped to learners. Deleting retires its id for good. Why is it being removed?`, { okLabel: "Retire it", multiline: true, title: "Retire a shipped item" });
        if (reason === null) return;
        await api(`${url}?reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
      }
      markDirty(false);
      clearRefCache();
      toast("Deleted", "ok");
      hooks.afterDelete();
    } catch (err) {
      const errors = err instanceof ApiError ? err.data.errors : null;
      toast(errors?.length ? `${err.message}: ${errors[0].message}` : err.message, "err");
    }
  }

  // --- history -----------------------------------------------------------------
  async function loadHistory() {
    const pane = panes.history;
    pane.replaceChildren(el("p", "hint", "Loading…"));
    try {
      const { revisions } = await api(`/api/entities/${cfg.table}/${pk}/history`);
      pane.replaceChildren();
      pane.append(el("p", "hint", "Every save is recorded here (kept 90 days, or the latest 50 revisions). A version only exists once you Publish."));
      if (!revisions.length) pane.append(el("p", "empty", "No recorded changes yet."));
      for (const r of revisions) {
        const row = el("div", "history-row");
        row.append(el("span", `badge ${r.action}`, r.action), el("span", "when", fmtTime(r.ts * 1000)), el("span", "who", r.source));
        const act = el("div", "row-actions");
        act.append(button("Compare", () => compare(r), "mini"));
        if (r.hasBefore) act.append(button("Restore before this", () => restore(r, "before"), "mini"));
        if (r.hasAfter && r.action !== "create") act.append(button("Restore result", () => restore(r, "after"), "mini"));
        row.append(act);
        pane.append(row);
      }
    } catch (err) {
      pane.replaceChildren(el("p", "empty", err.message));
    }
  }

  async function compare(r) {
    const { revision } = await api(`/api/history/${r.id}`);
    const flat = (e) => (e ? { ...e.row, ...Object.fromEntries(Object.entries(e.children).map(([t, rows]) => [t, rows])) } : {});
    const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === "updated_at" ? undefined : v)));
    const rows = diffObjects(strip(flat(revision.before)), strip(flat(revision.after)));
    modal({
      title: `${r.action} · ${fmtTime(r.ts * 1000)}`,
      wide: true,
      build: (b) => b.append(diffTable(rows)),
      actions: [{ label: "Close", kind: "ghost" }],
    });
  }

  async function restore(r, side) {
    if (!(await confirmDialog(`Put this item back to how it was ${side === "before" ? "before" : "after"} that change? This is recorded as a new change.`, { okLabel: "Restore", title: "Restore" }))) return;
    try {
      await api(`/api/history/${r.id}/restore`, { method: "POST", body: { side } });
      toast("Restored", "ok");
      clearRefCache();
      hooks.afterSave(cfg.table, pk, false);
      await renderEditor(cfg, pk, host, { ...hooks, tabInitial: "history" });
    } catch (err) {
      toast(err.message, "err");
    }
  }

  // --- used by -------------------------------------------------------------------
  async function loadUsed() {
    const pane = panes.used;
    pane.replaceChildren(el("p", "hint", "Loading…"));
    try {
      const { usages } = await api(`/api/used-by?table=${cfg.table}&id=${encodeURIComponent(entity.row.id ?? pk)}`);
      pane.replaceChildren(el("p", "hint", "Other content that mentions this id. Check these before renaming or deleting."));
      if (!usages.length) pane.append(el("p", "empty", "Nothing else refers to this item."));
      for (const u of usages) {
        const row = el("button", "usage");
        row.type = "button";
        row.append(el("strong", null, u.table), el("span", null, ` ${decodeURIComponent(u.pk.split("~").join(" / "))}`), el("span", "hint", ` in ${u.columns.join(", ")}`));
        row.onclick = () => hooks.open(u.table, u.pk);
        pane.append(row);
      }
    } catch (err) {
      pane.replaceChildren(el("p", "empty", err.message));
    }
  }

  // --- JSON ----------------------------------------------------------------------
  function loadJson() {
    const pane = panes.json;
    let data;
    try {
      data = collectForView();
    } catch (err) {
      pane.replaceChildren(el("p", "empty", err.message));
      return;
    }
    const pre = el("pre", "json-view");
    pre.textContent = JSON.stringify(data, null, 2);
    pane.replaceChildren(el("p", "hint", "What would be saved right now (read-only)."), button("Copy", async () => {
      await navigator.clipboard?.writeText(pre.textContent);
      toast("Copied");
    }, "mini"), pre);
  }
  function collectForView() {
    const v = form.get();
    return v;
  }

  // keyboard
  host.onkeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save();
    }
  };
  host.__save = save;
}
