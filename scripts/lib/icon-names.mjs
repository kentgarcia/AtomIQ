/**
 * Installed Iconsax names and icon-name validation for content (spec §4.2 "Icon picker").
 *
 * Mirrors scripts/check-icons.mjs: the package cannot be `require`d under plain
 * Node, so the export list is read from the runtime entry Metro bundles. When the
 * dependency is not installed (e.g. a bare checkout) icon checks are skipped
 * instead of failing, and `iconSurface` is null.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { REPO_ROOT } from "./content-paths.mjs";

function loadSurface() {
  try {
    const require = createRequire(path.join(REPO_ROOT, "package.json"));
    const src = fs.readFileSync(require.resolve("iconsax-react-native"), "utf8");
    const names = new Set();
    for (const m of src.matchAll(/^exports\.([A-Za-z_$][\w$]*)\s*=/gm)) names.add(m[1]);
    return names.size >= 100 ? names : null;
  } catch {
    return null;
  }
}

async function loadRegistry() {
  try {
    return await import(pathToFileURL(path.join(REPO_ROOT, "components", "ui", "icon-registry.ts")).href);
  } catch {
    return null;
  }
}

export const iconSurface = loadSurface();
const registry = await loadRegistry();
const surfaceRecord = iconSurface ? Object.fromEntries([...iconSurface].map((n) => [n, true])) : null;

/** Sorted installed icon names plus the reviewed aliases (for the picker). */
export function listIcons() {
  return {
    names: iconSurface ? [...iconSurface].sort() : [],
    aliases: registry ? { ...registry.ICON_ALIASES } : {},
  };
}

/** True when `name` resolves to an installed icon. Unknown surface → everything passes. */
export function isKnownIcon(name) {
  if (!iconSurface || !registry) return true;
  return registry.resolveIconName(String(name ?? ""), surfaceRecord).valid;
}

/**
 * Every `icon` / `iconName` string inside JSON columns that does not resolve.
 * @returns {Array<{ table: string, id: string, field: string, name: string }>}
 */
export function findInvalidIcons(db, tables) {
  if (!iconSurface || !registry) return [];
  const out = [];
  for (const table of tables) {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    const cols = info.map((c) => c.name);
    const idCols = info.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
    const jsonCols = cols.filter((c) => !idCols.includes(c));
    for (const row of db.prepare(`SELECT * FROM ${table}`).all()) {
      const id = idCols.map((c) => row[c]).join("/");
      for (const col of jsonCols) {
        const raw = row[col];
        if (typeof raw !== "string" || !/^\s*[[{]/.test(raw)) continue;
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }
        const visit = (value, trail) => {
          if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${trail}[${i}]`));
          else if (value && typeof value === "object") {
            for (const [k, v] of Object.entries(value)) {
              if (/^(icon|iconName)$/i.test(k) && typeof v === "string") {
                if (!registry.resolveIconName(v, surfaceRecord).valid) out.push({ table, id, field: `${col}${trail}.${k}`, name: v });
              } else visit(v, `${trail}.${k}`);
            }
          }
        };
        visit(parsed, "");
      }
      for (const col of cols) {
        if (/^icon(_name)?$/i.test(col) && typeof row[col] === "string" && row[col]) {
          if (!registry.resolveIconName(row[col], surfaceRecord).valid) out.push({ table, id, field: col, name: row[col] });
        }
      }
    }
  }
  return out;
}
