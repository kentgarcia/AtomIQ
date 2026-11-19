/**
 * The questions of a story level's battles, with nothing random in WHICH question comes: each enemy
 * has its own fixed list (`assignQuestions`), and the enemy asks its next one every time it is fought,
 * starting again from its first when the list runs out. Framework-free and unit-tested
 * (`npm run test:platformer`). Only the choice of the one wrong option kept beside the right one in a
 * multiple choice question, and its place, is random.
 *
 * A story question remembers the objective it checks, so after a level the game knows which lessons
 * to recommend for what was missed (`recommendLessons` in story-core.ts).
 */

import type { BattleQuestion, ServedBattleQuestion } from "./battle-core.ts";

export interface StoryQuestion extends BattleQuestion {
  itemId: string;
  objectiveId: string;
  /** The options keep their order (a fact-or-myth question: True, then Myth). */
  ordered?: boolean;
}

export interface StoryBattle {
  /** Per enemy, its questions in order. */
  lists: StoryQuestion[][];
  /** Per enemy, how many it has been asked (taken mod its list's length). */
  asked: number[];
  open: (ServedBattleQuestion & { enemy: number; answered?: boolean }) | null;
  /** One objective id for every wrong answer. */
  missed: string[];
  /** Counts of answers, for the result. */
  right: number;
  wrong: number;
  rng: () => number;
  serial: number;
}

export const createStoryBattle = (lists: readonly (readonly StoryQuestion[])[], rng: () => number = Math.random): StoryBattle => ({
  lists: lists.map((l) => [...l]),
  asked: lists.map(() => 0),
  open: null,
  missed: [],
  right: 0,
  wrong: 0,
  rng,
  serial: 0,
});

/** A fresh run of the same level: nothing asked, nothing missed. */
export const restartStoryBattle = (s: StoryBattle): StoryBattle => createStoryBattle(s.lists, s.rng);

const shuffle = <T,>(items: readonly T[], rng: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** A battle shows TWO options: a fact-or-myth question already has two (kept in order); a choice one keeps its right answer and one wrong one. */
export const twoOptions = (q: StoryQuestion, rng: () => number): StoryQuestion => {
  if (q.ordered || q.options.length < 2) return q;
  const wrong = shuffle(q.options.map((_, i) => i).filter((i) => i !== q.correctAnswer), rng);
  const kept = shuffle([q.correctAnswer, wrong[0]], rng);
  return { ...q, options: kept.map((i) => q.options[i]), correctAnswer: kept.indexOf(q.correctAnswer) };
};

/** The next question of this enemy, or null when it has none. Asking again while one is open (and unanswered) gives the same one. */
export const askStory = (s: StoryBattle, enemy: number): ServedBattleQuestion | null => {
  // A question that is open and not yet answered is asked again as it is; one already answered is only waiting to be settled, never asked a second time
  if (s.open && s.open.enemy === enemy && !s.open.answered) return s.open;
  const list = s.lists[enemy];
  if (!list || list.length === 0) return null;
  const q = list[s.asked[enemy] % list.length];
  s.asked[enemy] += 1;
  s.serial += 1;
  s.open = { token: `${enemy}:${s.serial}`, question: twoOptions(q, s.rng), enemy };
  return s.open;
};

export interface StoryAnswer {
  correct: boolean;
  correctIndex: number;
}

/** Accept an answer once. A second call for the same question gives null. */
export const answerStory = (s: StoryBattle, token: string, index: number): StoryAnswer | null => {
  const open = s.open;
  if (!open || open.token !== token || open.answered) return null;
  open.answered = true;
  const correct = index === open.question.correctAnswer;
  return { correct, correctIndex: open.question.correctAnswer };
};

/** Close the question once its fight has landed: it counts, and a wrong one is remembered for the recommendations. */
export const settleStory = (s: StoryBattle, token: string, correct: boolean): void => {
  const open = s.open;
  if (!open || open.token !== token) return;
  if (correct) s.right += 1;
  else {
    s.wrong += 1;
    s.missed.push((open.question as StoryQuestion).objectiveId);
  }
  s.open = null;
};
