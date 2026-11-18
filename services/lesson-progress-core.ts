/**
 * Saving a lesson in progress, the framework-free part: what is saved, whether a run is worth
 * saving, how a saved run is checked before it is used again, and how much of the unit it adds to
 * the progress ring on the map. No storage and no React, so `scripts/test-lesson-progress.mjs`
 * runs it under Node. `services/lesson-runs.ts` adds the storage.
 *
 * Only lessons save. A practice session, a checkpoint, a test-out and the daily review are built
 * fresh each time (random items, a pass mark, a clock-free "one go"), so there is nothing to
 * resume: leaving one starts it again.
 */

import { progressOf, type LessonRun, type RunCard } from "./lesson-core.ts";
import type { RecordedAnswer } from "./curriculum-progress.ts";

export const SNAPSHOT_VERSION = 1;

/** The kinds of path node whose run is saved when the learner leaves. */
export function canSaveProgress(kind: "lesson" | "practice" | "checkpoint" | "testout" | "review"): boolean {
  return kind === "lesson";
}

/** Everything the run screen needs to carry on exactly where the learner stopped. */
export interface RunState {
  run: LessonRun;
  /** Scored answers so far, for mastery when the lesson is finished. */
  answers: RecordedAnswer[];
  /** What the learner guessed on prediction cards, shown again on the reveal. */
  guesses: Record<string, { text: string }>;
  /** The "let's correct the ones you missed" screen was already shown. */
  replayIntroDone: boolean;
  /** Time spent so far (ms), so the finish screen's duration counts the earlier sittings too. */
  elapsedMs: number;
}

export interface LessonSnapshot extends RunState {
  v: typeof SNAPSHOT_VERSION;
  nodeId: string;
  /** Which version of the lesson's cards this run was playing (`contentKeyOf`). */
  contentKey: string;
  savedAt: number;
}

/** A short key of a lesson's card ids: a saved run is only used when the cards are the same. */
export function contentKeyOf(cardIds: readonly string[]): string {
  let h = 5381;
  const joined = cardIds.join("|");
  for (let i = 0; i < joined.length; i++) h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;
  return `${cardIds.length}:${h.toString(36)}`;
}

/** True when there is something worth saving: past the first card, or already answering. */
export function isResumable(run: LessonRun): boolean {
  if (run.phase === "done") return false;
  return run.index > 0 || run.phase === "replay" || Object.keys(run.records).length > 0;
}

/** A saved run is never complete: it shows 95% at most, so the ring never looks finished early. */
const PARTIAL_CAP = 0.95;

/** How far through the lesson the run is, 0 to 0.95, for the ring on the map and the prompt. */
export function runProgress(run: LessonRun): number {
  return Math.min(PARTIAL_CAP, Math.max(0, progressOf(run)));
}

/** The unit ring: completed nodes plus the part of the current one that is done. Always 0 to 1. */
export function unitRingProgress(completedNodes: number, totalNodes: number, partial: number): number {
  if (!Number.isFinite(totalNodes) || totalNodes <= 0) return 0;
  const done = Math.max(0, Math.min(totalNodes, Number.isFinite(completedNodes) ? completedNodes : 0));
  const part = Number.isFinite(partial) ? Math.max(0, Math.min(1, partial)) : 0;
  return Math.min(1, (done + (done < totalNodes ? part : 0)) / totalNodes);
}

/* ---- reading a saved run back --------------------------------------------------------------- */

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function isRunCard(v: unknown): v is RunCard {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    (v.kind === "teach" || v.kind === "item" || v.kind === "sim") &&
    (v.tier === "core" || v.tier === "deeper") &&
    typeof v.scored === "boolean"
  );
}

const isCardList = (v: unknown): v is RunCard[] => Array.isArray(v) && v.every(isRunCard);

function isRun(v: unknown): v is LessonRun {
  if (!isObject(v)) return false;
  if (!isCardList(v.queue) || v.queue.length === 0) return false;
  if (typeof v.index !== "number" || !Number.isInteger(v.index) || v.index < 0 || v.index >= v.queue.length) return false;
  if (v.phase !== "playing" && v.phase !== "replay") return false;
  if (v.offer !== null && !isCardList(v.offer)) return false;
  if (!isObject(v.deeper) || !Object.values(v.deeper).every(isCardList)) return false;
  if (!isObject(v.byId) || !Object.values(v.byId).every(isRunCard)) return false;
  if (!Array.isArray(v.missed) || !v.missed.every((id) => typeof id === "string")) return false;
  if (!isObject(v.records)) return false;
  for (const r of Object.values(v.records)) {
    if (!isObject(r) || typeof r.tries !== "number" || typeof r.solved !== "boolean") return false;
    if (r.firstTryCorrect !== null && typeof r.firstTryCorrect !== "boolean") return false;
  }
  const known = v.byId as Record<string, unknown>;
  return v.queue.every((c) => c.id in known);
}

function isAnswer(v: unknown): v is RecordedAnswer {
  return isObject(v) && typeof v.itemId === "string" && typeof v.objectiveId === "string" && typeof v.surface === "string" && typeof v.correct === "boolean";
}

/**
 * A saved run read back from its stored text, or null when it cannot be trusted: not JSON, the
 * wrong shape, another node's, saved against other cards (the lesson was edited since), or
 * nothing to resume. A null here means "start the lesson from the beginning".
 */
export function parseSnapshot(raw: string | null | undefined, expected: { nodeId: string; contentKey: string }): LessonSnapshot | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(v) || v.v !== SNAPSHOT_VERSION) return null;
  if (v.nodeId !== expected.nodeId || v.contentKey !== expected.contentKey) return null;
  if (!isRun(v.run) || !isResumable(v.run)) return null;
  if (!Array.isArray(v.answers) || !v.answers.every(isAnswer)) return null;
  if (!isObject(v.guesses) || !Object.values(v.guesses).every((g) => isObject(g) && typeof g.text === "string")) return null;
  if (typeof v.replayIntroDone !== "boolean") return null;
  const elapsedMs = typeof v.elapsedMs === "number" && Number.isFinite(v.elapsedMs) ? Math.max(0, v.elapsedMs) : 0;
  return {
    v: SNAPSHOT_VERSION,
    nodeId: v.nodeId,
    contentKey: v.contentKey,
    run: v.run,
    answers: v.answers,
    guesses: v.guesses as Record<string, { text: string }>,
    replayIntroDone: v.replayIntroDone,
    elapsedMs,
    savedAt: typeof v.savedAt === "number" ? v.savedAt : 0,
  };
}

export function toSnapshot(nodeId: string, contentKey: string, state: RunState, now: number): LessonSnapshot {
  return { v: SNAPSHOT_VERSION, nodeId, contentKey, savedAt: now, ...state };
}
