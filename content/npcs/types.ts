/** NPC teachers (docs/features/NPC_TEACHERS_SPEC.md). */

import type { NpcSpec, PoseId } from "../../components/npc/npc-art.ts";
import type { NpcLineKind } from "../../components/npc/npc-roster.ts";

export type { NpcLineKind, NpcSpec, PoseId };

export interface Npc {
  id: string;
  name: string;
  title: string;
  field: string;
  bio: string;
  spec: NpcSpec;
  position: number;
}

export interface NpcLine {
  id: string;
  npcId: string;
  kind: NpcLineKind;
  lessonId: string | null;
  journeyId: string | null;
  text: string;
  pose: PoseId;
}
