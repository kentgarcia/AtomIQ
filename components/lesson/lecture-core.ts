/**
 * The lecture flow, as pure maths (no React), unit-tested in `scripts/test-lecture.mjs`.
 *
 * A lecture is told as one growing page. Each teaching card is a few STEPS shown one after another,
 * the teacher's speech bubbles and the card's figure, in the order that lands best (the card's
 * `figureAt` says how many bubbles come before the figure). The learner taps Continue to reveal the
 * next step; when a card has no more steps the next teaching card is added below it, on the same
 * page, and so on. An activity marked `connected` that comes straight after a lecture joins the same
 * page. When the page is done, the run carries on with its normal pages.
 */

import { bubblesFor } from "./conversation-core.ts";

export type LectureStep = { kind: "bubble"; text: string } | { kind: "figure" };

/** Most bubbles one card is told in. */
export const MAX_BUBBLES = 3;

/**
 * The steps of a teaching card. With a figure, it comes after `figureAt` bubbles (0 = first, and
 * `bubbles` = last). Left out, it comes after the first bubble: the teacher says what it is, then
 * the learner sees it. Out-of-range values are clamped.
 */
export function lectureSteps(body: string, hasFigure: boolean, figureAt?: number): LectureStep[] {
  const steps: LectureStep[] = bubblesFor(body, MAX_BUBBLES).map((text) => ({ kind: "bubble", text }));
  if (!hasFigure) return steps;
  const bubbles = steps.length;
  const at = typeof figureAt === "number" && Number.isFinite(figureAt) ? Math.round(figureAt) : 1;
  steps.splice(Math.min(bubbles, Math.max(0, at)), 0, { kind: "figure" });
  return steps;
}

/**
 * How long Continue stays hidden after a step appears, ms. A bubble is typing for that long (the
 * button comes even if typing is not done yet, and Continue then finishes it at once); a figure is
 * given a moment to be seen.
 */
export const CONTINUE_DELAY = { bubble: 1200, figure: 700 } as const;

export function continueDelay(step: LectureStep | undefined): number {
  if (!step) return 0;
  return step.kind === "bubble" ? CONTINUE_DELAY.bubble : CONTINUE_DELAY.figure;
}

/** What the page needs to know about each card of the run, in queue order. */
export interface FlowCard {
  id: string;
  kind: "teach" | "item" | "sim";
  /** An activity authored to belong to the lecture before it. */
  connected?: boolean;
}

/**
 * Where the page that holds `queue[index]` starts. A teaching card shares its page with the teaching
 * cards just before it; a connected activity joins the lecture just before it (and its page).
 * Nothing before `floor` is on the page (a break such as the "go deeper" offer), and the mistakes
 * replay never joins pages.
 */
export function pageStart(queue: readonly FlowCard[], index: number, floor = 0, replay = false): number {
  const card = queue[index];
  if (!card || replay) return index;
  let from: number;
  if (card.kind === "teach") from = index;
  else if (card.kind === "item" && card.connected && index - 1 >= floor && queue[index - 1]?.kind === "teach") from = index - 1;
  else return index;
  while (from - 1 >= floor && queue[from - 1]?.kind === "teach") from--;
  return from;
}
