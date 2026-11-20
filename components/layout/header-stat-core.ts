/**
 * Framework-free rules for the header stat popovers (Lessons, XP, Diamonds): where the card sits
 * under the stat it belongs to, and what it says. `HeaderStat.tsx` draws it,
 * `scripts/test-header-stat.mjs` checks it.
 */

import { LEVEL_XP } from "../profile/passport-core.ts";

export const POPOVER = {
  /** Card width, dp (narrower on a small screen). */
  width: 260,
  /** Space kept to the screen's left and right edges. */
  edge: 16,
  /** Gap between the stat and the card's pointer tip. */
  gap: 8,
  /** The pointer's half width. */
  arrow: 8,
} as const;

export interface PopoverPlacement {
  /** Card left edge, window dp. */
  left: number;
  top: number;
  width: number;
  /** Pointer centre, relative to the card's left edge, kept inside the card's rounded corners. */
  arrowLeft: number;
}

/** Centre the card under the stat, then slide it inside the screen; the pointer keeps aiming at the stat. */
export function placePopover(
  anchor: { x: number; y: number; width: number; height: number },
  screenWidth: number,
): PopoverPlacement {
  const width = Math.max(0, Math.min(POPOVER.width, screenWidth - POPOVER.edge * 2));
  const centre = anchor.x + anchor.width / 2;
  const left = Math.min(Math.max(centre - width / 2, POPOVER.edge), screenWidth - POPOVER.edge - width);
  const inset = POPOVER.arrow + 12;
  const arrowLeft = Math.min(Math.max(centre - left, inset), Math.max(inset, width - inset));
  return { left, top: anchor.y + anchor.height + POPOVER.gap, width, arrowLeft };
}

export type HeaderStatKind = "lessons" | "xp" | "diamonds";

export interface HeaderStatInfo {
  title: string;
  /** The big number line. */
  value: string;
  /** One or two plain lines under it. */
  lines: string[];
  /** 0..1 progress bar under the lines (XP toward the next level), or null. */
  progress: number | null;
}

/** What each popover says. `xp` is the learner's total XP; `count` is lessons completed or diamonds. */
export function statInfo(kind: HeaderStatKind, amount: number): HeaderStatInfo {
  const n = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  if (kind === "lessons") {
    return {
      title: "Lessons completed",
      value: n.toLocaleString(),
      lines: [n === 0 ? "Finish a lesson on the map to start your count." : "Every lesson you finish on the map adds one."],
      progress: null,
    };
  }
  if (kind === "xp") {
    const level = Math.floor(n / LEVEL_XP) + 1;
    const into = n % LEVEL_XP;
    return {
      title: "Experience points",
      value: `${n.toLocaleString()} XP`,
      lines: [`Level ${level}`, `${LEVEL_XP - into} XP to level ${level + 1}`],
      progress: into / LEVEL_XP,
    };
  }
  return {
    title: "Diamonds",
    value: n.toLocaleString(),
    lines: ["Open quest chests to earn them, then spend them in the Shop on looks for your avatar."],
    progress: null,
  };
}
