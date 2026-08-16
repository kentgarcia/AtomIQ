#!/usr/bin/env node
// Serves the repo root over HTTP and opens the AtomIQ Content Editor.
// The editor (tools/content-sql.html) auto-detects content/lessons/content.db
// only when served over http:// (browsers block fetch on file:// sockets).
//
// Zero dependencies — a tiny static file server using only Node core.
//
// Usage:  npm run content-editor   (or: node scripts/content-editor.js)
// Env:    PORT     override the port (default 8000)
//         NO_OPEN  1  to skip opening the browser

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { networkInterfaces } = require("os");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8000);
const OPEN_URL = "/tools/content-sql.html";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".db": "application/octet-stream",
  ".sqlite": "application/octet-stream",
  ".sqlite3": "application/octet-stream",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

// POST /__editor/save-db — write the uploaded SQLite bytes over BOTH bundled
// copies of the content database and bump CONTENT_DB_VERSION in
// services/content-db.ts, so an editor export is immediately app-ready.
// GET /__editor/ping — lets the editor detect this endpoint is available
// (it only exists when the page is served via `npm run content-editor`).
const DB_PATHS = [
  path.join(ROOT, "content", "lessons", "content.db"),
  path.join(ROOT, "assets", "database", "content.db"),
];
const VERSION_FILE = path.join(ROOT, "services", "content-db.ts");
const SAVE_ROUTE = "/__editor/save-db";
const PING_ROUTE = "/__editor/ping";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function bumpContentDbVersion() {
  if (!fs.existsSync(VERSION_FILE)) return null;
  const src = fs.readFileSync(VERSION_FILE, "utf8");
  const match = src.match(/export const CONTENT_DB_VERSION = (\d+);/);
  if (!match) return null;
  const next = Number(match[1]) + 1;
  fs.writeFileSync(
    VERSION_FILE,
    src.replace(
      /export const CONTENT_DB_VERSION = (\d+);/,
      `export const CONTENT_DB_VERSION = ${next};`,
    ),
  );
  return next;
}

async function saveDb(req, res) {
  const reply = (code, payload) => {
    res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(payload));
  };
  try {
    const bytes = await readBody(req);
    // Sanity check: must start with the SQLite magic header.
    if (bytes.length < 100 || bytes.subarray(0, 16).toString("binary") !== "SQLite format 3\u0000") {
      reply(400, { ok: false, error: "Uploaded file is not a SQLite database" });
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const written = [];
    for (const p of DB_PATHS) {
      if (fs.existsSync(p)) fs.copyFileSync(p, p + ".bak-" + stamp);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, bytes);
      written.push(path.relative(ROOT, p));
    }
    const version = bumpContentDbVersion();
    console.log(`  [editor] saved ${bytes.length.toLocaleString()} bytes -> ${written.join(", ")} (v${version})`);
    reply(200, { ok: true, written, version, bytes: bytes.length });
  } catch (err) {
    reply(500, { ok: false, error: String((err && err.message) || err) });
  }
}

function serve(req, res) {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);

  if (url === PING_ROUTE && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, route: SAVE_ROUTE }));
    return;
  }
  if (url === SAVE_ROUTE && req.method === "POST") {
    saveDb(req, res);
    return;
  }

  // Default index only at root; otherwise serve the exact path.
  let rel = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  let file = path.normalize(path.join(ROOT, rel));

  // Prevent path traversal outside ROOT.
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found: /" + rel);
    return;
  }

  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(serve);
server.listen(PORT, "0.0.0.0", () => {
  const url = `http://localhost:${PORT}${OPEN_URL}`;
  console.log(`\n  AtomIQ Content Editor: ${url}`);
  console.log(`  Serving repo root: ${ROOT}`);
  console.log(`  Save-to-repo endpoint: POST ${SAVE_ROUTE}\n`);
  if (process.env.NO_OPEN !== "1") openBrowser(url);
});

function openBrowser(url) {
  // Best-effort: open the default browser (ignore failures silently).
  let cmd, args;
  if (process.platform === "darwin") { cmd = "open"; args = [url]; }
  else if (process.platform === "win32") { cmd = "cmd"; args = ["/c", "start", "", url]; }
  else { cmd = "xdg-open"; args = [url]; }

  const child = spawn(cmd, args, { stdio: "ignore", detached: true });
  child.on("error", () => { /* e.g. xdg-open missing on headless systems */ });
  child.unref();
}

process.on("SIGINT", () => { console.log("\nStopping server."); server.close(() => process.exit(0)); });
