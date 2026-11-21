/**
 * The colour each unit wears on the lesson map: its teacher's own (their cover colour, `coverColors`), by the unit's 1-based position.
 * It starts from the bundled roster (a teacher's roster position is their unit's position), so the first frame already wears the right
 * colours, then loads the content facade once and takes what the database says. A unit with no teacher has no entry: the screen uses the
 * default sequence of palettes for it.
 */

import { useEffect, useState } from "react";

import { getAllNpcs } from "@/content/npcs";
import { contentRepository } from "@/services/content-db";

import { coverColors } from "./npc-cover-art";
import { NPC_ROSTER } from "./npc-roster";

export type Brand = { color: string; shade: string };

const FROM_ROSTER: ReadonlyMap<number, Brand> = new Map(NPC_ROSTER.map((n) => [n.position, coverColors(n.spec)]));
let cached: ReadonlyMap<number, Brand> | null = null;

async function load(): Promise<ReadonlyMap<number, Brand>> {
  const [npcs, units] = await Promise.all([getAllNpcs(), contentRepository.getUnits().catch(() => [])]);
  const byId = new Map(npcs.map((n) => [n.id, n]));
  const map = new Map<number, Brand>();
  for (const unit of units) {
    const npc = unit.teacherNpcId ? byId.get(unit.teacherNpcId) : undefined;
    if (npc) map.set(unit.position, coverColors(npc.spec));
  }
  return map;
}

export function useUnitBrands(): ReadonlyMap<number, Brand> {
  const [brands, setBrands] = useState<ReadonlyMap<number, Brand>>(cached ?? FROM_ROSTER);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    void load()
      .then((m) => {
        cached = m;
        if (alive) setBrands(m);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return brands;
}
