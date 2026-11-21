/**
 * Disk side of the source tree (content/source): list, read and write `.atomiq` files. Everything is relative to
 * the source root with forward slashes, so a path means the same on every machine.
 */
import fs from "node:fs";
import path from "node:path";

export const SOURCE_EXT = ".atomiq";
const ALLOWED_OTHER = new Set(["README.md", ".state.json"]);

/** All files under `root`, as sorted relative paths. */
export function walk(root) {
  const out = [];
  const rec = (dir, rel) => {
    if (!fs.existsSync(dir)) return;
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) rec(path.join(dir, d.name), r);
      else out.push(r);
    }
  };
  rec(root, "");
  return out.sort();
}

/** @returns {Map<string, string>} the `.atomiq` files of `root` that `owns` says belong to an adapter. */
export function readSourceFiles(root, owns = () => true) {
  const files = new Map();
  for (const rel of walk(root)) {
    if (!rel.endsWith(SOURCE_EXT) || !owns(rel)) continue;
    files.set(rel, fs.readFileSync(path.join(root, rel), "utf8"));
  }
  return files;
}

/** Files under the source root that are neither `.atomiq` nor one of the allowed names (a warning, never an error). */
export function strayFiles(root) {
  return walk(root).filter((rel) => !rel.endsWith(SOURCE_EXT) && !ALLOWED_OTHER.has(rel));
}

/**
 * Write a set of files. `remove` lists existing files of this adapter that no longer exist (an export replaces the
 * whole adapter tree, so a story that was renamed does not leave its old file behind).
 */
export function writeSourceFiles(root, files, remove = []) {
  for (const rel of remove) {
    if (!files.has(rel)) fs.rmSync(path.join(root, rel), { force: true });
  }
  for (const [rel, text] of files) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, "utf8");
  }
  // remove folders left empty by the removals
  for (const rel of remove) {
    let dir = path.dirname(path.join(root, rel));
    while (dir.startsWith(root) && dir !== root && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
      dir = path.dirname(dir);
    }
  }
}
