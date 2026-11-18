// Whole-page views: Problems, Changes, Publish, Releases, Backups, Search, SQL.
// Each `render*(host, hooks)` fills `host`; hooks = { open(table, pk), refreshStatus() }.

import { ApiError, api, apiStream, button, confirmDialog, diffObjects, diffTable, el, fmtBytes, fmtTime, modal, promptDialog, toast, decodePk } from "./core.js";
import { CHILD_TO_PARENT, TYPE_BY_TABLE } from "./types.js";

const pageHead = (title, hint) => {
  const h = el("div", "page-head");
  h.append(el("h2", null, title));
  if (hint) h.append(el("p", "hint", hint));
  return h;
};

/** Where to open a finding: children open their parent. */
export function locate(table, id) {
  const parent = CHILD_TO_PARENT[table];
  const first = String(id).split("/")[0];
  return { table: parent ?? table, pk: encodeURIComponent(parent ? first : String(id)) };
}

const tableLabel = (t) => TYPE_BY_TABLE[t]?.label ?? t;

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

export async function renderProblems(host, hooks) {
  host.replaceChildren(pageHead("Problems", "Everything the content checks found. Errors block publishing; warnings are worth a look."), el("p", "hint", "Checking…"));
  const out = await api("/api/problems");
  const { errors, warnings } = out;
  host.replaceChildren(pageHead("Problems", "Everything the content checks found. Errors block publishing; warnings are worth a look."));
  const summary = el("div", "summary-row");
  summary.append(el("span", `badge ${errors.length ? "err" : "ok"}`, `${errors.length} error${errors.length === 1 ? "" : "s"}`), el("span", "badge warn", `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`), button("Re-check", () => renderProblems(host, hooks), "mini"));
  host.append(summary);
  if (!errors.length && !warnings.length) host.append(el("p", "empty", "No problems. ✓"));

  const groups = new Map();
  for (const f of [...errors, ...warnings]) {
    const k = `${f.severity}:${f.rule}`;
    if (!groups.has(k)) groups.set(k, { severity: f.severity, rule: f.rule, items: [] });
    groups.get(k).items.push(f);
  }
  for (const g of [...groups.values()].sort((a, b) => (a.severity === b.severity ? b.items.length - a.items.length : a.severity === "error" ? -1 : 1))) {
    const det = el("details", `problem-group ${g.severity}`);
    det.open = g.severity === "error";
    const sum = el("summary");
    sum.append(el("span", `badge ${g.severity === "error" ? "err" : "warn"}`, g.severity), el("strong", null, ` ${g.rule}`), el("span", "hint", ` · ${g.items.length}`));
    det.append(sum);
    for (const f of g.items.slice(0, 200)) {
      const row = el("button", "usage");
      row.type = "button";
      row.append(el("strong", null, tableLabel(f.table)), el("span", null, ` ${f.id}`), el("span", "hint", ` ${f.field ?? ""}`), el("div", "msg", f.message));
      const target = locate(f.table, f.id);
      row.onclick = () => hooks.open(target.table, target.pk);
      det.append(row);
    }
    if (g.items.length > 200) det.append(el("p", "hint", `…and ${g.items.length - 200} more`));
    host.append(det);
  }
}

// ---------------------------------------------------------------------------
// Changes (since the last release)
// ---------------------------------------------------------------------------

function changeList(host, tables, { version, hooks }) {
  const names = Object.keys(tables);
  if (!names.length) {
    host.append(el("p", "empty", "No differences."));
    return;
  }
  for (const table of names) {
    const { added, changed, removed } = tables[table];
    const sec = el("details", "change-table");
    sec.open = true;
    const sum = el("summary");
    sum.append(el("strong", null, tableLabel(table)), el("span", "hint", ` · ${added.length} added · ${changed.length} edited · ${removed.length} removed`));
    sec.append(sum);
    const item = (kind, key) => {
      const row = el("div", "change-row");
      row.append(el("span", `badge ${kind}`, kind), el("span", "name", decodePk(key).join(" / ")));
      if (kind !== "removed" && hooks?.open) row.append(button("Open", () => hooks.open(table, key), "mini"));
      if (version && kind !== "added") row.append(button("What changed", () => showDetail(table, key), "mini"));
      sec.append(row);
    };
    added.forEach((k) => item("added", k));
    changed.forEach((k) => item("edited", k));
    removed.forEach((k) => item("removed", k));
    host.append(sec);
  }
}

async function showDetail(table, pk) {
  try {
    const d = await api(`/api/changes/detail?table=${table}&pk=${encodeURIComponent(pk)}`);
    const strip = (o) => (o ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== "updated_at")) : null);
    modal({
      title: `${tableLabel(table)} · ${decodePk(pk).join(" / ")}`,
      wide: true,
      build: (b) => b.append(diffTable(diffObjects(strip(d.before), strip(d.after)))),
      actions: [{ label: "Close", kind: "ghost" }],
    });
  } catch (err) {
    toast(err.message, "err");
  }
}

export async function renderChanges(host, hooks) {
  host.replaceChildren(pageHead("Changes", "What is different from the last published version."), el("p", "hint", "Loading…"));
  const c = await api("/api/changes");
  host.replaceChildren(pageHead("Changes", c.lastVersion ? `Compared with the last published version, ${c.lastVersion}.` : "Nothing has been published yet, so everything is new."));
  if (c.published) {
    host.append(el("p", "empty", "Nothing unpublished. The working content matches the last release. ✓"));
    return;
  }
  const bar = el("div", "summary-row");
  bar.append(el("strong", null, `${c.total ?? "?"} unpublished change${c.total === 1 ? "" : "s"}`));
  if (c.suggestion) bar.append(el("span", `badge bump-${c.suggestion.bump}`, `suggests ${c.suggestion.bump}`), el("span", "hint", c.suggestion.reasons.join(" · ")));
  bar.append(button("Publish…", () => openPublish(hooks), "primary"));
  host.append(bar);
  changeList(host, c.tables, { version: c.lastVersion, hooks });
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

export async function openPublish(hooks) {
  const [status, problems] = await Promise.all([api("/api/status"), api("/api/problems")]);
  if (status.published) {
    toast("Nothing to publish: content matches the last release.");
    return;
  }
  // Unverified references are warnings in a draft but errors at the publish gate; the box below overrides that.
  const unreviewed = problems.warnings.filter((f) => f.rule === "reference-unverified");
  const blocking = problems.errors;
  const suggested = status.suggestion?.bump ?? "patch";

  let bump = suggested;
  let notes;
  let allow;
  let log;
  let publishBtn;

  const m = modal({
    title: `Publish ${status.lastVersion ? `after ${status.lastVersion}` : "the first version"}`,
    wide: true,
    build: (body) => {
      body.append(el("p", "hint", "Publishing validates everything, takes a backup, then freezes this content as a numbered version and updates the app bundle. Learners only see it once you ship a build or an update."));
      if (status.suggestion?.reasons.length) body.append(el("p", null, `Suggested bump: ${suggested} — ${status.suggestion.reasons.join("; ")}.`));
      if (blocking.length) {
        const box = el("div", "findings");
        box.append(el("strong", null, `${blocking.length} error${blocking.length === 1 ? "" : "s"} must be fixed first`));
        const ul = el("ul");
        blocking.slice(0, 6).forEach((f) => ul.append(el("li", "err", `${tableLabel(f.table)} ${f.id}: ${f.message}`)));
        box.append(ul, button("Open Problems", () => { m.close(); location.hash = "#/problems"; }, "mini"));
        body.append(box);
      }
      const bumpRow = el("div", "field");
      bumpRow.append(el("label", null, "Version bump"));
      const sel = el("select");
      for (const b of ["patch", "minor", "major"]) sel.append(new Option(`${b}${b === suggested ? " (suggested)" : ""}`, b));
      sel.value = bump;
      sel.onchange = () => (bump = sel.value);
      bumpRow.append(sel, el("div", "hint", "You can raise the suggestion but not lower it: patch = edits only, minor = items added or removed, major = a shipped id retired or the schema changed."));
      body.append(bumpRow);

      const notesRow = el("div", "field");
      notesRow.append(el("label", null, "Release notes (required)"));
      notes = el("textarea");
      notes.rows = 4;
      notes.placeholder = "What changed for learners? e.g. New lesson on half-life; fixed the Radon quiz answer.";
      notesRow.append(notes);
      body.append(notesRow);

      if (unreviewed.length) {
        const row = el("label", "checkline warnbox");
        allow = el("input");
        allow.type = "checkbox";
        row.append(allow, document.createTextNode(` ${unreviewed.length} reference${unreviewed.length === 1 ? " is" : "s are"} not verified yet. Publish anyway (recorded in the release).`));
        body.append(row);
      }
      log = el("pre", "log");
      log.hidden = true;
      body.append(log);
    },
    actions: [
      { label: "Cancel", kind: "ghost" },
      {
        id: "publish",
        label: "Publish",
        kind: "primary",
        close: false,
        onClick: async (d) => {
          if (!notes.value.trim()) return notes.focus();
          if (unreviewed.length && !allow.checked) return toast("Verify the pending references, or tick the box to publish anyway.", "err");
          if (blocking.length) return toast("Fix the errors first.", "err");
          publishBtn = d.buttons.publish;
          publishBtn.disabled = true;
          log.hidden = false;
          log.textContent = "";
          let result = null;
          let failure = null;
          try {
            await apiStream("/api/releases/publish", { bump, notes: notes.value.trim(), allowUnreviewed: !!allow?.checked }, (line) => {
              if (line.log) log.textContent += `${line.log}\n`;
              if (line.done) result = line;
              if (line.error) failure = line;
              log.scrollTop = log.scrollHeight;
            });
          } catch (err) {
            failure = { message: err.message };
          }
          if (failure) {
            log.textContent += `\n✗ ${failure.message}\n`;
            publishBtn.disabled = false;
            return;
          }
          hooks.refreshStatus();
          m.close();
          showPublished(result);
        },
      },
    ],
  });
}

function showPublished(result) {
  const r = result.release;
  modal({
    title: `Published ${r.version}`,
    wide: true,
    build: (body) => {
      body.append(el("p", null, "Frozen and written to the repo. Two steps remain before learners see it:"));
      const ol = el("ol", "next-steps");
      ol.append(el("li", null, "Commit the changed files (the ledger, snapshot, release archive and both content.db files)."));
      ol.append(el("li", null, "Ship it: a new store build, or an over-the-air update for builds with the same schema."));
      body.append(ol);
      if (result.commands?.length) {
        body.append(el("p", "hint", "Commands:"));
        for (const c of result.commands) {
          const pre = el("pre", "cmd");
          pre.textContent = c;
          body.append(pre);
        }
      }
    },
    actions: [{ label: "Close", kind: "primary" }],
  });
}

// ---------------------------------------------------------------------------
// Releases
// ---------------------------------------------------------------------------

export async function renderReleases(host, hooks) {
  host.replaceChildren(pageHead("Releases", "Every published version, newest first. Versions are only created by Publish."), el("p", "hint", "Loading…"));
  const { releases, status } = await api("/api/releases");
  host.replaceChildren(pageHead("Releases", "Every published version, newest first. Versions are only created by Publish."));
  const bar = el("div", "summary-row");
  bar.append(el("strong", null, `Working copy: ${status.version}`), el("span", `badge ${status.published ? "ok" : "warn"}`, status.published ? "matches last release" : "unpublished changes"));
  if (!status.published) bar.append(button("Publish…", () => openPublish(hooks), "primary"));
  host.append(bar);
  if (!releases.length) host.append(el("p", "empty", "Nothing published yet."));
  for (const r of releases) {
    const card = el("div", "release");
    const top = el("div", "release-top");
    top.append(el("strong", "ver", r.version), el("span", "hint", fmtTime(r.date)), r.bump && el("span", `badge bump-${r.bump}`, r.bump), r.unreviewedAllowed && el("span", "badge warn", "unreviewed allowed"), r.update?.groupId && el("span", "badge ok", `update ${r.update.groupId}`));
    card.append(top);
    if (r.notes) card.append(el("p", "notes", r.notes));
    const act = el("div", "row-actions");
    act.append(
      button("View changes", async () => {
        const c = await api(`/api/releases/${r.version}/changes`);
        modal({
          title: `${r.version}${c.from ? ` since ${c.from}` : ""}`,
          wide: true,
          build: (b) => changeList(b, c.tables, { version: null }),
          actions: [{ label: "Close", kind: "ghost" }],
        });
      }, "mini"),
      button("Restore as draft", () => restoreRelease(r, host, hooks), "mini"),
      button(r.update?.groupId ? "Change update id" : "Record update id", () => recordUpdate(r, host, hooks), "mini"),
    );
    card.append(act);
    host.append(card);
  }
}

async function restoreRelease(r, host, hooks) {
  if (!(await confirmDialog(`Replace the working content with the published ${r.version}? Your current content is backed up first, and nothing is deleted from the releases list.`, { okLabel: "Restore as draft", title: `Restore ${r.version}` }))) return;
  try {
    let out;
    try {
      out = await api(`/api/releases/${r.version}/restore`, { method: "POST", body: {} });
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 409) throw err;
      if (!(await confirmDialog(`${err.message}\n\nRestore anyway?`, { okLabel: "Restore anyway", danger: true }))) return;
      out = await api(`/api/releases/${r.version}/restore`, { method: "POST", body: { force: true } });
    }
    toast(out.preRestoreBackup ? `Restored. Previous content saved as ${out.preRestoreBackup}` : "Restored", "ok");
    hooks.refreshStatus();
    renderReleases(host, hooks);
  } catch (err) {
    toast(err.message, "err");
  }
}

async function recordUpdate(r, host, hooks) {
  const id = await promptDialog(`Paste the EAS Update group id for ${r.version} (printed by eas update).`, { okLabel: "Record", initial: r.update?.groupId ?? "", title: "Record update" });
  if (id === null) return;
  try {
    await api("/api/releases/record-update", { method: "POST", body: { groupId: id, version: r.version } });
    toast("Recorded", "ok");
    renderReleases(host, hooks);
  } catch (err) {
    toast(err.message, "err");
  }
}

// ---------------------------------------------------------------------------
// Backups
// ---------------------------------------------------------------------------

const REASONS = { "auto-daily": "daily", "pre-publish": "before publish", "pre-restore": "before restore", "pre-script": "before a script", manual: "manual" };

export async function renderBackups(host, hooks) {
  host.replaceChildren(pageHead("Backups", "Consistent copies of the content database. Taken automatically each day, before every publish and restore, and whenever you ask."), el("p", "hint", "Loading…"));
  const [{ backups }, { items: deleted }] = await Promise.all([api("/api/backups"), api("/api/deleted")]);
  host.replaceChildren(pageHead("Backups", "Consistent copies of the content database. Taken automatically each day, before every publish and restore, and whenever you ask."));
  const bar = el("div", "summary-row");
  bar.append(button("Back up now", async () => {
    const label = await promptDialog("Optional label (manual backups are never deleted automatically).", { okLabel: "Back up", required: false, title: "Back up now" });
    if (label === null) return;
    await api("/api/backups", { method: "POST", body: { label: label || undefined } });
    toast("Backup created", "ok");
    renderBackups(host, hooks);
  }, "primary"));
  host.append(bar);

  if (!backups.length) host.append(el("p", "empty", "No backups yet."));
  for (const b of backups) {
    const row = el("div", "backup");
    const top = el("div", "release-top");
    const rows = Object.values(b.counts ?? {}).reduce((n, c) => n + c, 0);
    top.append(el("strong", null, fmtTime(b.createdAt)), el("span", "badge", REASONS[b.reason] ?? b.reason), b.label && el("span", "hint", b.label), el("span", "hint", `${fmtBytes(b.size)} · ${rows} rows`));
    row.append(top);
    const act = el("div", "row-actions");
    act.append(
      button("Compare with now", async () => {
        const s = await api(`/api/backups/${encodeURIComponent(b.name)}/summary`);
        const lines = [
          ...Object.entries(s.counts.added).map(([t, n]) => `${n} ${t} added since this backup`),
          ...Object.entries(s.counts.changed).map(([t, n]) => `${n} ${t} edited since this backup`),
          ...Object.entries(s.counts.retired).map(([t, n]) => `${n} ${t} removed since this backup`),
        ];
        modal({
          title: "Since this backup",
          build: (body) => {
            if (!lines.length) return body.append(el("p", null, "The content is identical to this backup."));
            const ul = el("ul");
            lines.forEach((l) => ul.append(el("li", null, l)));
            body.append(ul);
          },
          actions: [{ label: "Close", kind: "ghost" }],
        });
      }, "mini"),
      button("Restore", () => restoreBackup(b, host, hooks), "mini danger"),
    );
    row.append(act);
    host.append(row);
  }

  host.append(el("h3", "section", "Recently deleted"));
  host.append(el("p", "hint", "Deleted items stay recoverable while their history is kept."));
  if (!deleted.length) host.append(el("p", "empty", "Nothing deleted recently."));
  for (const d of deleted) {
    const row = el("div", "backup");
    row.append(el("strong", null, d.title), el("span", "hint", ` ${tableLabel(d.table)} · ${fmtTime(d.ts * 1000)}`));
    const act = el("div", "row-actions");
    act.append(button("Restore", async () => {
      try {
        await api(`/api/history/${d.id}/restore`, { method: "POST", body: { side: "before" } });
        toast("Restored", "ok");
        hooks.refreshStatus();
        renderBackups(host, hooks);
      } catch (err) {
        toast(err.message, "err");
      }
    }, "mini"));
    row.append(act);
    host.append(row);
  }
}

async function restoreBackup(b, host, hooks) {
  if (!(await confirmDialog(`Replace the working content with the backup from ${fmtTime(b.createdAt)}? Everything since then is lost, but a safety backup is taken first.`, { okLabel: "Restore", danger: true, title: "Restore backup" }))) return;
  try {
    let out;
    try {
      out = await api(`/api/backups/${encodeURIComponent(b.name)}/restore`, { method: "POST", body: {} });
    } catch (err) {
      if (!(err instanceof ApiError) || !err.data.schemaMismatch) throw err;
      if (!(await confirmDialog(`${err.message}\n\nRestore anyway?`, { okLabel: "Restore anyway", danger: true }))) return;
      out = await api(`/api/backups/${encodeURIComponent(b.name)}/restore`, { method: "POST", body: { force: true } });
    }
    toast(out.preRestoreBackup ? `Restored. Previous content saved as ${out.preRestoreBackup}` : "Restored", "ok");
    hooks.refreshStatus();
    renderBackups(host, hooks);
  } catch (err) {
    toast(err.message, "err");
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function renderSearch(host, hooks, query) {
  host.replaceChildren(pageHead(`Search: ${query}`));
  if (query.trim().length < 2) {
    host.append(el("p", "empty", "Type at least two characters."));
    return;
  }
  const { results } = await api(`/api/search?q=${encodeURIComponent(query)}`);
  if (!results.length) host.append(el("p", "empty", "No matches."));
  for (const r of results) {
    const row = el("button", "usage");
    row.type = "button";
    const title = r.row.title ?? r.row.term ?? r.row.question ?? r.row.myth_statement ?? r.row.id ?? r.pk;
    row.append(el("strong", null, tableLabel(r.table)), el("span", null, ` ${title}`), el("span", "hint", ` in ${r.column}`), el("div", "msg", `…${r.snippet}…`));
    row.onclick = () => hooks.open(r.table, r.pk);
    host.append(row);
  }
}

// ---------------------------------------------------------------------------
// SQL console
// ---------------------------------------------------------------------------

export function renderSql(host) {
  host.replaceChildren(pageHead("SQL console", "Read-only: a single SELECT / WITH statement or a read-only PRAGMA. Ctrl+Enter runs it."));
  const input = el("textarea", "mono sql-input");
  input.rows = 6;
  input.spellcheck = false;
  input.placeholder = "SELECT id, title FROM lessons LIMIT 20";
  const out = el("div", "sql-output");
  const run = async () => {
    if (!input.value.trim()) return;
    out.replaceChildren();
    try {
      const { rows } = await api("/api/query", { method: "POST", body: { sql: input.value } });
      if (!rows.length) return out.append(el("p", "empty", "No rows."));
      const cols = Object.keys(rows[0]);
      const table = el("table", "grid");
      const head = el("tr");
      cols.forEach((c) => head.append(el("th", null, c)));
      table.append(head);
      for (const r of rows.slice(0, 500)) {
        const tr = el("tr");
        cols.forEach((c) => tr.append(el("td", null, r[c] === null ? "null" : String(r[c]).slice(0, 300))));
        table.append(tr);
      }
      out.append(el("p", "hint", `${rows.length} row${rows.length === 1 ? "" : "s"}${rows.length > 500 ? " (first 500 shown)" : ""}`), table);
    } catch (err) {
      out.append(el("p", "error-text", err.message));
    }
  };
  input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run();
  });
  host.append(input, button("Run", run, "primary"), out);
  input.focus();
}

