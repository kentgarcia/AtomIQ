/**
 * The questions of the platformer's battles: which one an enemy asks, in what order the options
 * stand, and what counts as answered. Framework-free and unit-tested (`npm run test:platformer`).
 *
 * It sits on the Atom Maze progression (services/atom-maze-progression.ts), so the rules are the
 * same ones the old maze had: a question has an identity and a status, is served only while
 * available, an answer is accepted once, and a question that was answered (right or wrong) does not
 * come back this run. An enemy's `tier` picks the difficulty (0 easy, 1 medium, 2 hard); when that
 * tier has run dry the nearest one is used instead.
 */

import {
  beginAnswer,
  commitCorrect,
  createProgression,
  makeQuestionId,
  resolveWrong,
  serveNext,
  type PoolEntry,
  type ProgressionState,
} from "../../services/atom-maze-progression.ts";

export type BattleDifficulty = "easy" | "medium" | "hard";

export interface BattleQuestion {
  id: string;
  question: string;
  options: string[];
  /** Index into `options`. */
  correctAnswer: number;
  explanation: string;
  difficulty: BattleDifficulty;
}

/** The part of a Myth Buster question this needs (`QuizQuestion` in content/types.ts fits). */
export interface RawQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string | number | boolean;
  explanation: string;
  difficulty: BattleDifficulty;
}

/** Multiple choice and true or false questions that are well formed; anything else is left out. */
export const toBattleQuestions = (raw: readonly RawQuestion[]): BattleQuestion[] => {
  const out: BattleQuestion[] = [];
  for (const q of raw) {
    if (!q.question || !q.question.trim()) continue;
    const base = { id: q.id, question: q.question, explanation: q.explanation ?? "", difficulty: q.difficulty };
    if (q.type === "true_false" && typeof q.correctAnswer === "boolean") {
      out.push({ ...base, options: ["True", "False"], correctAnswer: q.correctAnswer ? 0 : 1 });
    } else if (q.type === "multiple_choice" && Array.isArray(q.options) && q.options.length >= 2) {
      const index = Number(q.correctAnswer);
      if (Number.isInteger(index) && index >= 0 && index < q.options.length) {
        out.push({ ...base, options: [...q.options], correctAnswer: index });
      }
    }
  }
  return out;
};

export interface ServedBattleQuestion {
  token: string;
  /** Options are shuffled once when it is served and then kept. */
  question: BattleQuestion;
}

export interface BattlePool {
  state: ProgressionState;
  byId: Record<string, BattleQuestion>;
  open: ServedBattleQuestion | null;
  rng: () => number;
}

export const createBattlePool = (questions: readonly BattleQuestion[], rng: () => number = Math.random): BattlePool => {
  const byId: Record<string, BattleQuestion> = {};
  const items = [];
  for (const q of questions) {
    const id = makeQuestionId(q.question);
    if (byId[id]) continue;
    byId[id] = q;
    items.push({ id, difficulty: q.difficulty });
  }
  return { state: createProgression(items), byId, open: null, rng };
};

export const newBattleRun = (pool: BattlePool): BattlePool =>
  createBattlePool(Object.values(pool.byId), pool.rng);

const DIFFICULTY_OF_TIER: readonly BattleDifficulty[] = ["easy", "medium", "hard"];

const shuffle = <T,>(items: readonly T[], rng: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * A battle shows TWO options. A true or false question already has two ("True" then "False", the way
 * round a learner expects); a multiple choice one keeps its right answer and ONE of the wrong ones,
 * picked and placed at random.
 */
const shuffleOptions = (q: BattleQuestion, rng: () => number): BattleQuestion => {
  if (q.options.length === 2 && q.options[0] === "True" && q.options[1] === "False") return q;
  const wrong = shuffle(
    q.options.map((_, i) => i).filter((i) => i !== q.correctAnswer),
    rng,
  );
  const kept = shuffle([q.correctAnswer, wrong[0]], rng);
  return { ...q, options: kept.map((i) => q.options[i]), correctAnswer: kept.indexOf(q.correctAnswer) };
};

/** The question to ask for an enemy of this tier, or null when the bank is empty. Asking again while one is open gives the same one. */
export const askQuestion = (pool: BattlePool, tier: number): ServedBattleQuestion | null => {
  if (pool.open) return pool.open;
  const target = Math.max(0, Math.min(2, tier));
  const wanted = [target, ...[0, 1, 2].filter((t) => t !== target).sort((a, b) => Math.abs(a - target) - Math.abs(b - target))];
  const pick = (candidates: PoolEntry[]): PoolEntry | null => {
    for (const t of wanted) {
      const ofTier = candidates.filter((c) => c.difficulty === DIFFICULTY_OF_TIER[t]);
      if (ofTier.length > 0) return ofTier[Math.floor(pool.rng() * ofTier.length)];
    }
    return candidates[0] ?? null;
  };
  const served = serveNext(pool.state, { pick });
  pool.state = served.state;
  if (served.status === "exhausted" || !served.served || !served.token) return null;
  const q = pool.byId[served.served.id];
  pool.open = { token: served.token, question: shuffleOptions(q, pool.rng) };
  return pool.open;
};

export interface AnswerResult {
  correct: boolean;
  correctIndex: number;
}

/** Accept an answer once. A second call for the same question gives null. */
export const answerQuestion = (pool: BattlePool, token: string, index: number): AnswerResult | null => {
  const open = pool.open;
  if (!open || open.token !== token) return null;
  const began = beginAnswer(pool.state, token);
  if (!began.applied) return null;
  pool.state = began.state;
  return { correct: index === open.question.correctAnswer, correctIndex: open.question.correctAnswer };
};

/** Close the question once the learner has seen the result: it is used up either way. */
export const settleQuestion = (pool: BattlePool, token: string, correct: boolean): void => {
  const open = pool.open;
  if (!open || open.token !== token) return;
  const result = correct ? commitCorrect(pool.state, token) : resolveWrong(pool.state, token, { retire: true });
  if (result.applied) pool.state = result.state;
  pool.open = null;
};

export const questionsLeft = (pool: BattlePool): number =>
  Object.keys(pool.state.entries).filter((id) => pool.state.entries[id].status === "available").length;
