/**
 * Turns a bank item of the curriculum (`items`, content/curriculum/types.ts) into a question a battle
 * can ask. Only multiple choice and fact-or-myth items fit: they have one right answer and are answered
 * with one tap. Framework-free, unit-tested (`npm run test:platformer`).
 */

import type { StoryQuestion } from "./story-battle-core.ts";

/** The part of a bank item this needs (`Item` in content/curriculum/types.ts fits). */
export interface BankItem {
  id: string;
  objectiveId: string;
  type: string;
  data: Record<string, unknown>;
  difficulty: number;
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");

export const itemToStoryQuestion = (item: BankItem): StoryQuestion | null => {
  const difficulty = item.difficulty <= 1 ? "easy" : item.difficulty === 2 ? "medium" : "hard";
  const base = { id: item.id, itemId: item.id, objectiveId: item.objectiveId, explanation: text(item.data.explanation), difficulty } as const;
  if (item.type === "true_or_myth") {
    const statement = text(item.data.statement).trim();
    const answer = item.data.answer;
    if (!statement || (answer !== "true" && answer !== "myth")) return null;
    return { ...base, question: statement, options: ["True", "Myth"], correctAnswer: answer === "true" ? 0 : 1, ordered: true };
  }
  if (item.type === "choice") {
    const prompt = text(item.data.prompt).trim();
    const raw = item.data.options;
    if (!prompt || !Array.isArray(raw) || raw.length < 2) return null;
    const options = raw.map((o) => ({ id: text((o as { id?: unknown }).id), label: text((o as { label?: unknown }).label) }));
    const correct = options.findIndex((o) => o.id === item.data.answer);
    if (correct < 0 || options.some((o) => !o.label)) return null;
    return { ...base, question: prompt, options: options.map((o) => o.label), correctAnswer: correct };
  }
  return null;
};

/** The questions of `ids` that the bank has and that fit a battle, in the order asked. */
export const questionsFromItems = (items: readonly BankItem[]): StoryQuestion[] => {
  const out: StoryQuestion[] = [];
  for (const item of items) {
    const q = itemToStoryQuestion(item);
    if (q) out.push(q);
  }
  return out;
};
