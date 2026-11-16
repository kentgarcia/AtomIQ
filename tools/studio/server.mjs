#!/usr/bin/env node
// AtomIQ Content Studio — CLI entry.
//
// Usage:  npm run content-studio   (or: node tools/studio/server.mjs)
// Env:    PORT              override port (default 8787)
//         ATOMIQ_DB         override db path (default content/database/content.db)
//         NO_OPEN           1 to skip opening the browser
//         STUDIO_PREVIEW    1 to let a dev build on your network download the
//                           working database (read-only, needs the pairing code)
//         ATOMIQ_BACKUP_DIR also copy every backup to this folder
//
// The master database is the working draft. Edits are validated, recorded in
// history and saved straight to it; they only become a version when you press
// Publish (or run `npm run release:content`). See docs/CONTENT_SQLITE_AND_STUDIO_SPEC.md.

import { spawn } from "node:child_process";

import { createStudio } from "./app.mjs";

process.emitWarning = ((original) => (warning, ...rest) =>
  /SQLite/i.test(String(warning)) ? undefined : original.call(process, warning, ...rest))(process.emitWarning);

const studio = await createStudio({
  port: Number(process.env.PORT || 8787),
  preview: process.env.STUDIO_PREVIEW === "1",
});

const url = `http://localhost:${studio.port}`;
console.log(`\n  AtomIQ Content Studio`);
console.log(`  DB:     ${studio.paths.master}`);
console.log(`  Local:  ${url}  (this machine only)`);
if (studio.previewCode) {
  const { urls } = studio.previewInfo();
  console.log(`  Preview for dev builds: ${urls.join("  ") || "(no network address found)"}`);
  console.log(`  Pairing code: ${studio.previewCode}`);
}
console.log("");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await studio.close();
    process.exit(0);
  });
}

if (process.env.NO_OPEN !== "1") {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  try {
    spawn(opener, process.platform === "win32" ? ["/c", "start", url] : [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* no browser available */
  }
}
