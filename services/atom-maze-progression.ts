/**
 * Atom Maze question progression (docs/ATOMIQ_FEEDBACK_SUMMARY_SPEC.md §4.4).
 *
 * Pure, framework-free state machine. It deliberately has no React / Expo
 * imports so it can run under plain `node --test` (Node 22 type stripping):
 * only erasable TypeScript syntax is used here (no enums, no parameter
 * properties, no path aliases).
 *
 * Model
 * -----
 * - Every question has a stable *identity* (`id`, derived from the normalized
 *   question text) and an independent *status*:
 *     available -> active -> consumed   (answered correctly, transition committed)
 *                         -> retired    (answered wrong in a no-retry segment)
 * - Identity and status never depend on display order or on array indexes, so
 *   re-renders, re-shuffles and options re-ordering cannot change which
 *   question counts as "answered".
 * - A question is marked consumed ONLY by `commitCorrect`, which the screen
 *   calls after the correct-answer result delay (the transition commit). The
 *   commit is idempotent and keyed by the attempt token, so rapid taps, double
 *   animation-complete callbacks and re-renders can never re-submit or
 *   reselect a question.
 * - `serveNext` only ever draws from `available` entries, so a consumed or
 *   retired question cannot come back until the pool is exhausted
 *   (`status: "exhausted"`) and the learner explicitly starts a new run
 *   (`startNewRun`).
 *
 * All functions are immutable: they return a new state and never mutate the
 * input, which makes them safe to call from refs, reducers and tests.
 */

export type QuestionStatus = "available" | "active" | "consumed" | "retired";

export interface PoolItem {
  /** Stable identity (see `makeQuestionId`). */
  id: string;
  /** Optional segment, e.g. a maze room id or "boss". */
  group?: string;
  /** Optional difficulty tag, used by the endless ramp. */
  difficulty?: string;
}

export interface PoolEntry {
  id: string;
  group: string;
  difficulty: string;
  status: QuestionStatus;
}

export interface ActiveQuestion {
  id: string;
  /** `${runId}:${serveSeq}` — unique per serve, never reused. */
  token: string;
  /** True once an answer has been accepted and until it is resolved. */
  answering: boolean;
  /** Wrong attempts on this serve. */
  wrongAttempts: number;
}

export interface ProgressionState {
  runId: number;
  serveSeq: number;
  entries: Record<string, PoolEntry>;
  /** Registration order (stable iteration order for `available` lookups). */
  order: string[];
  active: ActiveQuestion | null;
  /** Every id ever served this run, in order. Handy for tests / dev logs. */
  servedLog: string[];
}

export type ServeStatus = "served" | "active" | "exhausted";

export interface ServeResult {
  state: ProgressionState;
  /** The question now active (or already active for `status: "active"`). */
  served: PoolEntry | null;
  token: string | null;
  status: ServeStatus;
}

export interface ServeOptions {
  /** Restrict candidates to one group (e.g. the current room). */
  group?: string;
  /** Choose among the available candidates. Defaults to registration order. */
  pick?: (candidates: PoolEntry[]) => PoolEntry | null | undefined;
}

export interface TransitionResult {
  state: ProgressionState;
  /** False when the call was a duplicate / stale and changed nothing. */
  applied: boolean;
  id: string | null;
}

export interface ProgressSummary {
  total: number;
  available: number;
  consumed: number;
  retired: number;
  active: number;
  exhausted: boolean;
}

export const normalizeQuestionText = (text: string): string =>
  String(text).trim().toLowerCase().replace(/\s+/g, " ");

/** Question identity: the normalized question text. */
export const makeQuestionId = (text: string): string =>
  normalizeQuestionText(text);

const DEFAULT_GROUP = "";
const DEFAULT_DIFFICULTY = "";

export const createProgression = (
  items?: PoolItem[],
  runId?: number,
): ProgressionState => {
  const base: ProgressionState = {
    runId: runId === undefined ? 1 : runId,
    serveSeq: 0,
    entries: {},
    order: [],
    active: null,
    servedLog: [],
  };
  return items && items.length > 0 ? addItems(base, items) : base;
};

/**
 * Register more questions. Ids that are already known (in any status) are
 * ignored, so a question answered earlier can never be re-introduced by a
 * later pool (e.g. the boss pool).
 */
export const addItems = (
  state: ProgressionState,
  items: PoolItem[],
): ProgressionState => {
  let entries = state.entries;
  let order = state.order;
  let changed = false;
  for (const item of items) {
    if (!item || !item.id || entries[item.id]) continue;
    if (!changed) {
      entries = { ...entries };
      order = [...order];
      changed = true;
    }
    entries[item.id] = {
      id: item.id,
      group: item.group === undefined ? DEFAULT_GROUP : item.group,
      difficulty:
        item.difficulty === undefined ? DEFAULT_DIFFICULTY : item.difficulty,
      status: "available",
    };
    order.push(item.id);
  }
  return changed ? { ...state, entries, order } : state;
};

export const getAvailable = (
  state: ProgressionState,
  group?: string,
): PoolEntry[] => {
  const out: PoolEntry[] = [];
  for (const id of state.order) {
    const entry = state.entries[id];
    if (entry.status !== "available") continue;
    if (group !== undefined && entry.group !== group) continue;
    out.push(entry);
  }
  return out;
};

export const isExhausted = (state: ProgressionState, group?: string): boolean =>
  state.active === null && getAvailable(state, group).length === 0;

export const getProgress = (state: ProgressionState): ProgressSummary => {
  const summary: ProgressSummary = {
    total: state.order.length,
    available: 0,
    consumed: 0,
    retired: 0,
    active: 0,
    exhausted: false,
  };
  for (const id of state.order) {
    const status = state.entries[id].status;
    summary[status] += 1;
  }
  summary.exhausted = summary.available === 0 && summary.active === 0;
  return summary;
};

const setStatus = (
  state: ProgressionState,
  id: string,
  status: QuestionStatus,
): Record<string, PoolEntry> => ({
  ...state.entries,
  [id]: { ...state.entries[id], status },
});

/**
 * Serve the next question. Idempotent while a question is unresolved: calling
 * it again (re-render, duplicate callback) returns the same active question
 * instead of skipping ahead or reselecting.
 */
export const serveNext = (
  state: ProgressionState,
  options?: ServeOptions,
): ServeResult => {
  if (state.active) {
    return {
      state,
      served: state.entries[state.active.id],
      token: state.active.token,
      status: "active",
    };
  }

  const candidates = getAvailable(state, options ? options.group : undefined);
  if (candidates.length === 0) {
    return { state, served: null, token: null, status: "exhausted" };
  }

  let chosen: PoolEntry | null | undefined = candidates[0];
  if (options && options.pick) {
    chosen = options.pick(candidates);
    // A picker must choose one of the offered candidates; anything else
    // (including a stale/consumed entry) falls back to the first candidate.
    if (!chosen || !candidates.some((entry) => entry.id === (chosen as PoolEntry).id)) {
      chosen = candidates[0];
    }
  }

  const serveSeq = state.serveSeq + 1;
  const token = `${state.runId}:${serveSeq}`;
  const next: ProgressionState = {
    ...state,
    serveSeq,
    entries: setStatus(state, chosen.id, "active"),
    active: { id: chosen.id, token, answering: false, wrongAttempts: 0 },
    servedLog: [...state.servedLog, chosen.id],
  };
  return {
    state: next,
    served: next.entries[chosen.id],
    token,
    status: "served",
  };
};

const noop = (state: ProgressionState): TransitionResult => ({
  state,
  applied: false,
  id: null,
});

/**
 * Accept an answer submission for the active question. Returns `applied:
 * false` for stale tokens and for a second submission while one is already
 * being resolved (rapid taps / double submit).
 */
export const beginAnswer = (
  state: ProgressionState,
  token: string,
): TransitionResult => {
  const active = state.active;
  if (!active || active.token !== token || active.answering) {
    return noop(state);
  }
  return {
    state: { ...state, active: { ...active, answering: true } },
    applied: true,
    id: active.id,
  };
};

/**
 * Commit a correct answer: the question becomes consumed and can never be
 * served again this run. Idempotent and keyed by the attempt token, so a
 * duplicate commit (double animation-complete, re-render, rapid taps) is a
 * no-op. Requires `beginAnswer` to have been applied for the same token.
 */
export const commitCorrect = (
  state: ProgressionState,
  token: string,
): TransitionResult => {
  const active = state.active;
  if (!active || active.token !== token || !active.answering) {
    return noop(state);
  }
  return {
    state: {
      ...state,
      entries: setStatus(state, active.id, "consumed"),
      active: null,
    },
    applied: true,
    id: active.id,
  };
};

/**
 * Resolve a wrong answer. By default the same question stays active so the
 * learner can retry it (`answering` is cleared). With `{ retire: true }` the
 * question is retired instead (boss segment): it is not consumed, but it is
 * not reselected until the pool is exhausted and a new run begins.
 */
export const resolveWrong = (
  state: ProgressionState,
  token: string,
  options?: { retire?: boolean },
): TransitionResult => {
  const active = state.active;
  if (!active || active.token !== token || !active.answering) {
    return noop(state);
  }
  if (options && options.retire) {
    return {
      state: {
        ...state,
        entries: setStatus(state, active.id, "retired"),
        active: null,
      },
      applied: true,
      id: active.id,
    };
  }
  return {
    state: {
      ...state,
      active: {
        ...active,
        answering: false,
        wrongAttempts: active.wrongAttempts + 1,
      },
    },
    applied: true,
    id: active.id,
  };
};

/**
 * Intentional replay: discard every status and start a fresh run over the
 * given items. The run id changes, so tokens from the previous run can never
 * commit into the new one.
 */
export const startNewRun = (
  state: ProgressionState,
  items: PoolItem[],
): ProgressionState => createProgression(items, state.runId + 1);

/* ------------------------------------------------------------------ */
/* Endless difficulty ramp                                              */
/* ------------------------------------------------------------------ */

/** Difficulty weights ramp with the wave count but never hit zero. */
export const pickEndlessDifficulty = (
  wave: number,
  rng?: () => number,
): "easy" | "medium" | "hard" => {
  const random = rng || Math.random;
  if (wave < 5) return "easy";
  const t = Math.min((wave - 5) / 25, 1); // ramps across waves 6-30
  const wEasy = 0.55 - 0.4 * t;
  const wMedium = 0.3 + 0.15 * t;
  const wHard = 0.5 * t * t;
  const roll = random() * (wEasy + wMedium + wHard);
  if (roll < wEasy) return "easy";
  if (roll < wEasy + wMedium) return "medium";
  return "hard";
};

/**
 * Build a `pick` function for `serveNext` that follows the endless ramp:
 * choose a target difficulty for the wave, take a random candidate of that
 * difficulty, and fall back to any available difficulty when it is dry.
 */
export const createEndlessPicker = (
  wave: number,
  rng?: () => number,
): ((candidates: PoolEntry[]) => PoolEntry | null) => {
  const random = rng || Math.random;
  return (candidates) => {
    if (candidates.length === 0) return null;
    const target = pickEndlessDifficulty(wave, random);
    const order = [target, "easy", "medium", "hard"];
    for (const difficulty of order) {
      const matching = candidates.filter(
        (entry) => entry.difficulty === difficulty,
      );
      if (matching.length > 0) {
        return matching[Math.floor(random() * matching.length) % matching.length];
      }
    }
    return candidates[Math.floor(random() * candidates.length) % candidates.length];
  };
};
