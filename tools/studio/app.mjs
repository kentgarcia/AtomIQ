// AtomIQ Content Studio — server factory.
//
// Zero dependencies: node:http for serving, node:sqlite for the database.
// `createStudio()` is used by server.mjs (the CLI entry) and by the tests.
//
// Security model (spec §4.1): the API can rewrite or delete content, so it is
// local-only by default.
//   * listens on 127.0.0.1 and answers only loopback clients
//   * rejects any request whose Host or Origin is not this server (blocks other
//     websites and DNS rebinding); no CORS headers are ever sent
//   * browser writes must come from this page (Origin present and matching);
//     any other client needs the per-run bearer token in .opencode/studio-token
//   * the one exception is `STUDIO_PREVIEW=1`: a read-only database download for
//     a dev build on the same network, guarded by a short pairing code

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import {
  clearStudioLock,
  createBackup,
  describeBackup,
  diffAgainstMaster,
  listBackups,
  maybeAutoDailyBackup,
  restoreMasterFrom,
  writeStudioLock,
} from "../../scripts/lib/backup.mjs";
import {
  StoreError,
  createStore,
  getRevision,
  listDeleted,
  listRevisions,
  openHistory,
} from "../../scripts/lib/content-store.mjs";
import {
  ENTITY_CHILDREN,
  ENTITY_LINKS,
  PARENT_OF,
  hydrateRow,
  ident,
  listContentTables,
  openDb,
  pkKey,
  tableInfo,
} from "../../scripts/lib/content-tables.mjs";
import { validateDatabase } from "../../scripts/lib/content-validate.mjs";
import * as CHAT_VOCAB from "../../scripts/lib/chat-vocab.mjs";
import * as SCAN_VOCAB from "../../scripts/lib/scan-vocab.mjs";
import * as SAFETY_VOCAB from "../../scripts/lib/safety-vocab.mjs";
import * as MAP_VOCAB from "../../scripts/lib/map-vocab.mjs";
import * as FEED_VOCAB from "../../scripts/lib/feed-vocab.mjs";
import { NPC_POSES } from "../../components/npc/npc-art.ts";
import { PHONE_APPS } from "../../services/phone-core.ts";
import { ART_IDS, ART_NAMES } from "../../components/lesson/visual/object-art.ts";
import { listIcons } from "../../scripts/lib/icon-names.mjs";
import { makePaths } from "../../scripts/lib/content-paths.mjs";
import {
  describeState,
  diffReleases,
  readLedger,
  readRetired,
  readSchemaVersion,
  readShipped,
  recordUpdate,
  restoreRelease,
  syncContent,
  withReleaseDb,
} from "../../scripts/lib/releases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
/** The publish flow runs the same CLI a human would, so the two can never drift apart. */
const RELEASE_CLI = path.resolve(__dirname, "..", "..", "scripts", "release-content.mjs");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
};

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Values arrive as JSON from the browser: store objects/arrays/booleans in SQLite-friendly form. */
function dehydrate(values, jsonCols) {
  const out = {};
  for (const [k, v] of Object.entries(values ?? {})) {
    if (v === undefined) continue;
    if (v !== null && typeof v === "object") out[k] = JSON.stringify(v);
    else if (jsonCols.has(k) && typeof v !== "string") out[k] = JSON.stringify(v);
    else if (typeof v === "boolean") out[k] = v ? 1 : 0;
    else out[k] = v;
  }
  return out;
}

/** The feed vocabulary for the editor panels (one source: scripts/lib/feed-vocab.mjs) plus the art ids a cover can use. */
function feedVocab() {
  const { FEED_TRIGGERS, FEED_KINDS, FEED_CHIPS, STREAK_DAYS, CHEST_PERIODS, RANK_DIRECTIONS, COMEBACK_MIN_DAYS, BLOCK_TYPES, COUNTED_BLOCK_TYPES, BLOG_UNLOCK_TRIGGERS, BLOG_LIMITS, FEED_TEXT_MAX, FEED_PLACEHOLDERS, TEMPLATE_TRIGGER_KEYS } = FEED_VOCAB;
  return { FEED_TRIGGERS, FEED_KINDS, FEED_CHIPS, STREAK_DAYS, CHEST_PERIODS, RANK_DIRECTIONS, COMEBACK_MIN_DAYS, BLOCK_TYPES, COUNTED_BLOCK_TYPES, BLOG_UNLOCK_TRIGGERS, BLOG_LIMITS, FEED_TEXT_MAX, FEED_PLACEHOLDERS, TEMPLATE_TRIGGER_KEYS, artIds: ART_IDS, artNames: ART_NAMES };
}

/** The chat vocabulary for the Phone editor (one source: scripts/lib/chat-vocab.mjs): kinds, triggers, actions, limits, poses and the live phone apps. */
function chatVocab() {
  const { CHAT_KINDS, CHAT_ACTIONS, CHAT_LIMITS, CHAT_TRIGGER_KINDS, CHAT_REPLY_TYPES, CHAT_REACTIONS, CHAT_STICKERS, CHAT_TITLE_MAX } = CHAT_VOCAB;
  return { CHAT_KINDS, CHAT_ACTIONS, CHAT_LIMITS, CHAT_TRIGGER_KINDS, CHAT_REPLY_TYPES, CHAT_REACTIONS, CHAT_STICKERS, CHAT_TITLE_MAX, poses: NPC_POSES, apps: PHONE_APPS.filter((a) => a.status === "live").map((a) => a.id) };
}

/** The scanner vocabulary for the Phone editor (one source: scripts/lib/scan-vocab.mjs): scenes, limits, the object pictures and every element symbol. */
function scanVocab() {
  return { SCAN_SCENES: SCAN_VOCAB.SCAN_SCENES, SCAN_LIMITS: SCAN_VOCAB.SCAN_LIMITS, artIds: ART_IDS, artNames: ART_NAMES };
}

/** The Safety Guide's and the Nuclear Map's vocabularies for the Phone editor (scripts/lib/safety-vocab.mjs, map-vocab.mjs). */
function safetyVocab() {
  return { SAFETY_SECTIONS: SAFETY_VOCAB.SAFETY_SECTIONS, SAFETY_LIMITS: SAFETY_VOCAB.SAFETY_LIMITS };
}
function mapVocab() {
  return { MAP_KINDS: MAP_VOCAB.MAP_KINDS, MAP_LIMITS: MAP_VOCAB.MAP_LIMITS };
}

function linkTableFor(table) {
  if (!ENTITY_LINKS[table]) throw new HttpError(400, `${table} has no link rows`);
  return ENTITY_LINKS[table].table;
}

const decodePk = (s) => String(s).split("~").map(decodeURIComponent);

/**
 * @param {{ root?: string, master?: string, port?: number, host?: string, preview?: boolean }} [options]
 */
export async function createStudio(options = {}) {
  const paths = makePaths(options.root, options.master ? { master: options.master } : {});
  const preview = !!options.preview;
  const requestedHost = options.host ?? (preview ? "0.0.0.0" : "127.0.0.1");

  let db = openDb(paths.master);
  let history = openHistory(paths.historyDb);
  let store = createStore({ db, history, paths });

  const reopen = () => {
    db = openDb(paths.master);
    store = createStore({ db, history, paths });
  };

  writeStudioLock(paths);

  // Bearer token for non-browser clients (the OpenCode plugin).
  const token = crypto.randomBytes(24).toString("hex");
  const tokenFile = path.join(paths.root, ".opencode", "studio-token");
  fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
  fs.writeFileSync(tokenFile, token, { mode: 0o600 });

  const previewCode = preview ? String(crypto.randomInt(100000, 1000000)) : null;
  let previewFailures = { count: 0, until: 0 };

  let port = 0;
  const allowedHosts = () => new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
  const allowedOrigins = () => new Set([...allowedHosts()].map((h) => `http://${h}`));

  // -------------------------------------------------------------------------
  // helpers
  // -------------------------------------------------------------------------

  const send = (res, status, body) => {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (c) => {
        size += c.length;
        if (size > 5_000_000) {
          reject(new HttpError(413, "Request body too large"));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });

  const readJson = async (req) => {
    const text = await readBody(req);
    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new HttpError(400, "Body is not valid JSON");
    }
  };

  /** Who is calling: `studio` for the browser UI, `plugin` for token clients. */
  function authorize(req, url, { isPreviewRoute }) {
    if (isPreviewRoute) return { source: "preview" };
    if (!LOOPBACK.has(req.socket.remoteAddress ?? "")) throw new HttpError(403, "Content Studio only answers this machine.");
    if (!allowedHosts().has(String(req.headers.host ?? "").toLowerCase())) throw new HttpError(403, "Unexpected Host header.");
    const origin = req.headers.origin;
    if (origin !== undefined && !allowedOrigins().has(origin)) throw new HttpError(403, "Cross-origin requests are not allowed.");
    const site = req.headers["sec-fetch-site"];
    if (site && !["same-origin", "none"].includes(site)) throw new HttpError(403, "Cross-site requests are not allowed.");

    const isWrite = !["GET", "HEAD"].includes(req.method);
    const bearer = /^Bearer (.+)$/.exec(String(req.headers.authorization ?? ""))?.[1];
    const bearerOk =
      !!bearer &&
      bearer.length === token.length &&
      crypto.timingSafeEqual(Buffer.from(bearer), Buffer.from(token));
    if (isWrite && origin === undefined && !bearerOk) {
      throw new HttpError(401, "Writes from outside the Studio page need the token in .opencode/studio-token.");
    }
    return { source: origin !== undefined ? "studio" : bearerOk ? "plugin" : "studio" };
  }

  const guardedWrite = (fn) => {
    try {
      maybeAutoDailyBackup(paths);
    } catch (err) {
      console.warn(`[studio] auto backup failed: ${err.message}`);
    }
    try {
      return fn();
    } catch (err) {
      if (err instanceof StoreError) {
        throw new HttpError(err.status, err.message, {
          errors: err.errors,
          warnings: err.warnings,
          needsReason: err.needsReason,
        });
      }
      if (err?.code === "ERR_SQLITE_ERROR") throw new HttpError(422, err.message);
      throw err;
    }
  };

  const hydrateEntity = (table, entity) => {
    if (!entity) return null;
    const { jsonCols } = tableInfo(db, table);
    const out = { row: hydrateRow(entity.row, jsonCols), children: {} };
    for (const [childTable, rows] of Object.entries(entity.children)) {
      const cj = tableInfo(db, childTable).jsonCols;
      out.children[childTable] = rows.map((r) => hydrateRow(r, cj));
    }
    return out;
  };

  const dehydrateRowFor = (table, row) => dehydrate(row, tableInfo(db, table).jsonCols);

  function metaPayload() {
    const tables = listContentTables(db).map((name) => {
      const count = db.prepare(`SELECT COUNT(*) AS n FROM ${ident(name)}`).get().n;
      const { cols, pkCols, jsonCols } = tableInfo(db, name);
      return {
        name,
        count,
        pkCols,
        jsonColumns: [...jsonCols],
        columns: cols.map((c) => ({ name: c.name, type: c.type, notnull: !!c.notnull, pk: c.pk > 0 })),
      };
    });
    return {
      tables,
      entityChildren: ENTITY_CHILDREN,
      entityLinks: ENTITY_LINKS,
      feedVocab: feedVocab(),
      chatVocab: chatVocab(),
      scanVocab: scanVocab(),
      safetyVocab: safetyVocab(),
      mapVocab: mapVocab(),
      dbPath: paths.master,
      schemaVersion: readSchemaVersion(paths),
      preview: preview ? { enabled: true } : { enabled: false },
    };
  }

  function statusPayload() {
    const s = describeState(paths);
    return {
      version: s.version,
      published: s.published,
      lastVersion: s.lastVersion,
      unpublished: s.unpublished,
      suggestion: s.suggestion,
      schemaVersion: s.schemaVersion,
      hash: s.hash,
    };
  }

  /** Where else is an id mentioned? Looks through JSON arrays/objects and id-like columns. */
  function usedBy(table, id) {
    const out = [];
    const needle = `%${JSON.stringify(String(id)).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    for (const name of listContentTables(db)) {
      const { cols, pkCols, jsonCols } = tableInfo(db, name);
      const rows = new Map();
      const add = (r, column) => {
        const key = pkKey(r, pkCols);
        const hit = rows.get(key) ?? { table: name, pk: key, columns: [] };
        hit.columns.push(column);
        rows.set(key, hit);
      };
      for (const c of cols) {
        if (!/TEXT|^$/i.test(c.type)) continue;
        if (jsonCols.has(c.name)) {
          for (const r of db.prepare(`SELECT * FROM ${ident(name)} WHERE ${ident(c.name)} LIKE ? ESCAPE '\\'`).all(needle)) add(r, c.name);
        } else if (/(^|_)id$|^related_|^prerequisites$/.test(c.name) && !c.pk) {
          for (const r of db.prepare(`SELECT * FROM ${ident(name)} WHERE ${ident(c.name)} = ?`).all(String(id))) add(r, c.name);
        }
      }
      for (const hit of rows.values()) {
        // A row mentioning its own id (or its parent's id as a foreign key) is not a usage.
        const own = name === table && decodePk(hit.pk).join("/") === String(id);
        const child = PARENT_OF[name]?.parent === table && decodePk(hit.pk)[0] === String(id);
        if (!own && !child) out.push(hit);
      }
    }
    return out;
  }

  function searchAll(q) {
    const results = [];
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    for (const name of listContentTables(db)) {
      const { cols, pkCols } = tableInfo(db, name);
      const textCols = cols.filter((c) => /TEXT|^$/i.test(c.type) && !["created_at", "updated_at"].includes(c.name)).map((c) => c.name);
      if (!textCols.length) continue;
      const where = textCols.map((c) => `${ident(c)} LIKE ? ESCAPE '\\'`).join(" OR ");
      const rows = db.prepare(`SELECT * FROM ${ident(name)} WHERE ${where} LIMIT 8`).all(...textCols.map(() => like));
      for (const r of rows) {
        const column = textCols.find((c) => String(r[c] ?? "").toLowerCase().includes(q.toLowerCase()));
        const text = String(r[column] ?? "");
        const at = Math.max(0, text.toLowerCase().indexOf(q.toLowerCase()) - 40);
        results.push({
          table: name,
          pk: pkKey(r, pkCols),
          row: Object.fromEntries(["id", "title", "term", "question", "myth_statement"].filter((k) => k in r).map((k) => [k, r[k]])),
          column,
          snippet: text.slice(at, at + 140),
        });
      }
    }
    return results;
  }

  /** A row (hydrated) from the master and from a release archive, for field-level diffs. */
  function changeDetail(table, pk, version) {
    const { pkCols, jsonCols } = tableInfo(db, table);
    const where = pkCols.map((c) => `${ident(c)} = ?`).join(" AND ");
    const get = (d) => {
      try {
        const info = tableInfo(d, table);
        const r = d.prepare(`SELECT * FROM ${ident(table)} WHERE ${where}`).get(...pk);
        return r ? hydrateRow(r, info.jsonCols) : null;
      } catch {
        return null;
      }
    };
    return { before: version ? withReleaseDb(paths, version, get) : null, after: get(db), jsonCols: [...jsonCols] };
  }

  // -------------------------------------------------------------------------
  // routes
  // -------------------------------------------------------------------------

  async function route(req, res, url, auth) {
    const { pathname, searchParams } = url;
    const method = req.method;
    let m;

    if (method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    if (pathname === "/api/ping") return send(res, 200, { ok: true, db: paths.master });
    if (pathname === "/api/meta" && method === "GET") return send(res, 200, metaPayload());
    if (pathname === "/api/status" && method === "GET") return send(res, 200, statusPayload());

    // --- rows (raw; used by the table fallback and the OpenCode plugin) -------
    if ((m = pathname.match(/^\/api\/rows\/([a-z_][a-z0-9_]*)$/i))) {
      const { name, pkCols, cols, jsonCols } = tableInfo(db, m[1]);
      if (method === "GET") {
        const q = searchParams.get("q")?.trim();
        const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
        const offset = Number(searchParams.get("offset")) || 0;
        const order = pkCols.length ? pkCols.map(ident).join(", ") : ident(cols[0].name);
        if (q) {
          const likeCols = cols.filter((c) => /TEXT|^$/i.test(c.type)).map((c) => c.name);
          const where = likeCols.map((c) => `${ident(c)} LIKE ?`).join(" OR ");
          const params = likeCols.map(() => `%${q}%`);
          const rows = db.prepare(`SELECT * FROM ${name} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, offset);
          const total = db.prepare(`SELECT COUNT(*) AS n FROM ${name} WHERE ${where}`).get(...params).n;
          return send(res, 200, { rows, total });
        }
        const rows = db.prepare(`SELECT * FROM ${name} ORDER BY ${order} LIMIT ? OFFSET ?`).all(limit, offset);
        const total = db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n;
        return send(res, 200, { rows, total });
      }
      if (method === "POST") {
        const body = await readJson(req);
        const values = dehydrate(body, jsonCols);
        if (!Object.keys(values).length) throw new HttpError(400, "Empty row");
        const out = guardedWrite(() => store.insertRow({ table: name, values, source: auth.source }));
        return send(res, 201, out);
      }
    }
    if ((m = pathname.match(/^\/api\/rows\/([a-z_][a-z0-9_]*)\/(.+)$/i))) {
      const { name, jsonCols } = tableInfo(db, m[1]);
      const pk = decodePk(m[2]);
      if (method === "PUT") {
        const values = dehydrate(await readJson(req), jsonCols);
        if (!Object.keys(values).length) throw new HttpError(400, "No fields to update");
        return send(res, 200, guardedWrite(() => store.updateRow({ table: name, pk, values, source: auth.source })));
      }
      if (method === "DELETE") {
        const reason = searchParams.get("reason") ?? undefined;
        return send(res, 200, guardedWrite(() => store.deleteRow({ table: name, pk, source: auth.source, retireReason: reason })));
      }
    }

    // --- entities (a row plus its children, hydrated) -------------------------
    if ((m = pathname.match(/^\/api\/entities\/([a-z_][a-z0-9_]*)$/i)) && method === "POST") {
      const { name } = tableInfo(db, m[1]);
      const body = await readJson(req);
      const out = guardedWrite(() =>
        store.saveEntity({
          table: name,
          pk: null,
          row: dehydrateRowFor(name, body.row),
          children: body.children ? body.children.map((r) => dehydrateRowFor(ENTITY_CHILDREN[name].table, r)) : undefined,
          links: body.links ? body.links.map((r) => dehydrateRowFor(linkTableFor(name), r)) : undefined,
          source: auth.source,
        }),
      );
      return send(res, 201, { entity: hydrateEntity(name, out.entity), warnings: out.warnings });
    }
    if ((m = pathname.match(/^\/api\/entities\/([a-z_][a-z0-9_]*)\/([^/]+)$/i))) {
      const { name } = tableInfo(db, m[1]);
      const pk = decodePk(m[2]);
      if (method === "GET") {
        const entity = store.readEntity({ table: name, pk });
        if (!entity) throw new HttpError(404, `No such ${name} row`);
        return send(res, 200, { entity: hydrateEntity(name, entity) });
      }
      if (method === "PUT") {
        const body = await readJson(req);
        const out = guardedWrite(() =>
          store.saveEntity({
            table: name,
            pk,
            row: dehydrateRowFor(name, body.row),
            children: body.children ? body.children.map((r) => dehydrateRowFor(ENTITY_CHILDREN[name].table, r)) : undefined,
            links: body.links ? body.links.map((r) => dehydrateRowFor(linkTableFor(name), r)) : undefined,
            source: auth.source,
          }),
        );
        return send(res, 200, { entity: hydrateEntity(name, out.entity), warnings: out.warnings });
      }
      if (method === "DELETE") {
        const reason = searchParams.get("reason") ?? undefined;
        return send(res, 200, guardedWrite(() => store.deleteRow({ table: name, pk, source: auth.source, retireReason: reason })));
      }
    }
    if ((m = pathname.match(/^\/api\/entities\/([a-z_][a-z0-9_]*)\/([^/]+)\/history$/i)) && method === "GET") {
      const revisions = listRevisions(history, tableInfo(db, m[1]).name, m[2]).map(({ before, after, ...r }) => ({
        ...r,
        hasBefore: !!before,
        hasAfter: !!after,
      }));
      return send(res, 200, { revisions });
    }
    if ((m = pathname.match(/^\/api\/history\/(\d+)$/)) && method === "GET") {
      const rev = getRevision(history, Number(m[1]));
      if (!rev) throw new HttpError(404, "No such revision");
      const table = rev.entity_table;
      return send(res, 200, {
        revision: {
          ...rev,
          before: hydrateEntity(table, rev.before),
          after: hydrateEntity(table, rev.after),
        },
      });
    }
    if ((m = pathname.match(/^\/api\/history\/(\d+)\/restore$/)) && method === "POST") {
      const body = await readJson(req);
      const out = guardedWrite(() => store.restoreRevision({ id: Number(m[1]), side: body.side === "after" ? "after" : "before", source: auth.source }));
      return send(res, 200, { ok: true, entity: out.entity });
    }
    if (pathname === "/api/deleted" && method === "GET") {
      const items = listDeleted(history, db).map(({ before, after, ...r }) => ({
        id: r.id,
        ts: r.ts,
        table: r.entity_table,
        pk: r.entity_pk,
        source: r.source,
        childCounts: Object.fromEntries(Object.entries(before?.children ?? {}).map(([t, rows]) => [t, rows.length])),
        title: before?.row?.title ?? before?.row?.term ?? before?.row?.question ?? r.entity_pk,
      }));
      return send(res, 200, { items });
    }

    // --- understanding the content --------------------------------------------
    if (pathname === "/api/problems" && method === "GET") {
      const result = validateDatabase(db, { shipped: readShipped(paths), retired: readRetired(paths) });
      return send(res, 200, { checked: result.checked, errors: result.errors, warnings: result.warnings });
    }
    if (pathname === "/api/used-by" && method === "GET") {
      const table = tableInfo(db, searchParams.get("table") ?? "").name;
      return send(res, 200, { usages: usedBy(table, searchParams.get("id") ?? "") });
    }
    if (pathname === "/api/search" && method === "GET") {
      const q = (searchParams.get("q") ?? "").trim();
      return send(res, 200, { results: q.length >= 2 ? searchAll(q) : [] });
    }
    if (pathname === "/api/icons" && method === "GET") return send(res, 200, listIcons());
    if (pathname === "/api/distinct" && method === "GET") {
      const table = tableInfo(db, searchParams.get("table") ?? "").name;
      const column = ident(searchParams.get("column") ?? "");
      if (!tableInfo(db, table).cols.some((c) => c.name === column)) throw new HttpError(400, "Unknown column");
      const rows = db.prepare(`SELECT DISTINCT ${column} AS v FROM ${ident(table)} WHERE ${column} IS NOT NULL AND ${column} != '' ORDER BY ${column} LIMIT 200`).all();
      return send(res, 200, { values: rows.map((r) => r.v) });
    }
    if (pathname === "/api/pools/reorder" && method === "POST") {
      const body = await readJson(req);
      const table = tableInfo(db, String(body.table ?? "")).name;
      return send(
        res,
        200,
        guardedWrite(() =>
          store.reorderPool({
            table,
            scopeColumn: ident(String(body.scopeColumn ?? "")),
            scopeValue: body.scopeValue,
            ids: Array.isArray(body.ids) ? body.ids : [],
            source: auth.source,
          }),
        ),
      );
    }
    if (pathname === "/api/refs" && method === "GET") {
      // id + label pairs for reference pickers
      const table = tableInfo(db, searchParams.get("table") ?? "").name;
      const { cols } = tableInfo(db, table);
      // An NPC's `title` is its job ("Atom teacher"); the picker wants the name.
      const label = (table === "npcs" ? ["name"] : ["title", "term", "name"]).find((c) => cols.some((x) => x.name === c)) ?? "id";
      const rows = db.prepare(`SELECT id, ${ident(label)} AS label FROM ${ident(table)} ORDER BY id`).all();
      return send(res, 200, { items: rows });
    }
    if (pathname === "/api/changes" && method === "GET") {
      const s = describeState(paths);
      return send(res, 200, {
        published: s.published,
        lastVersion: s.lastVersion,
        total: s.unpublished,
        tables: s.diff?.tables ?? {},
        suggestion: s.suggestion,
      });
    }
    if (pathname === "/api/changes/detail" && method === "GET") {
      const s = describeState(paths, { withDiff: false });
      const table = tableInfo(db, searchParams.get("table") ?? "").name;
      return send(res, 200, changeDetail(table, decodePk(searchParams.get("pk") ?? ""), s.lastVersion));
    }

    // --- releases --------------------------------------------------------------
    if (pathname === "/api/releases" && method === "GET") {
      return send(res, 200, { releases: [...readLedger(paths).releases].reverse(), status: statusPayload() });
    }
    if ((m = pathname.match(/^\/api\/releases\/(\d+\.\d+\.\d+)\/changes$/)) && method === "GET") {
      const { releases } = readLedger(paths);
      const i = releases.findIndex((r) => r.version === m[1]);
      if (i < 0) throw new HttpError(404, "Unknown release");
      const diff = diffReleases(paths, releases[i - 1]?.version ?? null, m[1]);
      return send(res, 200, { from: releases[i - 1]?.version ?? null, to: m[1], tables: diff.tables, counts: diff.counts });
    }
    if (pathname === "/api/releases/publish" && method === "POST") {
      const body = await readJson(req);
      const args = ["--no-warnings", RELEASE_CLI, "--publish", "--json"];
      if (body.bump) args.push("--bump", String(body.bump));
      if (body.notes) args.push("--notes", String(body.notes));
      if (body.allowUnreviewed) args.push("--allow-unreviewed");
      res.writeHead(200, { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" });
      const child = spawn(process.execPath, args, { cwd: paths.root, env: { ...process.env, ATOMIQ_ROOT: paths.root, ATOMIQ_DB: paths.master } });
      let buffer = "";
      let finished = false; // a RESULT or ERROR line was forwarded
      const flush = (final = false) => {
        const lines = buffer.split("\n");
        buffer = final ? "" : lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith("LOG ")) res.write(`${JSON.stringify({ log: line.slice(4) })}\n`);
          else if (line.startsWith("RESULT ")) {
            finished = true;
            res.write(`${JSON.stringify({ done: true, ...JSON.parse(line.slice(7)) })}\n`);
          } else if (line.startsWith("ERROR ")) {
            finished = true;
            res.write(`${JSON.stringify({ error: true, ...JSON.parse(line.slice(6)) })}\n`);
          }
        }
      };
      child.stdout.on("data", (c) => {
        buffer += c;
        flush();
      });
      let stderr = "";
      child.stderr.on("data", (c) => (stderr += c));
      await new Promise((resolve) =>
        child.on("close", (code) => {
          flush(true);
          if (!finished) {
            res.write(`${JSON.stringify({ error: true, message: stderr.trim() || `publish exited with code ${code}` })}\n`);
          }
          resolve();
        }),
      );
      return res.end();
    }
    if (pathname === "/api/releases/record-update" && method === "POST") {
      const body = await readJson(req);
      if (!body.groupId) throw new HttpError(400, "groupId is required");
      return send(res, 200, { release: recordUpdate(paths, String(body.groupId), { version: body.version }) });
    }
    if ((m = pathname.match(/^\/api\/releases\/(\d+\.\d+\.\d+)\/restore$/)) && method === "POST") {
      const body = await readJson(req);
      db.close();
      try {
        const out = restoreRelease(paths, m[1], { force: !!body.force });
        return send(res, 200, { ok: true, preRestoreBackup: out.preRestoreBackup ? path.basename(out.preRestoreBackup) : null });
      } catch (err) {
        throw new HttpError(409, err.message);
      } finally {
        reopen();
      }
    }
    if (pathname === "/api/sync" && method === "POST") {
      const lines = [];
      const info = syncContent(paths, (l) => lines.push(l));
      return send(res, 200, { ...info, log: lines });
    }

    // --- backups ----------------------------------------------------------------
    if (pathname === "/api/backups" && method === "GET") {
      const backups = listBackups(paths).map(({ file, path: _p, ...b }) => ({ ...b, counts: describeBackup(file) }));
      return send(res, 200, { backups });
    }
    if (pathname === "/api/backups" && method === "POST") {
      const body = await readJson(req);
      const file = createBackup(paths, "manual", body.label);
      return send(res, 201, { backup: path.basename(file) });
    }
    if ((m = pathname.match(/^\/api\/backups\/([^/]+)\/summary$/)) && method === "GET") {
      const b = listBackups(paths).find((x) => x.name === decodeURIComponent(m[1]));
      if (!b) throw new HttpError(404, "No such backup");
      return send(res, 200, diffAgainstMaster(paths, b.file));
    }
    if ((m = pathname.match(/^\/api\/backups\/([^/]+)\/restore$/)) && method === "POST") {
      const b = listBackups(paths).find((x) => x.name === decodeURIComponent(m[1]));
      if (!b) throw new HttpError(404, "No such backup");
      const body = await readJson(req);
      db.close();
      try {
        const out = restoreMasterFrom(paths, b.file, { force: !!body.force });
        return send(res, 200, { ok: true, preRestoreBackup: out.preRestoreBackup ? path.basename(out.preRestoreBackup) : null });
      } catch (err) {
        throw new HttpError(409, err.message, { schemaMismatch: /Schema differs/.test(err.message) });
      } finally {
        reopen();
      }
    }

    // --- read-only SQL --------------------------------------------------------------
    if (pathname === "/api/query" && method === "POST") {
      const { sql } = await readJson(req);
      const trimmed = String(sql || "").trim().replace(/;+\s*$/, "");
      if (
        !/^(select|with|pragma)\b/i.test(trimmed) ||
        (/^pragma\b/i.test(trimmed) && trimmed.includes("=")) ||
        trimmed.includes(";")
      ) {
        throw new HttpError(403, "Only a single SELECT / WITH statement or a read-only PRAGMA is allowed here.");
      }
      // A separate read-only connection: nothing typed here can modify the database.
      const ro = new DatabaseSync(paths.master, { readOnly: true });
      try {
        return send(res, 200, { columns: null, rows: ro.prepare(trimmed).all() });
      } catch (err) {
        throw new HttpError(400, err.message);
      } finally {
        ro.close();
      }
    }

    throw new HttpError(404, `No route: ${method} ${pathname}`);
  }

  // -------------------------------------------------------------------------
  // developer preview (LAN, read-only, pairing code)
  // -------------------------------------------------------------------------

  function servePreview(req, res, url) {
    const now = Date.now();
    if (previewFailures.until > now) throw new HttpError(429, "Too many wrong codes; wait a minute.");
    const given = url.searchParams.get("code") ?? "";
    const ok = given.length === previewCode.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(previewCode));
    if (!ok) {
      if (++previewFailures.count >= 10) previewFailures = { count: 0, until: now + 60_000 };
      throw new HttpError(403, "Wrong pairing code.");
    }
    previewFailures.count = 0;

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atomiq-preview-"));
    try {
      const file = path.join(tmp, "content.db");
      const src = new DatabaseSync(paths.master);
      try {
        src.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
      } finally {
        src.close();
      }
      const state = describeState(paths, { withDiff: false });
      const out = new DatabaseSync(file);
      try {
        out.exec("PRAGMA journal_mode = DELETE");
        out.exec("CREATE TABLE content_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
        const ins = out.prepare("INSERT INTO content_meta (key, value) VALUES (?, ?)");
        ins.run("content_version", `preview-${state.hash.slice(0, 6)}`);
        ins.run("content_hash", state.hash);
        ins.run("schema_version", String(state.schemaVersion));
        ins.run("built_at", "preview");
      } finally {
        out.close();
      }
      const bytes = fs.readFileSync(file);
      res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": bytes.length, "Cache-Control": "no-store" });
      res.end(bytes);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  function previewInfo() {
    const addresses = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === "IPv4" && !i.internal)
      .map((i) => `http://${i.address}:${port}`);
    return { enabled: preview, code: previewCode, urls: addresses };
  }

  // -------------------------------------------------------------------------
  // server
  // -------------------------------------------------------------------------

  const server = http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, `http://localhost:${port}`);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    try {
      if (url.pathname.startsWith("/api/")) {
        const isPreviewRoute = preview && url.pathname === "/api/preview.db" && req.method === "GET";
        if (isPreviewRoute) return servePreview(req, res, url);
        const auth = authorize(req, url, { isPreviewRoute: false });
        if (url.pathname === "/api/preview/info" && req.method === "GET") return send(res, 200, previewInfo());
        return await route(req, res, url, auth);
      }
      authorize(req, url, { isPreviewRoute: false });

      // static files (GET only)
      if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Method not allowed");
      let file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(url.pathname)));
      if (!file.startsWith(PUBLIC_DIR)) throw new HttpError(403, "Forbidden");
      if (url.pathname === "/" || !path.extname(file)) file = path.join(PUBLIC_DIR, "index.html");
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end("Not found");
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(data);
      });
    } catch (err) {
      if (res.headersSent) return res.end();
      if (err instanceof HttpError) return send(res, err.status, { error: err.message, ...err.extra });
      if (/^Invalid identifier|^Unknown table/.test(err.message ?? "")) return send(res, 400, { error: err.message });
      console.error("[studio]", err);
      send(res, 500, { error: err.message });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 8787, requestedHost, resolve);
  });
  port = server.address().port;

  try {
    maybeAutoDailyBackup(paths);
  } catch (err) {
    console.warn(`[studio] auto backup failed: ${err.message}`);
  }

  return {
    server,
    port,
    paths,
    token,
    tokenFile,
    previewCode,
    previewInfo,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      server.closeAllConnections?.();
      try {
        db.close();
      } catch {
        /* already closed */
      }
      try {
        history.close();
      } catch {
        /* already closed */
      }
      clearStudioLock(paths);
    },
  };
}
