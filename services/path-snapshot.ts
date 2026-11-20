/**
 * The learner's place on the path, read from the stores without a screen hook: the units, the nodes, and which
 * nodes are done, locked or current. The Home map reads the same `levels` table through `useCurriculumPath`; this is
 * for code that has no screen (the phone's unlocks, a teacher's "take me to my next lesson"). Rules are in
 * `services/path-core.ts`.
 */

import type { Unit, PathNode } from "@/content/curriculum/types";
import { contentRepository } from "@/services/content-db";
import { getAllLevels } from "@/services/database";
import { computePathState, type PathState } from "@/services/path-core";

interface LevelRow {
  id: string;
  unit_id?: string | null;
  type?: string | null;
  status?: string | null;
}

export interface PathSnapshot {
  units: Unit[];
  nodes: PathNode[];
  state: PathState;
}

/** Throws when the content or the user-state database cannot be read; callers decide what that means for them. */
export async function loadPathSnapshot(): Promise<PathSnapshot> {
  const [units, nodes, levels] = await Promise.all([contentRepository.getUnits(), contentRepository.getPathNodes(), getAllLevels() as Promise<LevelRow[]>]);
  // The same reading of the `levels` table as `useCurriculumPath`: a node by its id, a test-out by its unit
  const completed = new Set<string>();
  const testedOut = new Set<string>();
  for (const l of levels) {
    if (l.status !== "completed") continue;
    if (l.type === "testout") testedOut.add(l.unit_id || l.id.replace(/^testout:/, ""));
    else completed.add(l.id);
  }
  return { units, nodes, state: computePathState(units, nodes, completed, testedOut) };
}
