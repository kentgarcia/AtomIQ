import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Lesson, Objective, PathNode, Reference, Unit } from "@/content/curriculum/types";
import { useAllLevels } from "@/hooks/use-storage";
import { contentRepository } from "@/services/content-db";
import { getLessonRunProgress } from "@/services/lesson-runs";
import { computePathState, countCompletedLessons, type PathState } from "@/services/path-core";

export interface CurriculumData {
  units: Unit[];
  nodes: PathNode[];
  lessons: Lesson[];
  objectives: Objective[];
  /** References per unit id, in display order. */
  unitReferences: Record<string, Reference[]>;
}

const EMPTY: CurriculumData = { units: [], nodes: [], lessons: [], objectives: [], unitReferences: {} };

/** The curriculum structure from the content database. Static for the life of the screen. */
export function useCurriculum(): { data: CurriculumData; loaded: boolean } {
  const [data, setData] = useState<CurriculumData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [units, nodes, lessons, objectives] = await Promise.all([
          contentRepository.getUnits(),
          contentRepository.getPathNodes(),
          contentRepository.getLessons(),
          contentRepository.getObjectives(),
        ]);
        const refs = await Promise.all(units.map((u) => contentRepository.getUnitReferences(u.id)));
        if (cancelled) return;
        setData({ units, nodes, lessons, objectives, unitReferences: Object.fromEntries(units.map((u, i) => [u.id, refs[i]])) });
      } catch (error) {
        console.error("Error loading curriculum:", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loaded };
}

interface LevelRow {
  id: string;
  unit_id?: string | null;
  type?: string | null;
  status?: string | null;
}

/**
 * Curriculum plus the learner's progress: which nodes are done, current or locked,
 * and which units are open. Refreshes when the screen regains focus.
 */
export function useCurriculumPath() {
  const { data, loaded } = useCurriculum();
  const { levels, loading, refresh: refreshLevels } = useAllLevels();
  // How far through each lesson left half way (0 to 0.95), by path node id, for the unit ring
  const [runProgress, setRunProgress] = useState<Record<string, number>>({});

  const refresh = useCallback(() => {
    refreshLevels();
    void getLessonRunProgress().then(setRunProgress);
  }, [refreshLevels]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const completedKey = useMemo(
    () =>
      (levels as LevelRow[])
        .filter((l) => l.status === "completed")
        .map((l) => `${l.type === "testout" ? "t" : "n"}:${l.id}:${l.unit_id ?? ""}`)
        .join("|"),
    [levels],
  );

  const state: PathState = useMemo(() => {
    const completed = new Set<string>();
    const testedOut = new Set<string>();
    for (const entry of completedKey ? completedKey.split("|") : []) {
      const [kind, id, unitId] = entry.split(":");
      if (kind === "t") testedOut.add(unitId || id.replace(/^testout:/, ""));
      else completed.add(id);
    }
    return computePathState(data.units, data.nodes, completed, testedOut);
  }, [completedKey, data.nodes, data.units]);

  const completedLessons = useMemo(() => countCompletedLessons(data.nodes, state), [data.nodes, state]);

  return { data, state, completedLessons, runProgress, loading: loading || !loaded, refresh };
}
