/**
 * Data hooks for the teachers. Each loads once from the content facade (which falls back to the
 * roster) and returns `null` while loading, so screens render without a teacher first and add one.
 */

import { useEffect, useState } from "react";

import { getNpcById, getNpcForUnit, getNpcLines, type Npc, type NpcLine, type NpcLineKind } from "@/content/npcs";

const unitCache = new Map<string, Npc | null>();

/** The teacher of a unit. */
export function useNpcForUnit(unitId: string | null | undefined): Npc | null {
  const [npc, setNpc] = useState<Npc | null>(unitId ? (unitCache.get(unitId) ?? null) : null);
  useEffect(() => {
    if (!unitId) return;
    let alive = true;
    void getNpcForUnit(unitId)
      .then((n) => {
        unitCache.set(unitId, n);
        if (alive) setNpc(n);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [unitId]);
  return unitId ? npc : null;
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
