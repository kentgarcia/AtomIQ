/**
 * The cast as a lookup, for the feed screens: every post, reaction and comment names an NPC by id.
 * Loaded once from the content facade (which falls back to the roster) and kept for the session,
 * so a card renders its head the moment it mounts.
 */

import { useEffect, useState } from "react";

import { getAllNpcs, type Npc } from "@/content/npcs";

let cached: ReadonlyMap<string, Npc> | null = null;
let pending: Promise<ReadonlyMap<string, Npc>> | null = null;

function loadCast(): Promise<ReadonlyMap<string, Npc>> {
  pending ??= getAllNpcs().then((all) => {
    cached = new Map(all.map((n) => [n.id, n]));
    return cached;
  });
  return pending;
}

const EMPTY: ReadonlyMap<string, Npc> = new Map();

/** All NPCs by id. Empty for the first frame on a cold start, then the whole cast. */
export function useCast(): ReadonlyMap<string, Npc> {
  const [cast, setCast] = useState<ReadonlyMap<string, Npc>>(cached ?? EMPTY);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    void loadCast()
      .then((c) => alive && setCast(c))
      .catch(() => {
        pending = null; // try again on the next mount
      });
    return () => {
      alive = false;
    };
  }, []);
  return cast;
}
