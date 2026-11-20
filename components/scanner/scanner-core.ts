/**
 * The Atom Scanner's rules (docs/features/PHONE_SPEC.md §8) as pure functions, no React, tested in `scripts/test-scanner.mjs`.
 *
 * The learner drags a drawn scene under a fixed reticle. We keep one thing, the world point under the reticle
 * (`Pan`), clamped so the view never leaves the scene. When that point is inside a target's box (with a little
 * margin) the target is locked on; tapping Scan runs a timeline (a sweep, a ring filling, element chips flying out);
 * the result card is assembled from the target row and the periodic table; `scans` remembers what has been scanned.
 * Nothing here is a score: there is no timer and nothing fails.
 */

import {
  ELEMENTS,
  type ElementCategory,
} from "../../content/periodic-table/elements.ts";
import { clamp01, easeOut, lerp } from "../motion/motion-core.ts";

// ---------------------------------------------------------------------------
// the scene and the reticle
// ---------------------------------------------------------------------------

/** The scene's own units: every scene is this big, and a viewport shows `VIEW_UNITS_WIDE` of them across. */
export const WORLD = { w: 320, h: 200 } as const;
export const VIEW_UNITS_WIDE = 190;

/** Dp per world unit for a viewport this wide. */
export const scaleFor = (viewW: number): number => viewW / VIEW_UNITS_WIDE;

export interface Pan {
  /** The world point under the reticle. */
  x: number;
  y: number;
}

/** The reticle can reach this close to the scene's edge (world units), so a thing standing near the edge can be put under it. */
export const EDGE = 20;

/**
 * Keep the point under the reticle inside the scene. The view may then show past the scene's edge, so every scene's
 * backdrop is drawn `BLEED` units beyond it on every side.
 */
export function clampPan(p: Pan): Pan {
  "worklet";
  return {
    x: Math.min(WORLD.w - EDGE, Math.max(EDGE, p.x)),
    y: Math.min(WORLD.h - EDGE, Math.max(EDGE, p.y)),
  };
}

/** How far the backdrop runs past the scene on every side: the view reaches `EDGE` into the scene, so half the view minus `EDGE` is the most it can look past it. */
export const BLEED = 160;

/**
 * The most a viewfinder `viewW` wide can be tall before it would look past the drawn bleed: the view reaches `EDGE` into the scene
 * and the backdrop runs `BLEED` beyond it, so half the view is at most `EDGE + BLEED` units. The full-screen viewfinder is cut to this.
 */
export const maxViewHeight = (viewW: number): number =>
  2 * (EDGE + BLEED) * scaleFor(viewW);

/** The pan after the finger moved `dx`, `dy` dp from where it was when the drag began at `from`. The scene follows the finger, so the point under the reticle moves the other way. */
export function panAfterDrag(
  from: Pan,
  dx: number,
  dy: number,
  viewW: number,
): Pan {
  "worklet";
  const k = viewW / VIEW_UNITS_WIDE;
  return clampPan({ x: from.x - dx / k, y: from.y - dy / k });
}

export interface Place {
  id: string;
  /** The box the target is drawn in, in world units. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How far past a target's box the reticle still counts as on it (world units): forgiving for a finger. */
export const LOCK_MARGIN = 6;

/** The target the reticle is on (plain JS: the screen works it out as the drag moves): the boxes containing the point (with the margin), the nearest centre wins; null when none. */
export function lockOn(
  places: readonly Place[],
  p: Pan,
  margin: number = LOCK_MARGIN,
): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (let i = 0; i < places.length; i++) {
    const t = places[i];
    if (
      p.x < t.x - margin ||
      p.x > t.x + t.w + margin ||
      p.y < t.y - margin ||
      p.y > t.y + t.h + margin
    )
      continue;
    const d = Math.hypot(p.x - (t.x + t.w / 2), p.y - (t.y + t.h / 2));
    if (d < bestD) {
      bestD = d;
      best = t.id;
    }
  }
  return best;
}

/** Where a scene starts: the reticle on the first target (or the middle of the scene when there is none). */
export function startPan(places: readonly Place[]): Pan {
  const first = places[0];
  return clampPan(
    first
      ? { x: first.x + first.w / 2, y: first.y + first.h / 2 }
      : { x: WORLD.w / 2, y: WORLD.h / 2 },
  );
}

// ---------------------------------------------------------------------------
// the scan
// ---------------------------------------------------------------------------

/**
 * One scan, clock 0 to `SCAN.ms`: a line sweeps down the object and a ring fills as the clock runs; the chips fly out one
 * after another between `chipsFrom` and `chipsTo` of it. Dragging off the target before the end cancels it with nothing kept.
 * Reduced motion: `SCAN_REDUCED_MS`, a plain fill, with the chips simply present.
 */
export const SCAN = {
  ms: 1200,
  chipsFrom: 0.3,
  chipsTo: 0.9,
  chipMs: 360,
} as const;
export const SCAN_REDUCED_MS = 300;

export const scanMs = (reduced: boolean): number =>
  reduced ? SCAN_REDUCED_MS : SCAN.ms;

export interface ScanFrame {
  /** The ring, 0 to 1. */
  ring: number;
  /** The sweep line's place down the object, 0 (top) to 1 (bottom) and back up: a triangle wave, so it passes twice. */
  sweep: number;
  /** Whether the scan is complete. */
  done: boolean;
}

export function scanFrame(t: number, reduced: boolean): ScanFrame {
  "worklet";
  const total = reduced ? SCAN_REDUCED_MS : SCAN.ms;
  const ring = clamp01(t / total);
  const wave = (ring * 2) % 2;
  return {
    ring,
    sweep: reduced ? 0 : wave <= 1 ? easeOut(wave) : easeOut(2 - wave),
    done: ring >= 1,
  };
}

export interface ChipFrame {
  /** 0 until it leaves, 1 once it has landed in its place in the row. */
  fly: number;
  opacity: number;
}

/** Chip `i` of `n`: flies out of the object into its slot, one after another. */
export function chipFrame(
  i: number,
  n: number,
  t: number,
  reduced: boolean,
): ChipFrame {
  "worklet";
  if (reduced) return { fly: 1, opacity: 1 };
  const start = lerp(
    SCAN.chipsFrom * SCAN.ms,
    SCAN.chipsTo * SCAN.ms - SCAN.chipMs,
    n <= 1 ? 0 : i / (n - 1),
  );
  const p = clamp01((t - start) / SCAN.chipMs);
  return { fly: easeOut(p), opacity: clamp01(p * 3) };
}

// ---------------------------------------------------------------------------
// the result
// ---------------------------------------------------------------------------

export interface ScanTarget {
  id: string;
  name: string;
  scene: string;
  object: string;
  blurb: string;
  composition: { symbol: string; note?: string | null }[];
  funFact: string;
  atomdexEntryId: string | null;
  position: number;
  /** "Publisher, Title" of each source the target stands on. */
  sources?: string[];
}

export interface ResultChip {
  symbol: string;
  name: string;
  category: ElementCategory;
  /** "in caffeine", "as water"... may be empty. */
  note: string;
}

export interface ScanResult {
  id: string;
  name: string;
  blurb: string;
  chips: ResultChip[];
  funFact: string;
  /** The AtomDex entry the "See in AtomDex" button opens; null hides the button. */
  entryId: string | null;
  sources: string[];
}

const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]));

/** The result card for a target: its elements joined with the periodic table. An unknown symbol is left out rather than shown wrong. */
export function assembleResult(target: ScanTarget): ScanResult {
  const chips: ResultChip[] = [];
  for (const c of target.composition) {
    const e = BY_SYMBOL.get(c.symbol);
    if (e)
      chips.push({
        symbol: e.symbol,
        name: e.name,
        category: e.category,
        note: c.note?.trim() ?? "",
      });
  }
  return {
    id: target.id,
    name: target.name,
    blurb: target.blurb,
    chips,
    funFact: target.funFact,
    entryId: target.atomdexEntryId,
    sources: target.sources ?? [],
  };
}

/** "5 of 14 scanned". */
export const collectionText = (scanned: number, total: number): string =>
  `${Math.min(scanned, total)} of ${total} scanned`;

/** What a chip says to a screen reader. */
export const chipLabel = (c: ResultChip): string =>
  `${c.name}, ${c.symbol}${c.note ? `, ${c.note}` : ""}. Opens the periodic table entry.`;

// ---------------------------------------------------------------------------
// what has been scanned (the SQL over `scans`)
// ---------------------------------------------------------------------------

export interface ScansDb {
  runAsync(
    sql: string,
    params?: (string | number | null)[],
  ): Promise<{ changes: number }>;
  getAllAsync<T>(
    sql: string,
    params?: (string | number | null)[],
  ): Promise<T[]>;
}

export interface ScanRecord {
  targetId: string;
  firstAt: number;
  count: number;
}

export function createScanStore(getDb: () => Promise<ScansDb> | ScansDb) {
  /** Record a finished scan. `first` is true the first time this target is scanned ("New scan"). */
  async function record(
    targetId: string,
    now: number,
  ): Promise<{ first: boolean; count: number }> {
    const db = await getDb();
    const made = await db.runAsync(
      "INSERT OR IGNORE INTO scans (target_id, first_at, count, created_at, updated_at, is_dirty) VALUES (?,?,1,?,?,1)",
      [targetId, now, now, now],
    );
    if (made.changes > 0) return { first: true, count: 1 };
    await db.runAsync(
      "UPDATE scans SET count = count + 1, updated_at = ?, is_dirty = 1 WHERE target_id = ? AND deleted_at IS NULL",
      [now, targetId],
    );
    const rows = await db.getAllAsync<{ count: number }>(
      "SELECT count FROM scans WHERE target_id = ?",
      [targetId],
    );
    return { first: false, count: rows[0]?.count ?? 1 };
  }

  /** Everything scanned so far, oldest first. */
  async function list(): Promise<ScanRecord[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      target_id: string;
      first_at: number;
      count: number;
    }>(
      "SELECT target_id, first_at, count FROM scans WHERE deleted_at IS NULL ORDER BY first_at ASC, target_id ASC",
    );
    return rows.map((r) => ({
      targetId: r.target_id,
      firstAt: r.first_at,
      count: r.count,
    }));
  }

  return { record, list };
}
