/**
 * NPC teachers: a thin facade over the content database, like the other content facades.
 * A bundled database from before the NPC tables has no rows; the roster in
 * `components/npc/npc-roster.ts` answers instead, so a teacher is never missing.
 */

import { NPC_LINES, NPC_ROSTER } from "@/components/npc/npc-roster";
import { contentRepository } from "@/services/content-db";

import type { Npc, NpcLine, NpcLineKind } from "./types";

const FALLBACK_NPCS: Npc[] = NPC_ROSTER.map(({ id, name, title, field, bio, spec, position }) => ({ id, name, title, field, bio, spec, position }));
const FALLBACK_LINES: NpcLine[] = NPC_LINES.map((l) => ({
  id: l.id,
  npcId: l.npcId,
  kind: l.kind,
  lessonId: l.lessonId ?? null,
  journeyId: l.journeyId ?? null,
  text: l.text,
  pose: l.pose as NpcLine["pose"],
}));

export async function getAllNpcs(): Promise<Npc[]> {
  try {
    const rows = await contentRepository.getNpcs();
    if (rows.length) return rows;
  } catch {
    // The bundled database predates the NPC tables.
  }
  return FALLBACK_NPCS;
}

export async function getNpcById(id: string): Promise<Npc | null> {
  return (await getAllNpcs()).find((n) => n.id === id) ?? null;
}

/** The teacher of a unit: from `units.teacher_npc_id`, falling back to the roster's owner of that unit. */
export async function getNpcForUnit(unitId: string): Promise<Npc | null> {
  let teacherId: string | undefined;
  try {
    teacherId = (await contentRepository.getUnitById(unitId))?.teacherNpcId;
  } catch {
    teacherId = undefined;
  }
  teacherId ??= NPC_ROSTER.find((n) => n.unitId === unitId)?.id;
  return teacherId ? getNpcById(teacherId) : null;
}

export async function getNpcLines(filter: { npcId?: string; kind?: NpcLineKind; lessonId?: string } = {}): Promise<NpcLine[]> {
  let lines = FALLBACK_LINES;
  try {
    const rows = await contentRepository.getNpcLines();
    if (rows.length) lines = rows;
  } catch {
    // Fall back to the roster's lines.
  }
  return lines.filter((l) => (!filter.npcId || l.npcId === filter.npcId) && (!filter.kind || l.kind === filter.kind) && (!filter.lessonId || l.lessonId === filter.lessonId));
}

export type { Npc, NpcLine, NpcLineKind };
