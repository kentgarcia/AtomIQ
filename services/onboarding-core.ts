/**
 * Onboarding, the framework-free part: the order of the steps, what each question offers, what
 * Shrodi says back, and how the answers turn into the recap lines. No React and no storage, so
 * `scripts/test-onboarding.mjs` runs it under Node. The screens are in `components/onboarding/`
 * and the step machine in `app/onboarding.tsx`; the plan is `docs/ONBOARDING_SPEC.md`.
 *
 * Nothing here is saved until the learner has given a name and accepted the Terms: the answers
 * live in component state and `serializeAnswers` is called once, at the very end.
 */

export type OnboardingStep = "hello" | "why" | "level" | "how" | "goal" | "plan" | "taste" | "profile" | "welcome";

export const STEPS: readonly OnboardingStep[] = ["hello", "why", "level", "how", "goal", "plan", "taste", "profile", "welcome"];

export type Reason = "curious" | "school" | "career" | "news" | "fun";
export type Level = "new" | "basics" | "solid";
export type GoalMinutes = 5 | 10 | 15 | 20;

export interface Answers {
  reason: Reason | null;
  level: Level | null;
  goalMinutes: GoalMinutes | null;
}

export const EMPTY_ANSWERS: Answers = { reason: null, level: null, goalMinutes: null };

/** The colour an answer wears (its icon tile, and the row once picked). The screen maps each to a theme colour. */
export type Tone = "blue" | "green" | "yellow" | "purple" | "red" | "orange";

/** One tappable answer. `reply` is what Shrodi says once it is picked. */
export interface Choice<T> {
  id: T;
  label: string;
  /** A second line under the label (the goals use it). */
  hint?: string;
  icon: string;
  tone: Tone;
  reply: string;
}

export const REASONS: readonly Choice<Reason>[] = [
  { id: "curious", label: "I'm just curious", icon: "Lamp", tone: "yellow", reply: "Curiosity is the best reason. Atoms are full of surprises!" },
  { id: "school", label: "School or exams", icon: "Book", tone: "blue", reply: "Got it. We'll build it up one idea at a time." },
  { id: "career", label: "Work or career", icon: "Target", tone: "red", reply: "Smart. A solid base helps with every nuclear topic." },
  { id: "news", label: "I keep seeing it in the news", icon: "Notification", tone: "purple", reply: "Then let's sort the facts from the myths." },
  { id: "fun", label: "Just for fun", icon: "Game", tone: "green", reply: "Fun it is! There are games too." },
];

export const LEVELS: readonly Choice<Level>[] = [
  { id: "new", label: "I'm brand new to it", icon: "Flag", tone: "green", reply: "Perfect. We start at the very beginning." },
  { id: "basics", label: "I know the basics", icon: "Book1", tone: "blue", reply: "A quick refresher, then on to the good parts." },
  { id: "solid", label: "I know quite a bit", icon: "Microscope", tone: "purple", reply: "Nice! The myths will keep you on your toes." },
];

export const GOALS: readonly Choice<GoalMinutes>[] = [
  { id: 5, label: "Casual", hint: "5 minutes a day", icon: "Timer1", tone: "blue", reply: "Small steps add up. Let's start easy." },
  { id: 10, label: "Regular", hint: "10 minutes a day", icon: "Clock", tone: "green", reply: "A solid rhythm. That's about one lesson a day." },
  { id: 15, label: "Serious", hint: "15 minutes a day", icon: "Flash", tone: "yellow", reply: "Now we're moving. I like that." },
  { id: 20, label: "Intense", hint: "20 minutes a day", icon: "Fire", tone: "red", reply: "Big plans! I'll try to keep up." },
];

/** What a question screen says: the question, and what Shrodi says before anything is picked. */
export const PROMPTS = {
  why: { title: "What brings you here?", hint: "Pick the one that fits best." },
  level: { title: "How much do you know about atoms?", hint: "There is no wrong answer." },
  goal: { title: "Pick a daily goal", hint: "Short and steady beats long and rare." },
} as const;

export type QuestionStep = keyof typeof PROMPTS;

/** The choices of a question screen. */
export function choicesFor(step: QuestionStep): readonly Choice<string | number>[] {
  return step === "why" ? REASONS : step === "level" ? LEVELS : GOALS;
}

/** What Shrodi says for a picked choice, or his opening hint while nothing is picked. */
export function shrodiLine(step: QuestionStep, picked: string | number | null): string {
  if (picked === null) return PROMPTS[step].hint;
  return choicesFor(step).find((c) => c.id === picked)?.reply ?? PROMPTS[step].hint;
}

/* ---- moving between steps ---------------------------------------------------------------------- */

/** The steps the progress bar is drawn on, in order. Hello, plan and welcome have no bar. */
export const BAR_STEPS: readonly OnboardingStep[] = ["why", "level", "how", "goal", "taste", "profile"];

/**
 * How full the bar is on `step`, 0 to 1: one seventh per bar step, so the bar is never empty on the
 * first question and never full before the end. `plan` keeps the goal's fill; hello is 0, welcome 1.
 */
export function stepProgress(step: OnboardingStep): number {
  if (step === "hello") return 0;
  if (step === "welcome") return 1;
  const at = step === "plan" ? BAR_STEPS.indexOf("goal") : BAR_STEPS.indexOf(step);
  return (at + 1) / (BAR_STEPS.length + 1);
}

/** Whether the step shows the bar. */
export const hasBar = (step: OnboardingStep): boolean => BAR_STEPS.includes(step);

/** The step after `step`. The taste is stepped over when `skipTaste` (its questions could not be loaded). */
export function nextStep(step: OnboardingStep, opts: { skipTaste?: boolean } = {}): OnboardingStep | null {
  const next = STEPS[STEPS.indexOf(step) + 1] ?? null;
  return next === "taste" && opts.skipTaste ? "profile" : next;
}

/** Where Back goes, or null when there is nowhere to go back to (hello, the plan, welcome). */
export function previousStep(step: OnboardingStep): OnboardingStep | null {
  switch (step) {
    case "why":
      return "hello";
    case "level":
      return "why";
    case "how":
      return "level";
    case "goal":
      return "how";
    case "taste":
      return "goal"; // the plan is a transition, never a place to come back to
    case "profile":
      return "taste";
    default:
      return null;
  }
}

/** The state `canContinue` reads. */
export interface FlowState {
  answers: Answers;
  name: string;
  agreed: boolean;
}

/** Continue is on from the first frame a choice is made, and off until then. */
export function canContinue(step: OnboardingStep, s: FlowState): boolean {
  switch (step) {
    case "why":
      return s.answers.reason !== null;
    case "level":
      return s.answers.level !== null;
    case "goal":
      return s.answers.goalMinutes !== null;
    case "profile":
      return s.name.trim().length > 0 && s.agreed;
    default:
      return true;
  }
}

/* ---- the pitch, written from the answers ------------------------------------------------------- */

export interface HowRow {
  id: "learn" | "play" | "keep" | "ask";
  /** Which navbar icon draws it (the Home map, Games, the Quests chest, the Guide): the screen maps this to the picture. */
  tab: "map" | "games" | "quests" | "ai";
  /** The bold opening phrase. */
  title: string;
  /** Carries on from the title in the same sentence: "Tiny lessons" + "where a teacher explains...". */
  body: string;
}

const HOW: Record<HowRow["id"], HowRow> = {
  learn: { id: "learn", tab: "map", title: "Tiny lessons", body: "where a teacher explains each idea, then you try it" },
  play: { id: "play", tab: "games", title: "Games that make it stick", body: "like Myth Buster and Atom Maze, to turn what you learned into play" },
  ask: { id: "ask", tab: "ai", title: "Shrodi, your guide", body: "answers your questions and points you to the right lesson" },
  keep: { id: "keep", tab: "quests", title: "A streak to keep", body: "with daily quests that bring you back for a little each day" },
};

/** The four rows of "how it works": their order and some of their wording follow why the learner came. */
export function rowsFor(reason: Reason | null): HowRow[] {
  const learn = reason === "school" ? { ...HOW.learn, body: "that follow a clear path, one idea at a time" } : HOW.learn;
  const play = reason === "news" ? { ...HOW.play, title: "Myths, busted", body: "with Myth Buster, which sorts fact from fiction, fast" } : HOW.play;
  switch (reason) {
    case "news":
    case "fun":
      return [play, learn, HOW.keep, HOW.ask];
    case "school":
    case "career":
      return [learn, HOW.keep, play, HOW.ask];
    default:
      return [learn, play, HOW.keep, HOW.ask];
  }
}

/* ---- the plan ---------------------------------------------------------------------------------- */

export interface PlanLine {
  id: "start" | "goal" | "reason";
  icon: string;
  text: string;
}

const START_LINE: Record<Level, string> = {
  new: "Unit 1 is your starting point, no experience needed",
  basics: "Unit 1 is a quick refresher, then new ground",
  solid: "Unit 1 is your starting point, at a quick pace",
};

const REASON_LINE: Record<Reason, string> = {
  curious: "Lessons that answer the big questions",
  school: "Lessons that build up step by step",
  career: "A solid base for any nuclear topic",
  news: "Myth Buster to sort fact from fiction",
  fun: "Games to play along the way",
};

/** The three lines the plan ticks off, repeating the learner's answers back. Missing answers get a plain default. */
export function planLines(a: Answers): PlanLine[] {
  return [
    { id: "start", icon: "Flag", text: START_LINE[a.level ?? "new"] },
    { id: "goal", icon: "Clock", text: `Your goal: ${a.goalMinutes ?? 10} minutes a day` },
    { id: "reason", icon: "Target", text: REASON_LINE[a.reason ?? "curious"] },
  ];
}

export interface RecapTile {
  id: "goal" | "streak" | "unit";
  label: string;
  /** The number the tile counts up to. */
  value: number;
  /** Shown after the number. */
  unit: string;
  icon: string;
}

/** The three tiles of the welcome: the goal, the first day of a streak, and where the path starts. */
export function recapFor(a: Answers): RecapTile[] {
  return [
    { id: "goal", label: "Daily goal", value: a.goalMinutes ?? 10, unit: " min", icon: "Clock" },
    { id: "streak", label: "Streak", value: 1, unit: " day", icon: "Fire" },
    { id: "unit", label: "Starting at", value: 1, unit: "", icon: "Flag" },
  ];
}

/* ---- the taste: real questions from the bank ---------------------------------------------------- */

/** Two easy questions from lesson 1 (a myth or fact, then a choice). The tests check the bank still has them. */
export const TASTE_ITEM_IDS: readonly string[] = ["u1-l1-tom-microscope", "u1-l1-choice-made-of"];

/**
 * XP for finishing the two taste questions. It is shown when they are done and banked once, at the end of
 * onboarding (`completeOnboarding`), so the learner starts with it. The questions themselves are practice:
 * they are not recorded against any lesson or objective.
 */
export const TASTE_XP = 10;

/* ---- what is saved ----------------------------------------------------------------------------- */

export interface StoredAnswers {
  v: 1;
  reason: Reason | null;
  level: Level | null;
  goalMinutes: GoalMinutes | null;
  at: number;
}

const GOAL_VALUES: readonly number[] = GOALS.map((g) => g.id);

/** The JSON to store once onboarding is complete. */
export function serializeAnswers(a: Answers, now: number = Date.now()): string {
  const stored: StoredAnswers = { v: 1, reason: a.reason, level: a.level, goalMinutes: a.goalMinutes, at: now };
  return JSON.stringify(stored);
}

/** Reads what `serializeAnswers` wrote. Anything unknown (a bad value, another version) becomes `null`; garbage gives `null`. */
export function parseAnswers(raw: unknown): StoredAnswers | null {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.v !== 1) return null;
  const reason = REASONS.some((r) => r.id === o.reason) ? (o.reason as Reason) : null;
  const level = LEVELS.some((l) => l.id === o.level) ? (o.level as Level) : null;
  const goalMinutes = typeof o.goalMinutes === "number" && GOAL_VALUES.includes(o.goalMinutes) ? (o.goalMinutes as GoalMinutes) : null;
  return { v: 1, reason, level, goalMinutes, at: typeof o.at === "number" && Number.isFinite(o.at) ? o.at : 0 };
}
