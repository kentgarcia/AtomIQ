/**
 * Brings every required picture inside the picture budget (scripts/lib/image-budget.mjs): resizes down to the long-edge limit, in place, keeping
 * the file name and format (WebP at quality 82, PNG as PNG). Prints what it would do; `--apply` does it. The originals are in git history.
 * Run: node scripts/shrink-images.mjs [--apply]
 */
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

import { decodedMb, rel, sizeOf, usedImages } from "./lib/image-usage.mjs";
import { EXCEPTIONS, MAX_EDGE, problemWith } from "./lib/image-budget.mjs";

const apply = process.argv.includes("--apply");
let saved = 0;
let n = 0;
for (const file of usedImages()) {
  const name = rel(file).split("\\").join("/");
  const before = sizeOf(file);
  if (EXCEPTIONS[name] || !problemWith(name, before)) continue; // a sprite sheet is repacked, not resized (scripts/thin-sprite-sheet.mjs)
  const args = [file, "-resize", `${MAX_EDGE}x${MAX_EDGE}>`, "-strip"];
  if (/\.webp$/i.test(file)) args.push("-quality", "82", "-define", "webp:method=6");
  args.push(file);
  const bytes = statSync(file).size;
  if (apply) execFileSync("magick", args);
  const after = apply ? sizeOf(file) : { w: Math.round(before.w * Math.min(1, MAX_EDGE / Math.max(before.w, before.h))), h: Math.round(before.h * Math.min(1, MAX_EDGE / Math.max(before.w, before.h))) };
  const afterBytes = apply ? statSync(file).size : bytes;
  saved += decodedMb(before) - decodedMb(after);
  n += 1;
  console.log(`${apply ? "shrunk" : "would shrink"} ${name}: ${before.w}x${before.h} (${decodedMb(before).toFixed(1)} MB) -> ${after.w}x${after.h} (${decodedMb(after).toFixed(1)} MB)${apply ? `, file ${(bytes / 1024).toFixed(0)} -> ${(afterBytes / 1024).toFixed(0)} KB` : ""}`);
}
console.log(`${n} picture(s), ${saved.toFixed(0)} MB less to decode${apply ? "" : " (run with --apply)"}`);
