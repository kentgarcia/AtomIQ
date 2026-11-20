/**
 * The timelines of AtomIQ's earned moments (tier C and D of `.claude/skills/duolingo-motion-style`),
 * as pure numbers (no React), unit-tested in `scripts/test-celebration.mjs`. The pieces they are
 * built from live elsewhere and are tested there: the stamp (`lesson/stamp-core.ts`), the pop
 * (`lesson/cards/option-pop-core.ts`), the burst and the reveal (`motion/burst-core.ts`,
 * `motion/reveal-core.ts`). This file only says WHEN each one starts, so a moment is a list of
 * beats and nothing in a component is a magic number.
 *
 * All times are ms on the moment's own clock, which starts when its show starts:
 *  - a dialog's show starts when the dialog has finished growing (`DIALOG_SETTLE_MS`), so nothing
 *    plays behind a moving card;
 *  - a screen's show starts when it appears;
 *  - the map's show starts `NODE_REVEAL.wait` after the map finds out (the scroll to the node has
 *    happened by then).
 * Each moment is over at its `total`; the thing the learner must act on is on screen long before.
 */

import { FINISH_STAMPS, STAMP_LANDS, STAMP_TOTAL } from "../lesson/stamp-core.ts";
import { BURST } from "../motion/burst-core.ts";
import { REVEAL } from "../motion/reveal-core.ts";
import { bell, clamp01, easeInOut, easeOut, loop, wave } from "../motion/motion-core.ts";

/** `GrowModal` opens in `DURATION.sheet - 50` ms (theme/motion.ts): the show waits for it. */
export const DIALOG_SETTLE_MS = 350;

/** The option pop's length and the moment its face touches down again (ms into the pop). */
export const POP_LENGTH = 567;
export const POP_CONTACT = 400;
/** The pop's hang (the face is at its highest), where a burst looks best. */
export const POP_HANG = 117;

/**
 * Level up (Profile dialog, tier D: one hero). The hero is a medal that carries the level number.
 * Rays open behind it while it drops like a stamp, a burst goes off as it lands, the number counts up
 * from the level before inside it, and the medal pops as the number lands (two sparkles). A crown is
 * pops as the number lands, then the line and the bar toward the next level arrive and the bar fills;
 * the button comes in with them. The rays never stop: once open they keep turning slowly and breathing
 * (`levelRaysLoop`, one seamless loop). Several levels gained at once (1 to 5) are ONE show: the number
 * counts from the level before the first to the last.
 *
 *     0 .. 400   medal drops (stamp), burst on its landing (`burst`)
 *     0 .. 700   rays open (ease-out) and turn a little, then rest
 *   200 .. 650   the number counts up (ease-out)
 *   650 .. 1217  the medal pops (option pop)
 *   800 .. 1020  the line and the bar arrive (reveal)
 *   900 .. 1400  the bar fills (ease-out)
 *
 * Frame 0 of the rays is nothing and their last frame is the open fan; the bar is empty before it
 * fills and ends at the learner's progress.
 */
export const LEVEL_UP = {
  medal: 0,
  burst: STAMP_LANDS,
  raysMs: 700,
  raysTurn: -24,
  /** The loop after they open: one seamless turn of the fan's symmetry (360 / RAYS degrees) every `loopMs`. */
  loopMs: 5000,
  loopStep: 30,
  countFrom: 200,
  countMs: 450,
  pop: 650,
  line: 800,
  bar: 900,
  barMs: 500,
  button: 900,
} as const;
/** Items the level-up shows it opened in the shop: the tiles arrive one after another from `unlocked` ms, `unlockedStep` apart. */
export const LEVEL_UNLOCKS = { max: 8, unlocked: 1000, unlockedStep: 90, settle: 260 } as const;

/** When the dialog's button arrives: with the line, or after the last tile of the unlocked items when there are some. */
export function levelUpButtonAt(shownTiles: number): number {
  if (shownTiles <= 0) return LEVEL_UP.button;
  const { unlocked, unlockedStep, settle } = LEVEL_UNLOCKS;
  return unlocked + (shownTiles - 1) * unlockedStep + settle;
}

export const LEVEL_UP_TOTAL = Math.max(
  LEVEL_UP.medal + STAMP_TOTAL,
  LEVEL_UP.burst + BURST.total,
  LEVEL_UP.pop + POP_LENGTH,
  LEVEL_UP.bar + LEVEL_UP.barMs,
);

/** The rays behind the level medal at `t` ms into the show: they grow from 0.6 and fade in, turning `raysTurn` degrees in all. */
export function levelRays(t: number): { scale: number; opacity: number; rotate: number } {
  'worklet';
  const p = easeOut(clamp01(t / LEVEL_UP.raysMs));
  return { scale: 0.6 + 0.4 * p, opacity: clamp01(t / 200), rotate: LEVEL_UP.raysTurn * p };
}

/**
 * The rays' loop, on its own clock (ms, repeating every `LEVEL_UP.loopMs`): the fan turns one slot (the
 * fan looks the same after `loopStep` degrees, so the repeat shows no jump) and breathes twice
 * (+-4%). Frame 0 and the last frame are the same picture.
 */
export function levelRaysLoop(t: number): { rotate: number; scale: number } {
  'worklet';
  return { rotate: LEVEL_UP.loopStep * loop(t, LEVEL_UP.loopMs), scale: 1 + 0.04 * wave(t, LEVEL_UP.loopMs / 2) };
}

/** How full the bar toward the next level is, 0 to 1 of the learner's progress, `t` ms after the bar starts (ease-out). */
export function levelBar(t: number): number {
  'worklet';
  return easeOut(clamp01(t / LEVEL_UP.barMs));
}

/**
 * Badge ranked up (Profile dialog), per badge: a ring fills round the old picture, the picture flips
 * to the new level on the first frame of its pop (no cross-fade), a burst goes off at the hang, the
 * text arrives with the ring (both play at the same time). Badges start one after another. Only the first few animate; the rest are plain.
 */
export const RANK_UP = {
  step: 450,
  ring: 0,
  ringMs: 550,
  flip: 550,
  pop: 550,
  burst: 550 + POP_HANG,
  text: 0,
  maxAnimated: 3,
} as const;

/**
 * The ring round a badge that is ranking up: it fills clockwise (ease-in-out) over `ringMs`, stays full
 * while the picture flips and pops, then fades. `t` is ms into the badge's own show.
 */
export function rankRing(t: number): { fill: number; opacity: number } {
  'worklet';
  const fill = easeInOut(clamp01((t - RANK_UP.ring) / RANK_UP.ringMs));
  const fade = clamp01((t - RANK_UP.flip) / 300);
  return { fill, opacity: t <= RANK_UP.ring ? 0 : 1 - fade };
}

/** How long one badge's own show lasts: the pop, the burst and the text, whichever is last. */
export const RANK_UP_BADGE_TOTAL = Math.max(RANK_UP.pop + POP_LENGTH, RANK_UP.burst + BURST.total, RANK_UP.text + REVEAL.ms);

/** When badge `i` (0-based) starts, ms into the show. Past the cap the start is clamped; a caller draws those badges plain. */
export function rankUpStart(i: number): number {
  return Math.min(i, RANK_UP.maxAnimated) * RANK_UP.step;
}
/** How long the whole show of `count` badges lasts. */
export function rankUpTotal(count: number): number {
  const last = Math.min(Math.max(0, count - 1), RANK_UP.maxAnimated - 1);
  return last * RANK_UP.step + RANK_UP_BADGE_TOTAL;
}

/**
 * The daily streak screen. The flame drops like a stamp and the number counts up to today's streak,
 * the headline is stamped, the sub line and the week card arrive, the days of the week one after
 * another, then today's tick pops (the one main action of the card) and Continue arrives last.
 * A milestone streak adds a burst round the flame as it lands.
 */
export const STREAK_FX = {
  flame: 0,
  count: STAMP_LANDS,
  countMs: 450,
  headline: 400,
  sub: 700,
  card: 600,
  days: 700,
  dayStep: 60,
  tick: 1100,
  button: 1300,
} as const;
export const STREAK_TOTAL = STREAK_FX.tick + POP_LENGTH;
/** When today's tick touches down: its haptic belongs here. */
export const STREAK_TICK_CONTACT = STREAK_FX.tick + POP_CONTACT;

/** Streak lengths that get the extra burst: a week, two, a month, fifty, then every hundred. */
export function isMilestoneStreak(days: number): boolean {
  return days === 7 || days === 14 || days === 30 || days === 50 || (days >= 100 && days % 100 === 0);
}

/**
 * The lesson map, when finishing a lesson moves "next up" on. The node just completed stamps its
 * check badge on; the node that is next pops (its face squashes, springs, hangs, lands, hops) and
 * two sparkles twinkle. The map's own scroll to the node happens before `wait` is over.
 */
export const NODE_REVEAL = {
  /** From the map learning of the change to the show starting. */
  wait: 500,
  check: 0,
  pop: 150,
  /** The pop's launch is where the sound belongs; its landing is where the haptic does. */
  sound: 150 + 100,
  haptic: 150 + POP_CONTACT,
  total: 150 + POP_LENGTH,
} as const;

/**
 * Achievement detail. The big badge is stamped in once (it is the page's hero); the blocks under it
 * settle one after another (`motion/settle-core.ts`). A burst only when the learner has just reached
 * this level (they have not yet seen the "ranked up" dialog on Profile for it).
 */
export const ACHIEVEMENT_FX = {
  badge: 150,
  burst: 150 + STAMP_LANDS,
} as const;

/**
 * Weekly ranking podium. The blocks rise from their base, third place first, then second, then first;
 * the head on top is carried up with its block and lands with a small squash as the rise ends; first
 * place gets one sparkle at that moment. The rows settle in under it while it rises.
 */
export const PODIUM = {
  step: 200,
  rise: 320,
  squashMs: 140,
  /** How much shorter the head gets at the bottom of its squash (fraction). */
  squash: 0.1,
  rowsStart: 500,
  /** The learner's own pop, once the podium is up. */
  learnerPop: 2 * 200 + 320 + 140,
} as const;
/** When the podium place `rank` (1 to 3) starts rising, ms into the show. */
export function podiumStart(rank: number): number {
  return (3 - Math.min(3, Math.max(1, rank))) * PODIUM.step;
}
/** When first place lands (its sparkle belongs here). */
export const PODIUM_FIRST_LANDS = podiumStart(1) + PODIUM.rise;
export const PODIUM_TOTAL = PODIUM_FIRST_LANDS + PODIUM.squashMs;

/** One podium place at `t` ms into its own rise: `rise` 0 to 1 (ease-out) and the head's `headScaleY` (1, a dip, 1). */
export function podiumFrame(t: number): { rise: number; headScaleY: number } {
  'worklet';
  const rise = easeOut(clamp01(t / PODIUM.rise));
  const dip = bell(clamp01((t - PODIUM.rise) / PODIUM.squashMs)) * PODIUM.squash;
  return { rise, headScaleY: 1 - dip };
}

/** Which way the learner's place moved since the last visit: 'up' (a better place), 'down', or null (same, or no visit before). */
export function rankMove(before: number | null, now: number): "up" | "down" | null {
  if (before === null || !Number.isFinite(before) || before === now) return null;
  return now < before ? "up" : "down";
}

/**
 * The end screen of a game (Myth Buster, Atom Maze): the title is stamped, its line under it arrives,
 * then the numbers one after another, each counting up, then the buttons. The buttons are never
 * blocked while they arrive. (A finished game then feels like a finished lesson, only quicker: the
 * finish screen's tiles are heroes, these are rows.)
 */
export const RESULT_FX = {
  title: FINISH_STAMPS.title,
  message: FINISH_STAMPS.message,
  statsStart: 700,
  statStep: 250,
  countMs: 500,
} as const;
/** When stat `n` (0-based) arrives. */
export const resultStatAt = (n: number): number => RESULT_FX.statsStart + n * RESULT_FX.statStep;
/** When the buttons arrive, for `count` stats. */
export const resultActionsAt = (count: number): number => resultStatAt(Math.max(0, count - 1)) + 200;

/**
 * Onboarding's last moment, after the learner has given a name: the mascot is stamped in with a burst
 * as it lands (the level-up crown's drop with a welcome line instead of a number), the welcome is
 * stamped, a line and the button follow. Once in the app's life.
 */
export const WELCOME_FX = {
  mascot: 0,
  burst: STAMP_LANDS,
  title: 300,
  line: 700,
  button: 900,
} as const;
export const WELCOME_TOTAL = Math.max(WELCOME_FX.mascot + STAMP_TOTAL, WELCOME_FX.burst + BURST.total, WELCOME_FX.button + REVEAL.ms);
