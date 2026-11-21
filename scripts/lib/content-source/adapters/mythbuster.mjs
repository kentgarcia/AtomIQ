/**
 * Myth Buster adapter v1: `mythbuster_questions`, one file per difficulty (games/mythbuster/NNN-<difficulty>.atomiq),
 * easy then medium then hard. The order of the questions in a file is their position within that difficulty.
 *
 *   difficulty: easy
 *
 *   question mb-easy-q1
 *   question:
 *       Which particles ...?
 *   points: 5                            (left out when 5)
 *   type: multiple_choice                (left out when multiple_choice)
 *   answer: 2                            (the index of the right option, from 0)
 *   options: Electron                    (one line each)
 *   options: Proton
 *   explanation:
 *       Because ...
 */
import { defineAdapter } from "./engine.mjs";

const ORDER = ["easy", "medium", "hard"];

export const mythbusterAdapter = defineAdapter({
  name: "mythbuster",
  version: 1,
  dir: "games/mythbuster",
  owns: (rel) => rel.startsWith("games/mythbuster/") && rel.endsWith(".atomiq"),
  scope: [{ col: "difficulty", key: "difficulty", type: "id" }],
  records: [
    {
      keyword: "question",
      table: "mythbuster_questions",
      id: ["id"],
      scope: ["difficulty"],
      position: { col: "position", scope: ["difficulty"], base: 0 },
      fields: [
        { col: "question", type: "prose", translatable: true },
        { col: "points", type: "int", default: 5, omitDefault: true },
        { col: "type", type: "text", default: "multiple_choice", omitDefault: true },
        { col: "correct_answer", key: "answer", type: "int" },
        { col: "options", type: "list", translatable: true },
        { col: "explanation", type: "prose", translatable: true },
      ],
    },
  ],
  layout(rowsByTable) {
    const rows = rowsByTable.mythbuster_questions ?? [];
    const rank = (d) => (ORDER.includes(d) ? ORDER.indexOf(d) : ORDER.length);
    const levels = [...new Set(rows.map((r) => r.difficulty))].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
    return levels.map((difficulty, i) => ({
      path: `games/mythbuster/${String((i + 1) * 10).padStart(3, "0")}-${difficulty}.atomiq`,
      scope: { difficulty },
      items: rows.filter((r) => r.difficulty === difficulty).sort((a, b) => a.position - b.position).map((row) => ({ keyword: "question", row })),
    }));
  },
});
