/**
 * SOURCE_OWNED: the adapters whose tables are OWNED by files (spec section 9). A table is owned from the phase that
 * migrates it. Three things read this: `content:edit` refuses writes to an owned table, `content:sync` knows what to
 * build, and the publish gate checks that files and DB agree.
 *
 * Add an adapter's name here in the same change that exports its files and retires its seeds, never before.
 */
import { FRIENDLY_ADAPTERS } from "./registry.mjs";

/** Names of the owned adapters, in the order they sync. */
// Parents before children: a table another adapter points at (references, encyclopedia) comes first, because a sync
// inserts in this order and deletes in the reverse (see `orderOps` in sync.mjs).
export const OWNED_ADAPTERS = ["references", "encyclopedia", "characters", "chat", "feed", "blog", "myths", "mythbuster", "statements", "scanner", "safety", "map"];

export function ownedAdapters() {
  return OWNED_ADAPTERS.map((n) => {
    const a = FRIENDLY_ADAPTERS.get(n);
    if (!a) throw new Error(`SOURCE_OWNED lists adapter "${n}" which does not exist`);
    return a;
  });
}

/** table -> { adapter, dir } for every owned table. */
export function ownedTables() {
  const out = new Map();
  for (const a of ownedAdapters()) for (const t of a.tables) out.set(t, { adapter: a.name, dir: a.dir ?? a.name });
  return out;
}

/** @returns {{ table: string, adapter: string } | null} the first owned table among `tables`, if any. */
export function firstOwned(tables) {
  const owned = ownedTables();
  for (const t of tables) if (owned.has(t)) return { table: t, adapter: owned.get(t).adapter };
  return null;
}
