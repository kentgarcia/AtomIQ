// Content Studio shell: layout, router, content-type list pane, status bar.

import { $, api, button, confirmDialog, debounce, el, pkKey, state, toast } from "./core.js";
import { renderEditor } from "./entity.js";
import { openPublish, renderBackups, renderChanges, renderProblems, renderReleases, renderSearch, renderSql } from "./panels.js";
import { CHILD_TO_PARENT, TYPES, TYPE_BY_TABLE, rawType } from "./types.js";

const main = $("#main");
const sidebar = $("#sidebar");
const listPane = $("#listpane");

let currentHash = location.hash || "#/";
let ignoreHashChange = false;
let listRows = [];
let listTable = null;

const tableMeta = (name) => state.meta.tables.find((t) => t.name === name);
const typeFor = (table) => TYPE_BY_TABLE[table] ?? (tableMeta(table) ? rawType(tableMeta(table)) : null);

// ---------------------------------------------------------------------------
// status bar
// ---------------------------------------------------------------------------

async function refreshStatus() {
  const [status, meta] = await Promise.all([api("/api/status"), api("/api/meta")]);
  state.status = status;
  state.meta = meta;
  renderTopbar();
  renderSidebar();
}

function renderTopbar() {
  const s = state.status;
  const ver = $("#version");
  ver.textContent = s.version;
  ver.className = `version ${s.published ? "published" : "draft"}`;
  ver.title = s.published ? "The working content equals this published version." : "Working draft on top of the last published version.";
  const changes = $("#changes-btn");
  if (s.published) {
    changes.textContent = "No unpublished changes";
    changes.className = "ghost";
    $("#publish-btn").disabled = true;
  } else {
    changes.textContent = s.unpublished == null ? "Unpublished changes" : `${s.unpublished} unpublished change${s.unpublished === 1 ? "" : "s"}`;
    changes.className = "ghost attention";
    $("#publish-btn").disabled = false;
  }
}

// ---------------------------------------------------------------------------
// sidebar
// ---------------------------------------------------------------------------

function navLink(href, label, { count, icon } = {}) {
  const a = el("a", "nav-link");
  a.href = href;
  if (icon) a.append(el("span", "nav-icon", icon));
  a.append(el("span", "nav-label", label));
  if (count !== undefined) a.append(el("span", "count", String(count)));
  a.dataset.href = href;
  return a;
}

function renderSidebar() {
  sidebar.replaceChildren();
  const groups = [...new Set(TYPES.map((t) => t.group))];
  sidebar.append(navLink("#/", "Overview", { icon: "🏠" }));
  for (const g of groups) {
    sidebar.append(el("h3", null, g));
    for (const t of TYPES.filter((x) => x.group === g)) sidebar.append(navLink(`#/t/${t.table}`, t.label, { count: tableMeta(t.table)?.count ?? 0, icon: t.icon }));
  }
  sidebar.append(el("h3", null, "Publish"));
  const changed = state.status.unpublished;
  sidebar.append(
    navLink("#/changes", "Changes", { count: state.status.published ? 0 : (changed ?? "…"), icon: "✏️" }),
    navLink("#/releases", "Releases", { icon: "🏷️" }),
    navLink("#/backups", "Backups", { icon: "🛟" }),
    navLink("#/problems", "Problems", { icon: "⚠️" }),
    navLink("#/sql", "SQL console", { icon: "⌨️" }),
  );
  const raw = el("details", "raw-tables");
  raw.append(el("summary", null, "Raw tables"));
  for (const t of state.meta.tables) raw.append(navLink(`#/t/${t.name}`, t.name, { count: t.count }));
  sidebar.append(raw);
  markActiveNav();
}

function markActiveNav() {
  const parts = currentHash.split("/");
  const base = parts[1] === "t" ? `#/t/${parts[2]}` : `#/${parts[1] ?? ""}`;
  for (const a of sidebar.querySelectorAll(".nav-link")) a.classList.toggle("active", a.dataset.href === base || (base === "#/" && a.dataset.href === "#/"));
}

// ---------------------------------------------------------------------------
// routing
// ---------------------------------------------------------------------------

/** `pk` is an encoded key (parts encoded, joined by ~). Child rows open their parent. */
export function open(table, pk) {
  const parent = CHILD_TO_PARENT[table];
  const key = parent ? String(pk).split("~")[0] : String(pk);
  location.hash = `#/t/${parent ?? table}/${key}`;
}

const hooksFor = (cfg) => ({
  rows: listRows,
  pkCols: tableMeta(cfg.table)?.pkCols,
  open,
  refreshStatus,
  afterSave: async (table, pk, isNew) => {
    await loadList(cfg, { keepSelection: true });
    refreshStatus();
    if (isNew) {
      state.setDirty(false);
      location.hash = `#/t/${table}/${pk}`;
    }
  },
  afterDelete: async () => {
    await loadList(cfg, {});
    refreshStatus();
    location.hash = `#/t/${cfg.table}`;
  },
});

async function route() {
  const hash = location.hash || "#/";
  currentHash = hash;
  markActiveNav();
  state.setDirty(false);
  const [, kind, a, b] = hash.split("/");
  const hooks = { open, refreshStatus };
  const showPage = () => {
    listPane.hidden = true;
    main.className = "page";
    main.scrollTop = 0;
  };
  try {
    if (kind === "t" && a) {
      const cfg = typeFor(a);
      if (!cfg) {
        showPage();
        main.replaceChildren(el("p", "empty", `Unknown table ${a}`));
        return;
      }
      listPane.hidden = false;
      main.className = "editor";
      if (listTable !== cfg.table) await loadList(cfg, {});
      else markActiveRow(b);
      if (b === "new") {
        await renderEditor(cfg, null, main, hooksFor(cfg));
      } else if (b) {
        await renderEditor(cfg, b, main, hooksFor(cfg));
      } else {
        main.replaceChildren(el("p", "empty", `Pick a ${cfg.singular} from the list, or create a new one.`));
      }
      return;
    }
    showPage();
    listTable = null;
    switch (kind) {
      case "changes":
        return await renderChanges(main, hooks);
      case "releases":
        return await renderReleases(main, hooks);
      case "backups":
        return await renderBackups(main, hooks);
      case "problems":
        return await renderProblems(main, hooks);
      case "sql":
        return renderSql(main);
      case "search":
        return await renderSearch(main, hooks, decodeURIComponent(a ?? ""));
      default:
        return await renderHome();
    }
  } catch (err) {
    main.replaceChildren(el("p", "empty", err.message));
    toast(err.message, "err");
  }
}

window.addEventListener("hashchange", async () => {
  if (ignoreHashChange) {
    ignoreHashChange = false;
    return;
  }
  if (state.dirty) {
    const target = location.hash;
    ignoreHashChange = true;
    location.hash = currentHash;
    if (await confirmDialog("You have unsaved changes. Leave without saving?", { okLabel: "Discard changes", danger: true, title: "Unsaved changes" })) {
      state.setDirty(false);
      location.hash = target;
    }
    return;
  }
  route();
});

window.addEventListener("beforeunload", (e) => {
  if (state.dirty) e.preventDefault();
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && main.__save) {
    e.preventDefault();
    main.__save();
  }
  if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? "")) {
    e.preventDefault();
    $("#search").focus();
  }
});

// ---------------------------------------------------------------------------
// list pane
// ---------------------------------------------------------------------------

async function loadList(cfg, { keepSelection } = {}) {
  listTable = cfg.table;
  const q = $("#list-search").value.trim();
  $("#list-title").textContent = cfg.label;
  $("#list-new").onclick = () => (location.hash = `#/t/${cfg.table}/new`);
  const data = await api(`/api/rows/${cfg.table}?limit=500${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  listRows.length = 0;
  listRows.push(...data.rows);
  $("#list-count").textContent = `${data.rows.length}${data.total > data.rows.length ? ` of ${data.total}` : ""}`;
  renderList(cfg);
  if (keepSelection) markActiveRow(currentHash.split("/")[3]);
}

function renderList(cfg) {
  const ul = $("#list-items");
  ul.replaceChildren();
  const meta = tableMeta(cfg.table);
  const pkOf = (r) => (cfg.raw ? pkKey(r, meta.pkCols) : encodeURIComponent(String(r.id)));
  const makeItem = (r, extra) => {
    const li = el("li");
    const a = el("a", "list-item");
    a.href = `#/t/${cfg.table}/${pkOf(r)}`;
    a.dataset.pk = pkOf(r);
    const top = el("div", "li-top");
    top.append(el("span", "li-title", cfg.titleOf(r) || "(untitled)"));
    const badge = cfg.badgeOf?.(r);
    if (badge) top.append(el("span", `badge status-${badge}`, badge));
    a.append(top, el("div", "li-sub", cfg.subOf?.(r) ?? ""));
    li.append(a);
    if (extra) li.append(extra);
    return li;
  };

  if (cfg.pool) {
    const { scopeColumn, order } = cfg.pool;
    for (const scope of order) {
      const rows = listRows.filter((r) => r[scopeColumn] === scope).sort((x, y) => x.position - y.position);
      ul.append(el("li", "list-group", `${scope} · ${rows.length}`));
      rows.forEach((r, i) => {
        const move = el("div", "li-move");
        const mk = (label, title, delta) => {
          const b = button(label, async (e) => {
            e.preventDefault();
            const ids = rows.map((x) => x.id);
            const j = i + delta;
            if (j < 0 || j >= ids.length) return;
            [ids[i], ids[j]] = [ids[j], ids[i]];
            try {
              await api("/api/pools/reorder", { method: "POST", body: { table: cfg.table, scopeColumn, scopeValue: scope, ids } });
              await loadList(cfg, { keepSelection: true });
              refreshStatus();
            } catch (err) {
              toast(err.message, "err");
            }
          }, "mini");
          b.title = title;
          return b;
        };
        move.append(mk("▲", "Move up in the pool", -1), mk("▼", "Move down in the pool", 1));
        ul.append(makeItem(r, move));
      });
    }
  } else {
    for (const r of listRows) ul.append(makeItem(r));
  }
  if (!listRows.length) ul.append(el("li", "empty", "Nothing here yet."));
  markActiveRow(currentHash.split("/")[3]);
}

function markActiveRow(pk) {
  for (const a of listPane.querySelectorAll(".list-item")) a.classList.toggle("active", pk !== undefined && a.dataset.pk === pk);
}

$("#list-search").addEventListener(
  "input",
  debounce(() => {
    const cfg = typeFor(listTable);
    if (cfg) loadList(cfg, { keepSelection: true });
  }, 200),
);

// ---------------------------------------------------------------------------
// home
// ---------------------------------------------------------------------------

async function renderHome() {
  const s = state.status;
  const page = el("div", "home");
  page.append(el("h2", null, "AtomIQ Content Studio"));
  page.append(el("p", "hint", "You are editing the working copy. Each save is checked and recorded. A numbered version is created only when you publish."));

  const card = el("div", "card home-card");
  card.append(el("div", "big", s.version), el("div", "hint", s.published ? "The working content equals the last published version." : `Draft on top of ${s.lastVersion ?? "nothing published yet"}.`));
  const row = el("div", "row-actions");
  if (!s.published) row.append(button("See changes", () => (location.hash = "#/changes"), "ghost"), button("Publish…", () => openPublish({ refreshStatus }), "primary"));
  card.append(row);
  page.append(card);

  const grid = el("div", "stat-grid");
  for (const t of TYPES) {
    const a = el("a", "stat");
    a.href = `#/t/${t.table}`;
    a.append(el("div", "big", String(tableMeta(t.table)?.count ?? 0)), el("div", "hint", t.label));
    grid.append(a);
  }
  page.append(grid);

  const check = el("div", "card");
  check.append(el("strong", null, "Content checks"), el("p", "hint", "Checking…"));
  page.append(check);
  main.replaceChildren(page);
  try {
    const p = await api("/api/problems");
    check.replaceChildren(el("strong", null, "Content checks"));
    const line = el("p");
    line.append(el("span", `badge ${p.errors.length ? "err" : "ok"}`, `${p.errors.length} errors`), document.createTextNode(" "), el("span", "badge warn", `${p.warnings.length} warnings`), document.createTextNode(" "), el("a", null, "Open Problems"));
    line.lastChild.href = "#/problems";
    check.append(line);
  } catch (err) {
    check.append(el("p", "error-text", err.message));
  }

  if (state.meta.preview?.enabled) {
    const info = await api("/api/preview/info");
    const pc = el("div", "card");
    pc.append(el("strong", null, "Developer preview is on"), el("p", "hint", "A dev build on your network can load this working copy from Settings → Developer."), el("p", null, `Pairing code: ${info.code}`));
    for (const u of info.urls) pc.append(el("div", "mono", u));
    page.append(pc);
  }
}

// ---------------------------------------------------------------------------
// top bar
// ---------------------------------------------------------------------------

$("#changes-btn").onclick = () => (location.hash = "#/changes");
$("#publish-btn").onclick = () => openPublish({ refreshStatus });
$("#search").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.currentTarget.value.trim()) location.hash = `#/search/${encodeURIComponent(e.currentTarget.value.trim())}`;
});

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

try {
  await refreshStatus();
  await route();
} catch (err) {
  main.replaceChildren(el("p", "empty", `Could not reach the Studio server: ${err.message}`));
}
