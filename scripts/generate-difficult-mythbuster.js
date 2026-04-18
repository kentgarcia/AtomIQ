const fs = require("fs");
const path = require("path");

const inputPath = path.join("DOCS", "difficult-quiz.md");
const outputPath = path.join(
  "content",
  "quizzes",
  "mythbuster-difficult-questions.ts",
);

const raw = fs.readFileSync(inputPath, "utf8").replace(/\r/g, "");

const questionRegex =
  /^\s*(\d{1,2})\.\s+(.+)\n\s*A\.\s+(.+)\n\s*B\.\s+(.+)\n\s*C\.\s+(.+)\n\s*D\.\s+(.+)$/gm;
const questions = [];
let m;
while ((m = questionRegex.exec(raw)) !== null) {
  const index = Number(m[1]);
  if (index >= 1 && index <= 50) {
    questions.push({
      index,
      question: m[2].trim(),
      options: [m[3].trim(), m[4].trim(), m[5].trim(), m[6].trim()],
    });
  }
}

questions.sort((a, b) => a.index - b.index);

if (questions.length !== 50) {
  throw new Error(`Expected 50 questions, found ${questions.length}`);
}

const keyMarker = "Answer Key - Difficult";
const markerIndex = raw.indexOf(keyMarker);
if (markerIndex === -1) {
  throw new Error("Answer key marker not found");
}

const answerText = raw.slice(markerIndex + keyMarker.length);
const answerRegex = /^\s*(\d{1,2})\.\s*([ABCD])\s*$/gm;
const answerMap = new Map();
while ((m = answerRegex.exec(answerText)) !== null) {
  const qNum = Number(m[1]);
  const letter = m[2];
  if (qNum >= 1 && qNum <= 50) {
    answerMap.set(qNum, letter);
  }
}

if (answerMap.size !== 50) {
  throw new Error(`Expected 50 answers, found ${answerMap.size}`);
}

const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };

const outQuestions = questions.map((q) => {
  const letter = answerMap.get(q.index);
  const answerIndex = letterToIndex[letter];
  if (answerIndex === undefined) {
    throw new Error(`Invalid answer letter for question ${q.index}: ${letter}`);
  }
  const optionText = q.options[answerIndex];
  return {
    id: `mb-hard-q${q.index}`,
    type: "multiple_choice",
    question: q.question,
    options: q.options,
    correctAnswer: answerIndex,
    explanation: `Correct answer: ${optionText}.`,
    difficulty: "hard",
    points: 5,
  };
});

const ts = `import type { QuizQuestion } from '../types';\n\nexport const difficultMythBusterQuestions: QuizQuestion[] = ${JSON.stringify(outQuestions, null, 2)};\n\nexport default difficultMythBusterQuestions;\n`;

fs.writeFileSync(outputPath, ts, "utf8");
console.log(`Wrote ${outputPath} with ${outQuestions.length} questions.`);
