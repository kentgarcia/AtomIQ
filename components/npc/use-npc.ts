/**
 * Data hooks for the teachers. Each loads once from the content facade (which falls back to the
 * roster) and returns `null` while loading, so screens render without a teacher first and add one.
 */

import { useEffect, useState } from "react";

import { getNpcById, getNpcForUnit, getNpcLines, type Npc, type NpcLine, type NpcLineKind } from "@/content/npcs";

const unitCache = new Map<string, Npc | null>();

/**
 * The teacher of a unit, and whether the answer is known yet. A screen that stands someone in front of
 * the learner (Shrodi stands in when a unit has no teacher) waits for `ready`, so he never shows for a
 * moment until the real teacher replaces him. `ready` is true at once when there is no unit to ask about.
 */
export function useNpcForUnitState(unitId: string | null | undefined): { npc: Npc | null; ready: boolean } {
  const [state, setState] = useState<{ unitId: string | null | undefined; npc: Npc | null; ready: boolean }>(() => ({
    unitId,
    npc: unitId ? (unitCache.get(unitId) ?? null) : null,
    ready: !unitId || unitCache.has(unitId),
  }));
  useEffect(() => {
    if (!unitId) return;
    let alive = true;
    void getNpcForUnit(unitId)
      .then((n) => {
        unitCache.set(unitId, n);
        if (alive) setState({ unitId, npc: n, ready: true });
      })
      .catch(() => {
        if (alive) setState({ unitId, npc: null, ready: true });
      });
    return () => {
      alive = false;
    };
  }, [unitId]);
  if (!unitId) return { npc: null, ready: true };
  // The unit changed since the state was written: the answer is not known for this one yet (unless cached)
  if (state.unitId !== unitId) return unitCache.has(unitId) ? { npc: unitCache.get(unitId) ?? null, ready: true } : { npc: null, ready: false };
  return { npc: state.npc, ready: state.ready };
}

/** The teacher of a unit. */
export function useNpcForUnit(unitId: string | null | undefined): Npc | null {
  return useNpcForUnitState(unitId).npc;
}

export function useNpc(id: string | null | undefined): Npc | null {
  const [npc, setNpc] = useState<Npc | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void getNpcById(id)
      .then((n) => alive && setNpc(n))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id]);
  return id ? npc : null;
}

/** The first line of a kind (for a lesson, that lesson's). */
export function useNpcLine(npcId: string | null | undefined, kind: NpcLineKind, lessonId?: string): NpcLine | null {
  const [line, setLine] = useState<NpcLine | null>(null);
  useEffect(() => {
    if (!npcId) return;
    let alive = true;
    void getNpcLines({ npcId, kind, lessonId })
      .then((l) => alive && setLine(l[0] ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [npcId, kind, lessonId]);
  return npcId ? line : null;
}
