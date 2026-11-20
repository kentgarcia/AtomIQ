/**
 * Locked things that still answer a press while the tour's dim is up (docs/features/TUTORIAL_SPEC.md §15). The dim swallows every tap
 * outside the lit control, so a press on a locked tab (or the locked profile avatar) would never reach it and the learner would never
 * see why it is locked. Each locked thing registers its rectangle and what it does; the layer asks `openLockedAt` before it nudges.
 * Framework-light on purpose: it only keeps functions, so the layer and the screens need not import each other.
 */

import type { Rect } from "@/components/tutorial/tutorial-fx-core";
import type { MeasurableView } from "@/components/tutorial/target-registry";

export interface LockHit {
  /** Where it is, in window coordinates (null when it is not on screen). */
  rect: () => Promise<Rect | null>;
  /** What a press does: the "Locked" dialog. */
  open: () => void;
  /** Whether it is locked right now. */
  active: () => boolean;
}

const hits = new Map<string, LockHit>();

export function registerLockHit(key: string, hit: LockHit): () => void {
  hits.set(key, hit);
  return () => {
    if (hits.get(key) === hit) hits.delete(key);
  };
}

/** A view's rectangle in the window, or null. */
export function measureViewRect(view: MeasurableView | null | undefined): Promise<Rect | null> {
  if (!view) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) resolve(null);
    }, 300);
    try {
      view.measureInWindow((x, y, w, h) => {
        settled = true;
        clearTimeout(timer);
        resolve(w > 0 && h > 0 && Number.isFinite(x) && Number.isFinite(y) ? { x, y, w, h } : null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** Whether `(x, y)` is inside `rect`. */
export const containsPoint = (rect: Rect, x: number, y: number): boolean => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

/** Open the dialog of the locked thing under a tap, if there is one. Resolves true when one opened. Never rejects. */
export async function openLockedAt(x: number, y: number): Promise<boolean> {
  const tried: string[] = [];
  const dev = typeof __DEV__ !== "undefined" && __DEV__;
  try {
    for (const [key, hit] of [...hits.entries()]) {
      if (!hit.active()) continue;
      const rect = await hit.rect();
      if (rect && containsPoint(rect, x, y)) {
        hit.open();
        return true;
      }
      tried.push(`${key}:${rect ? `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.w)}x${Math.round(rect.h)}` : "none"}`);
    }
  } catch {
    // A failed measure is just "nothing here".
  }
  // Development only: where the tap was and where every locked thing says it is, for "why did the dialog not open?"
  if (dev && tried.length > 0) console.log(`[tutorial] lock hit missed at ${Math.round(x)},${Math.round(y)}: ${tried.join(" ")}`);
  return false;
}
