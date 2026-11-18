/**
 * Mini blog pieces, the framework-free part (docs/NPC_FEED_SPEC.md §4.3, §5.2): whether a piece is
 * unlocked and how long it takes to read. The validator uses `wordCount` and `readingMinutes` too.
 */

import type { BlogBlock, BlogUnlock } from "../content/types.ts";

/** Reading speed behind the "3 min" label. */
export const READING_WPM = 200; // the same as `BLOG_LIMITS.wordsPerMinute` in scripts/lib/feed-vocab.mjs

/** What the learner has done, as far as unlocks care. Unlocks are derived from this, never stored. */
export interface UnlockProgress {
  /** Ids of lessons (`lessons.id`) whose path node is completed. */
  completedLessonIds: ReadonlySet<string> | readonly string[];
  /** Ids of units that are complete (checkpoint passed or tested out). */
  completedUnitIds: ReadonlySet<string> | readonly string[];
  /** The best streak the learner has reached (a piece never locks again when a streak resets). */
  streak: number;
}

const has = (set: ReadonlySet<string> | readonly string[], id: string): boolean =>
  Array.isArray(set) ? set.includes(id) : (set as ReadonlySet<string>).has(id);

/** `none` is open from the start; the other kinds follow the learner's progress. An unknown kind stays locked. */
export function isUnlocked(blog: { unlock: BlogUnlock }, progress: UnlockProgress): boolean {
  const unlock = blog.unlock;
  switch (unlock?.trigger) {
    case "none":
      return true;
    case "lesson_complete":
      return has(progress.completedLessonIds, unlock.lessonId);
    case "unit_complete":
      return has(progress.completedUnitIds, unlock.unitId);
    case "streak":
      return Number.isFinite(progress.streak) && progress.streak >= unlock.days;
    default:
      return false;
  }
}

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/** Words in the body: `p`, `quote`, `fact` and `list` blocks count; headings, figures and the `next` teaser do not. */
export function wordCount(blocks: readonly BlogBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.t === "p" || b.t === "quote" || b.t === "fact") n += words(b.text);
    else if (b.t === "list") for (const item of b.items) n += words(item);
  }
  return n;
}

/** Whole minutes to read the body, at least 1. */
export const readingMinutes = (blocks: readonly BlogBlock[]): number => Math.max(1, Math.ceil(wordCount(blocks) / READING_WPM));

/** The text Read Aloud speaks: title first, then every text block in order (figures and the teaser button are left out). */
export function readAloudText(title: string, blocks: readonly BlogBlock[]): string {
  const parts: string[] = [title];
  for (const b of blocks) {
    if (b.t === "p" || b.t === "h" || b.t === "quote" || b.t === "fact") parts.push(b.text);
    else if (b.t === "list") parts.push(...b.items);
  }
  return parts.join("\n\n");
}
