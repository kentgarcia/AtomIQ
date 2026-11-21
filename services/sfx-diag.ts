/**
 * Why a cue was or was not heard (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §4.2).
 *
 * Framework-free and unit-tested (`npm run test:sfx`). A ring buffer of the last cue outcomes and one counter per
 * outcome, so "a sound did not play" can be told apart: by design (a gate, the scheduler) or a fault (a player that
 * never loaded, a native error). `playSfx` and both engines write one outcome at every exit. Cheap enough to stay on in
 * every build: an array push and a number increment per call.
 */

export type SfxOutcome =
  /** Started. */
  | "played"
  /** Started, but the engine had to load or decode first (`ms` says how long). Not a fault, but a cue that is always late belongs in its screen's set. */
  | "late"
  /** The media policy said no (Sound Effects off, route, screen reader, Read Aloud, background). By design. */
  | "gate"
  /** The scheduler said no: the same cue came too soon. By design, unless the repeat was legitimate (then lower the cue's `gap`). */
  | "skip-gap"
  /** Too many starts at once for a quiet category. By design. */
  | "skip-burst"
  /** A decorative cue under a stinger. By design. */
  | "skip-duck"
  /** The file never loaded (timeout) and there was no retry left. A fault. */
  | "lost"
  /** The engine threw. A fault. */
  | "error"
  /** A player was removed from the pool to make room (not a play: counted so a sweep of the cap can be read). */
  | "evicted"
  /** The first try never loaded and a fresh player was made for one more. */
  | "retried";

/** Outcomes that mean "the learner should have heard it and did not". */
export const FAULT_OUTCOMES: readonly SfxOutcome[] = ["lost", "error"];

export interface DiagEntry {
  cue: string;
  /** `Date.now()` of the call. */
  at: number;
  outcome: SfxOutcome;
  /** Why, for gates and errors; the file for an eviction. */
  detail?: string;
  /** For `late`: how long the load took. */
  ms?: number;
}

export type DiagCounts = Record<SfxOutcome, number>;

const emptyCounts = (): DiagCounts => ({
  played: 0,
  late: 0,
  gate: 0,
  "skip-gap": 0,
  "skip-burst": 0,
  "skip-duck": 0,
  lost: 0,
  error: 0,
  evicted: 0,
  retried: 0,
});

export interface SfxDiag {
  record: (cue: string, outcome: SfxOutcome, extra?: { detail?: string; ms?: number }) => void;
  /** Oldest first. */
  entries: () => readonly DiagEntry[];
  counts: () => Readonly<DiagCounts>;
  /** Cues recorded with `cue`, by outcome: the per-cue table of the scripted run. */
  perCue: () => ReadonlyMap<string, Readonly<DiagCounts>>;
  /** The faults so far (`lost` + `error`). */
  faults: () => number;
  reset: () => void;
}

export const createSfxDiag = (capacity = 200): SfxDiag => {
  let ring: DiagEntry[] = [];
  let totals = emptyCounts();
  let byCue = new Map<string, DiagCounts>();

  const record: SfxDiag["record"] = (cue, outcome, extra) => {
    const entry: DiagEntry = { cue, at: Date.now(), outcome, ...extra };
    ring.push(entry);
    if (ring.length > capacity) ring.splice(0, ring.length - capacity);
    totals[outcome] += 1;
    let row = byCue.get(cue);
    if (!row) {
      row = emptyCounts();
      byCue.set(cue, row);
    }
    row[outcome] += 1;
  };

  return {
    record,
    entries: () => ring,
    counts: () => totals,
    perCue: () => byCue,
    faults: () => FAULT_OUTCOMES.reduce((sum, o) => sum + totals[o], 0),
    reset: () => {
      ring = [];
      totals = emptyCounts();
      byCue = new Map();
    },
  };
};

/** The one log the app writes to. */
export const sfxDiag: SfxDiag = createSfxDiag();
