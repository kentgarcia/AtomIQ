/**
 * The places the tour can light (docs/features/TUTORIAL_SPEC.md §4.2): a screen declares a view as a target with
 * `useTutorialTarget`, and the overlay measures it while its beat is up. Framework-light: this file only
 * keeps the views, so the overlay and the screens need not import each other.
 */

import type { TargetId } from "@/services/tutorial-core";
import type { Rect } from "@/components/tutorial/tutorial-fx-core";

/** Anything with `measureInWindow`: a View ref. */
export interface MeasurableView {
  measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => void;
}

export interface TargetEntry {
  /** The view to measure. */
  get: () => MeasurableView | null;
  /** Bring the view on screen (a scroll view's `scrollTo`), when it can be off screen. */
  scrollIntoView?: () => void;
  /** Hole shape: a radius in dp, or "round". */
  radius?: number | "round";
}

const entries = new Map<TargetId, TargetEntry>();

export function registerTarget(id: TargetId, entry: TargetEntry): () => void {
  entries.set(id, entry);
  return () => {
    // Only the owner removes it (a newer registration under the same id stays)
    if (entries.get(id) === entry) entries.delete(id);
  };
}

export const getTarget = (id: TargetId): TargetEntry | undefined => entries.get(id);

/** Measure a target in window coordinates, or null when it is not there or has no size. */
export function measureTarget(id: TargetId): Promise<Rect | null> {
  const entry = entries.get(id);
  const view = entry?.get() ?? null;
  if (!view) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) resolve(null);
    }, 400);
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
