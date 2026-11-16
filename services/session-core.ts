/**
 * Picking items for practice nodes, checkpoints and the daily review.
 * Pure and framework-free. Deterministic for a given seed.
 */

import { seededShuffle } from "../content/curriculum/evaluate.ts";

export interface PickableItem {
  id: string;
  objectiveId: string;
  difficulty: number;
}

export interface PickOptions {
  /** How many items to return (fewer if the pools are smaller). */
  count: number;
  seed: string;
  /** Objectives that must each get at least one item when the pool has one (checkpoints). */
  coverObjectives?: string[];
  /** Items from earlier units, used for the `earlierShare` of the session. */
  earlierPool?: PickableItem[];
  /** Fraction (0-1) of `count` drawn from `earlierPool`. */
  earlierShare?: number;
}

/**
 * Selection order: one item per required objective, then the earlier-unit share, then
 * the rest of the pool taken round-robin by objective so no objective dominates.
 * The result runs easy to hard, shuffled within each difficulty.
 */
export function pickItems<T extends PickableItem>(pool: T[], opts: PickOptions & { earlierPool?: T[] }): T[] {
  const { count, seed } = opts;
  const chosen: T[] = [];
  const used = new Set<string>();
  const take = (item: T | undefined): boolean => {
    if (!item || used.has(item.id) || chosen.length >= count) return false;
    used.add(item.id);
    chosen.push(item);
    return true;
  };

  const shuffled = seededShuffle(pool, `${seed}:pool`);

  for (const objectiveId of opts.coverObjectives ?? []) {
    take(shuffled.find((i) => i.objectiveId === objectiveId && !used.has(i.id)));
  }

  const earlierWanted = Math.min(count - chosen.length, Math.round(count * (opts.earlierShare ?? 0)));
  if (earlierWanted > 0 && opts.earlierPool?.length) {
    const earlier = seededShuffle(opts.earlierPool, `${seed}:earlier`);
    for (const objectiveId of seededShuffle([...new Set(earlier.map((i) => i.objectiveId))], `${seed}:eo`)) {
      if (chosen.length >= count || chosen.filter((c) => opts.earlierPool?.some((e) => e.id === c.id)).length >= earlierWanted) break;
      take(earlier.find((i) => i.objectiveId === objectiveId && !used.has(i.id)));
    }
  }

  // Round-robin over objectives for the remainder.
  const byObjective = new Map<string, T[]>();
  for (const item of shuffled) {
    if (!used.has(item.id)) (byObjective.get(item.objectiveId) ?? byObjective.set(item.objectiveId, []).get(item.objectiveId))!.push(item);
  }
  const queues = [...byObjective.values()];
  while (chosen.length < count && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (chosen.length >= count) break;
      take(q.shift());
    }
  }

  // Easy to hard, stable within a difficulty (the shuffle above already mixed them).
  const order = new Map(chosen.map((c, i) => [c.id, i]));
  return [...chosen].sort((a, b) => a.difficulty - b.difficulty || (order.get(a.id) as number) - (order.get(b.id) as number));
}

/**
 * Items for the daily review: up to `perObjective` items for each due objective (most
 * urgent first), capped at `count` in total.
 */
export function pickReviewItems<T extends PickableItem>(
  dueObjectiveIds: string[],
  pool: T[],
  { count, perObjective = 2, seed }: { count: number; perObjective?: number; seed: string },
): T[] {
  const out: T[] = [];
  for (const objectiveId of dueObjectiveIds) {
    const items = seededShuffle(
      pool.filter((i) => i.objectiveId === objectiveId),
      `${seed}:${objectiveId}`,
    ).slice(0, perObjective);
    for (const item of items) {
      if (out.length < count) out.push(item);
    }
  }
  return out;
}
