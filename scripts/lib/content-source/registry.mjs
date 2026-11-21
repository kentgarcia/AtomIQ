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

/** Friendly adapters, by name. Filled in by the adapter modules below (phase 2 onward). */
export const FRIENDLY_ADAPTERS = new Map([chatAdapter, charactersAdapter, feedAdapter, blogAdapter].map((a) => [a.name, a]));

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
