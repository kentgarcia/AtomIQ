#!/usr/bin/env node
// AtomIQ Content Studio — lightweight webapp server.
//
// Zero dependencies: node:http for serving, node:sqlite for the database.
// The frontend talks to this REST API instead of loading sql.js/WASM, which
// keeps the webapp instant to load and gives OpenCode plugins the same HTTP
// surface for fact-checking / generating content.
//
// Usage:  npm run content-studio   (or: node tools/studio/server.mjs)
// Env:    PORT              override port (default 8787)
//         ATOMIQ_DB         override db path (default content/database/content.db)
//         NO_OPEN           1 to skip opening the browser
//
// The database file IS the source of truth: row writes go straight to it.
// Use POST /api/bump-version after content changes so the app picks them up.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 8787);
const DB_PATH = path.resolve(ROOT, process.env.ATOMIQ_DB || "content/database/content.db");
const VERSION_FILE = path.join(ROOT, "services", "content-db.ts");

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
};

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Identifier guard: only plain table/column names are accepted anywhere. */
function ident(s) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(String(s))) throw new Error(`Invalid identifier: ${s}`);
  return String(s);
}

function tableInfo(table) {
  const t = ident(table);
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  if (!cols.length) throw new Error(`Unknown table: ${t}`);
  const pkCols = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
  return { name: t, cols, pkCols };
}

function pkWhere(pkCols, pkValue) {
  const parts = String(pkValue).split("~");
  if (parts.length !== pkCols.length) throw new Error("Bad primary key");
  const where = pkCols.map((c, i) => `${ident(c)} = ?`).join(" AND ");
  return { where, params: parts.map(decodeURIComponent) };
}

function bumpVersion() {
  let src;
  try { src = fs.readFileSync(VERSION_FILE, "utf8"); } catch { return null; }
  const m = src.match(/export const CONTENT_DB_VERSION = (\d+);/);
  if (!m) return null;
  const next = Number(m[1]) + 1;
  fs.writeFileSync(VERSION_FILE, src.replace(m[0], `export const CONTENT_DB_VERSION = ${next};`));
  return next;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function route(req, res, url) {
  const { pathname, searchParams } = url;

  if (req.method === "OPTIONS") return json(res, 204, {});

  // --- meta ---------------------------------------------------------------
  if (pathname === "/api/ping") return json(res, 200, { ok: true, db: DB_PATH });

  if (pathname === "/api/meta" && req.method === "GET") {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((r) => r.name)
      .map((name) => {
        const count = db.prepare(`SELECT COUNT(*) AS n FROM ${ident(name)}`).get().n;
        const { cols, pkCols } = tableInfo(name);
        return {
          name,
          count,
          pkCols,
          columns: cols.map((c) => ({ name: c.name, type: c.type, notnull: !!c.notnull, pk: c.pk > 0 })),
        };
      });
    return json(res, 200, { tables, version: versionInFile(), dbPath: DB_PATH });
  }

  // --- rows ---------------------------------------------------------------
  let m = pathname.match(/^\/api\/rows\/([a-z_][a-z0-9_]*)$/i);
  if (m && req.method === "GET") {
    const { name, pkCols, cols } = tableInfo(m[1]);
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
    const offset = Number(searchParams.get("offset")) || 0;
    const order = pkCols.length ? pkCols.join(", ") : ident(cols[0].name);
    let rows;
    if (q) {
      const likeCols = cols.filter((c) => ["TEXT", ""].includes(c.type.toUpperCase())).map((c) => c.name);
      const where = likeCols.map((c) => `${ident(c)} LIKE ?`).join(" OR ");
      const params = likeCols.map(() => `%${q}%`);
      rows = db.prepare(
        `SELECT * FROM ${name} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      ).all(...params, limit, offset);
      const total = db.prepare(`SELECT COUNT(*) AS n FROM ${name} WHERE ${where}`).get(...params).n;
      return json(res, 200, { rows, total });
    }
    rows = db.prepare(`SELECT * FROM ${name} ORDER BY ${order} LIMIT ? OFFSET ?`).all(limit, offset);
    const total = db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n;
    return json(res, 200, { rows, total });
  }

  m = pathname.match(/^\/api\/rows\/([a-z_][a-z0-9_]*)\/(.+)$/i);
  if (m) {
    const { name, pkCols } = tableInfo(m[1]);
    const { where, params } = pkWhere(pkCols, m[2]);
    if (req.method === "PUT") {
      const body = JSON.parse(await readBody(req));
      const sets = Object.keys(body).map((c) => `${ident(c)} = ?`);
      if (!sets.length) return json(res, 400, { error: "No fields to update" });
      db.prepare(`UPDATE ${name} SET ${sets.join(", ")} WHERE ${where}`)
        .run(...Object.values(body), ...params);
      const row = db.prepare(`SELECT * FROM ${name} WHERE ${where}`).get(...params);
      return json(res, 200, { row });
    }
    if (req.method === "DELETE") {
      db.prepare(`DELETE FROM ${name} WHERE ${where}`).run(...params);
      return json(res, 200, { ok: true });
    }
  }

  if (req.method === "POST" && pathname.match(/^\/api\/rows\/[a-z_][a-z0-9_]*$/i)) {
    const { name } = tableInfo(pathname.split("/").pop());
    const body = JSON.parse(await readBody(req));
    const cols = Object.keys(body);
    if (!cols.length) return json(res, 400, { error: "Empty row" });
    const row = db.prepare(
      `INSERT INTO ${name} (${cols.map(ident).join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) RETURNING *`,
    ).get(...Object.values(body));
    return json(res, 201, { row });
  }

  // --- raw SQL (read-only) --------------------------------------------------
  if (pathname === "/api/query" && req.method === "POST") {
    const { sql } = JSON.parse(await readBody(req));
    const trimmed = String(sql || "").trim().replace(/;+\s*$/, "");
    if (!/^(select|with|pragma)\b/i.test(trimmed)) {
      return json(res, 403, { error: "Only SELECT / WITH / PRAGMA statements are allowed here." });
    }
    try {
      return json(res, 200, { columns: null, rows: db.prepare(trimmed).all() });
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  }

  // --- maintenance ----------------------------------------------------------
  if (pathname === "/api/bump-version" && req.method === "POST") {
    const next = bumpVersion();
    return next == null
      ? json(res, 404, { error: "CONTENT_DB_VERSION not found in services/content-db.ts" })
      : json(res, 200, { version: next });
  }

  if (pathname === "/api/backup" && req.method === "POST") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = `${DB_PATH}.bak-${stamp}`;
    fs.copyFileSync(DB_PATH, dest);
    return json(res, 200, { backup: path.relative(ROOT, dest) });
  }

  return json(res, 404, { error: `No route: ${req.method} ${pathname}` });
}

function versionInFile() {
  try {
    return Number(fs.readFileSync(VERSION_FILE, "utf8").match(/CONTENT_DB_VERSION = (\d+);/)?.[1]);
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith("/api/")) {
    try { await route(req, res, url); }
    catch (err) { json(res, err.message?.startsWith("Invalid identifier") ? 400 : 500, { error: err.message }); }
    return;
  }
  // static files
  let file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  if (url.pathname === "/" || !path.extname(file)) file = path.join(PUBLIC_DIR, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  AtomIQ Content Studio`);
  console.log(`  DB:     ${DB_PATH}`);
  console.log(`  Local:  http://localhost:${PORT}\n`);
  if (process.env.NO_OPEN !== "1") {
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
    try { spawn(opener, process.platform === "win32" ? ["/c", "start", `http://localhost:${PORT}`] : [`http://localhost:${PORT}`], { detached: true, stdio: "ignore" }).unref(); } catch {}
  }
});
