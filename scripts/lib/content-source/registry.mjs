/**
 * The adapters that exist. A friendly adapter is added here when its phase lands; the default adapter exists for
 * every table and is built from the schema of the database it is given.
 */
import { listContentTables } from "../content-tables.mjs";
import { makeDefaultAdapter } from "./adapters/default.mjs";
import { chatAdapter } from "./adapters/chat.mjs";
import { charactersAdapter } from "./adapters/characters.mjs";
import { feedAdapter } from "./adapters/feed.mjs";
import { blogAdapter } from "./adapters/blog.mjs";
import { referencesAdapter } from "./adapters/references.mjs";
import { encyclopediaAdapter } from "./adapters/encyclopedia.mjs";
import { mythsAdapter } from "./adapters/myths.mjs";
import { mythbusterAdapter } from "./adapters/mythbuster.mjs";
import { statementsAdapter } from "./adapters/statements.mjs";
import { scannerAdapter } from "./adapters/scanner.mjs";
import { safetyAdapter } from "./adapters/safety.mjs";
import { mapAdapter } from "./adapters/map.mjs";

/** Friendly adapters, by name. Filled in by the adapter modules below (phase 2 onward). */
export const FRIENDLY_ADAPTERS = new Map(
  [chatAdapter, charactersAdapter, feedAdapter, blogAdapter, referencesAdapter, encyclopediaAdapter, mythsAdapter, mythbusterAdapter, statementsAdapter, scannerAdapter, safetyAdapter, mapAdapter].map((a) => [a.name, a]),
);

export function adapterNames() {
  return ["default", ...FRIENDLY_ADAPTERS.keys()];
}

/** @param {import("node:sqlite").DatabaseSync} db */
export function getAdapter(name, db) {
  if (name === "default") return makeDefaultAdapter(db, listContentTables(db));
  const a = FRIENDLY_ADAPTERS.get(name);
  if (!a) throw new Error(`Unknown adapter "${name}". Known: ${adapterNames().join(", ")}`);
  return a;
}
