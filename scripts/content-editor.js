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

function serve(req, res) {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);

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
  console.log(`  Serving repo root: ${ROOT}\n`);
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
