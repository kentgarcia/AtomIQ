/**
 * Answer checking for every item type — pure and framework-free.
 *
 * Used by the card components (to give feedback), by the lesson runner (to score)
 * and by validation tests. Responses and data refer to ids only, so shuffling or
 * translating labels cannot change a result.
 */

import type {
  ChoiceItemData,
  EstimateItemData,
  FillItemData,
  HotspotItemData,
  ItemResponse,
  ItemResult,
  MatchItemData,
  OrderItemData,
  PredictItemData,
  SortItemData,
  TrueOrMythItemData,
} from "./types";

type Rec = Record<string, unknown>;

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("\u0000") === [...b].sort().join("\u0000");

/** True when `value` is within the item's tolerance of `answer`. */
export function withinTolerance(
  value: number,
  answer: number,
  tolerance: number,
  scale: "linear" | "log" = "linear",
): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(answer)) return false;
  if (scale === "log") {
    if (value <= 0 || answer <= 0 || tolerance < 1) return false;
    const ratio = value > answer ? value / answer : answer / value;
    return ratio <= tolerance + 1e-9;
  }
  return Math.abs(value - answer) <= tolerance + 1e-9;
}

/**
 * Check a response against an item's data. A response of the wrong shape for the
 * item type is simply incorrect: it never throws.
 */
export function evaluateItem(type: string, data: Rec, response: ItemResponse): ItemResult {
  if (response.type !== type) return { correct: false };

  switch (response.type) {
    case "choice": {
      const d = data as unknown as ChoiceItemData;
      const correct = response.optionId === d.answer;
      if (correct) return { correct: true };
      const picked = d.options?.find((o) => o.id === response.optionId);
      return { correct: false, ...(picked?.note ? { note: picked.note } : {}) };
    }
    case "true_or_myth": {
      const d = data as unknown as TrueOrMythItemData;
      return { correct: response.answer === d.answer };
    }
    case "order": {
      const d = data as unknown as OrderItemData;
      const expected = d.items.map((i) => i.id);
      const got = response.orderedIds;
      if (!sameSet(expected, got)) return { correct: false, wrongIds: expected };
      const wrongIds = expected.filter((id, i) => got[i] !== id);
      return { correct: wrongIds.length === 0, ...(wrongIds.length ? { wrongIds } : {}) };
    }
    case "match": {
      const d = data as unknown as MatchItemData;
      const wrongIds = d.pairs.filter((p) => response.matches[p.id] !== p.id).map((p) => p.id);
      return { correct: wrongIds.length === 0, ...(wrongIds.length ? { wrongIds } : {}) };
    }
    case "sort": {
      const d = data as unknown as SortItemData;
      const wrongIds = d.items.filter((i) => response.placements[i.id] !== i.bucket).map((i) => i.id);
      return { correct: wrongIds.length === 0, ...(wrongIds.length ? { wrongIds } : {}) };
    }
    case "fill": {
      const d = data as unknown as FillItemData;
      if (d.mode === "number") {
        const value = typeof response.value === "number" ? response.value : Number(response.value);
        return { correct: withinTolerance(value, Number(d.answer), d.tolerance ?? 0) };
      }
      return { correct: String(response.value) === String(d.answer) };
    }
    case "estimate": {
      const d = data as unknown as EstimateItemData;
      return { correct: withinTolerance(response.value, d.answer, d.tolerance, d.scale ?? "linear") };
    }
    case "hotspot": {
      const d = data as unknown as HotspotItemData;
      return { correct: response.targetId === d.answer };
    }
    case "predict": {
      // Predictions are never scored; the result only records whether the guess matched.
      const d = data as unknown as PredictItemData;
      return { correct: String(response.value) === String(d.answer) };
    }
    default:
      return { correct: false };
  }
}

/** Deterministic shuffle (seeded) so a card shows the same order on re-render. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle that never returns the input order (needed for `order` items). */
export function shuffleNotSame<T>(items: readonly T[], seed: string): T[] {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 8; attempt++) {
    const out = seededShuffle(items, `${seed}:${attempt}`);
    if (out.some((v, i) => v !== items[i])) return out;
  }
  return [...items].reverse();
}
