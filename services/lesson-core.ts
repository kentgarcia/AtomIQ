/**
 * Lesson run state machine — pure and framework-free (unit-tested with node --test).
 *
 * A run plays an ordered list of cards. Core cards play in order; "deeper" cards
 * attached to a core card are offered after it and only played if accepted.
 * Scored items answered wrongly come back in a mistakes replay at the end, until
 * each has been answered correctly. Predictions (unscored) never replay.
 *
 * The same machine runs lessons, practice nodes, checkpoints and the daily review:
 * only the card list differs. Screens hold a `LessonRun` in state and call these
 * functions; nothing here touches React, storage or the content database.
 */

export interface RunCard {
  id: string;
  kind: "teach" | "item" | "sim";
  tier: "core" | "deeper";
  /** Scored items count toward accuracy and replay when missed. */
  scored: boolean;
  /** Objective this card exercises (items and sims), for mastery. */
  objectiveId?: string;
}

export type RunPhase = "playing" | "replay" | "done";

export interface CardRecord {
  /** Number of submitted answers. */
  tries: number;
  /** True/false once answered at least once; null when never answered. */
  firstTryCorrect: boolean | null;
  /** True once answered correctly (possibly on replay). */
  solved: boolean;
}

export interface LessonRun {
  /** The cards still to play, in order. Grows when deeper cards are accepted or items replay. */
  queue: RunCard[];
  /** Index of the current card in `queue`. */
  index: number;
  phase: RunPhase;
  /** Deeper cards keyed by the core card they follow. */
  deeper: Record<string, RunCard[]>;
  /** Offer waiting after the current core card, if any. */
  offer: RunCard[] | null;
  records: Record<string, CardRecord>;
  /** Scored cards missed and not yet solved, in the order they were missed. */
  missed: string[];
  /** Cards (by id) the replay needs, to look the card up again. */
  byId: Record<string, RunCard>;
}

export interface RunSummary {
  scoredTotal: number;
  firstTryCorrect: number;
  /** Cards that needed the replay. */
  replayed: number;
  /** 0-1; 1 when there were no scored cards. */
  accuracy: number;
  perObjective: Record<string, { total: number; firstTryCorrect: number; solved: number }>;
  /** Deeper cards the learner played. */
  deeperPlayed: number;
}

export function createRun(cards: RunCard[]): LessonRun {
  const core: RunCard[] = [];
  const deeper: Record<string, RunCard[]> = {};
  const byId: Record<string, RunCard> = {};
  let lastCore: RunCard | null = null;
  for (const card of cards) {
    byId[card.id] = card;
    if (card.tier === "deeper" && lastCore) {
      (deeper[lastCore.id] ??= []).push(card);
    } else if (card.tier === "core") {
      core.push(card);
      lastCore = card;
    }
    // A deeper card before any core card has nothing to extend and is dropped.
  }
  return {
    queue: core,
    index: 0,
    phase: core.length ? "playing" : "done",
    deeper,
    offer: null,
    records: {},
    missed: [],
    byId,
  };
}

export function currentCard(run: LessonRun): RunCard | null {
  return run.phase === "done" ? null : (run.queue[run.index] ?? null);
}

const emptyRecord = (): CardRecord => ({ tries: 0, firstTryCorrect: null, solved: false });

/**
 * Record an answer for the current card. Unscored cards (predictions) are only
 * marked as seen. Ignored when `cardId` is not the current card, so a double tap
 * or a late animation callback cannot score twice.
 */
export function submitAnswer(run: LessonRun, cardId: string, correct: boolean): LessonRun {
  const card = currentCard(run);
  if (!card || card.id !== cardId) return run;

  const prev = run.records[cardId] ?? emptyRecord();
  const record: CardRecord = {
    tries: prev.tries + 1,
    firstTryCorrect: prev.firstTryCorrect ?? (card.scored ? correct : null),
    solved: prev.solved || correct || !card.scored,
  };
  const records = { ...run.records, [cardId]: record };

  let missed = run.missed;
  if (card.scored) {
    if (correct) missed = missed.filter((id) => id !== cardId);
    else if (!missed.includes(cardId)) missed = [...missed, cardId];
  }
  return { ...run, records, missed };
}

/**
 * Move past the current card. Core cards with deeper cards attached leave an offer
 * (`run.offer`); call `acceptDeeper` or `skipDeeper` to resolve it. At the end of
 * the queue the mistakes replay starts if anything is still missed, otherwise the
 * run is done.
 */
export function advance(run: LessonRun): LessonRun {
  if (run.phase === "done") return run;
  if (run.offer) return run; // resolve the offer first
  if (run.phase === "replay") return advanceInReplay(run);

  // A wrong answer never blocks: the card returns in the mistakes replay.
  const card = currentCard(run);
  if (card && card.tier === "core") {
    const extra = run.deeper[card.id];
    // Not offered again when the learner stepped back onto a card whose deeper cards were already accepted.
    const alreadyAccepted = extra?.length ? run.queue[run.index + 1]?.id === extra[0].id : false;
    if (extra?.length && !alreadyAccepted) return { ...run, offer: extra };
  }
  return moveOn(run);
}

/**
 * True when the learner can step back: from the deeper offer to the card before it, or to the
 * previous card while the first pass is playing. Not in the mistakes replay, which has its own
 * intro and would otherwise walk back into cards that are already solved.
 */
export function canGoBack(run: LessonRun): boolean {
  if (run.phase === "done") return false;
  if (run.offer) return true;
  return run.phase === "playing" && run.index > 0;
}

/**
 * Step back one card. The card is shown again; answering it again counts as another try (the first
 * try still decides accuracy) and a revisit is not recorded to mastery twice (see `isRevisit`).
 */
export function goBack(run: LessonRun): LessonRun {
  if (!canGoBack(run)) return run;
  if (run.offer) return { ...run, offer: null };
  return { ...run, index: run.index - 1 };
}

/** True when the current card was already answered in the first pass, so its answer must not be recorded again. */
export function isRevisit(run: LessonRun, cardId: string): boolean {
  return run.phase === "playing" && (run.records[cardId]?.tries ?? 0) > 0;
}

function moveOn(run: LessonRun): LessonRun {
  const next = run.index + 1;
  if (next < run.queue.length) return { ...run, index: next, offer: null };

  // End of the queue.
  const stillMissed = run.missed.filter((id) => !(run.records[id]?.solved ?? false));
  if (stillMissed.length === 0) return { ...run, index: next, phase: "done", offer: null };

  const replay = stillMissed.map((id) => run.byId[id]).filter(Boolean);
  return {
    ...run,
    queue: [...run.queue, ...replay],
    index: next,
    phase: "replay",
    offer: null,
    missed: stillMissed,
  };
}

/** Play the offered deeper cards next. */
export function acceptDeeper(run: LessonRun): LessonRun {
  if (!run.offer) return run;
  const inserted = run.offer;
  const queue = [...run.queue.slice(0, run.index + 1), ...inserted, ...run.queue.slice(run.index + 1)];
  return { ...run, queue, index: run.index + 1, offer: null };
}

/** Decline the offered deeper cards and carry on. */
export function skipDeeper(run: LessonRun): LessonRun {
  if (!run.offer) return run;
  return moveOn({ ...run, offer: null });
}

/**
 * Advance after a replayed card. A card still wrong in replay is queued again at the
 * end, so the replay only finishes when every missed card has been answered correctly.
 */
function advanceInReplay(run: LessonRun): LessonRun {
  const card = currentCard(run);
  if (!card) return run;
  const solved = run.records[card.id]?.solved ?? false;
  if (!solved) {
    return { ...run, queue: [...run.queue, card], index: run.index + 1 };
  }
  return moveOn(run);
}

/** Progress for the top bar: fraction of the planned core cards passed, 0-1. */
export function progressOf(run: LessonRun): number {
  if (run.phase === "done") return 1;
  const total = run.queue.length;
  return total ? Math.min(1, run.index / total) : 1;
}

export function summarize(run: LessonRun): RunSummary {
  const perObjective: RunSummary["perObjective"] = {};
  let scoredTotal = 0;
  let firstTryCorrect = 0;
  let replayed = 0;
  let deeperPlayed = 0;

  for (const [id, rec] of Object.entries(run.records)) {
    const card = run.byId[id];
    if (!card) continue;
    if (card.tier === "deeper") deeperPlayed++;
    if (!card.scored) continue;
    scoredTotal++;
    if (rec.firstTryCorrect) firstTryCorrect++;
    if (rec.firstTryCorrect === false) replayed++;
    if (card.objectiveId) {
      const o = (perObjective[card.objectiveId] ??= { total: 0, firstTryCorrect: 0, solved: 0 });
      o.total++;
      if (rec.firstTryCorrect) o.firstTryCorrect++;
      if (rec.solved) o.solved++;
    }
  }
  return {
    scoredTotal,
    firstTryCorrect,
    replayed,
    accuracy: scoredTotal ? firstTryCorrect / scoredTotal : 1,
    perObjective,
    deeperPlayed,
  };
}

/** Stars for the finish screen: 3 at 90%+ first-try accuracy, 2 at 70%+, otherwise 1. */
export function starsFor(summary: RunSummary): 1 | 2 | 3 {
  if (summary.accuracy >= 0.9) return 3;
  if (summary.accuracy >= 0.7) return 2;
  return 1;
}
