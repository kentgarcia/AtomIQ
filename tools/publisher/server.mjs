#!/usr/bin/env node
// AtomIQ Publisher: shows hardcoded slides (public/slides.js) and saves them as PNG.
//
// Usage:  npm run publisher   (or: node tools/publisher/server.mjs)
// Env:    PORT     override port (default 8788)
//         NO_OPEN  1 to skip opening the browser
//
// No dependencies and no build step. Serves ./public, plus read-only files from the
// app's own assets/ folder under /app-assets/ (the mascot, the icon and the font), so
// cards use the same art as the app.

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(here, "public");
const assetsDir = join(here, "..", "..", "assets");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};

/** Resolve a url path inside `root`, or null when it would leave it. */
function resolveIn(root, urlPath) {
  const full = normalize(join(root, decodeURIComponent(urlPath)));
  return full === root || full.startsWith(root + sep) ? full : null;
}

// Live reload: the page listens on /__reload (server-sent events) and refreshes when a file in public/ changes.
const listeners = new Set();
let timer;
watch(publicDir, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => listeners.forEach((res) => res.write("data: reload\n\n")), 80);
});
const RELOAD_JS = `
if (!location.search.includes("noreload=1")) {
  let lost = false;
  const es = new EventSource("/__reload");
  es.onmessage = () => location.reload();
  es.onerror = () => { lost = true; };
  es.onopen = () => { if (lost) location.reload(); };
}
`;

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  if (pathname === "/__reload") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    res.write(": ok\n\n");
    listeners.add(res);
    req.on("close", () => listeners.delete(res));
    return;
  }
  if (pathname === "/__reload.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
    res.end(RELOAD_JS);
    return;
  }
  const fromAssets = pathname.startsWith("/app-assets/");
  const file = fromAssets
    ? resolveIn(assetsDir, pathname.slice("/app-assets/".length))
    : resolveIn(publicDir, pathname === "/" ? "/index.html" : pathname);
  try {
    if (!file) throw new Error("outside");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
});

const port = Number(process.env.PORT || 8788);
server.listen(port, "127.0.0.1", () => {
  const url = `http://localhost:${port}`;
  console.log(`\n  AtomIQ Publisher\n  ${url}\n`);
  if (process.env.NO_OPEN !== "1") {
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    spawn(opener, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref();
  }
});
