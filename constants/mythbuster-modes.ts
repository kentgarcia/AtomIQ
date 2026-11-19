export type GameState = "intro" | "playing" | "results";
export type GameMode = "quick" | "challenge" | "endless";

/** Endless mode's clock, in seconds: it starts at `start`, a right answer adds `gain`, a wrong one takes `loss`, never above `max`. */
export interface EndlessClock {
  start: number;
  gain: number;
  loss: number;
  max: number;
}

export interface ModeConfig {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  colorSecondary: string;
  /** Statements in a round (999: no end). */
  rounds: number;
  /** Quick Play: the learner picks a unit, and the round is that unit's deck. */
  byUnit?: boolean;
  /** Challenge: wrong answers allowed before the round ends (no timer). */
  lives?: number;
  /** Endless: one clock for the whole round instead of lives. */
  clock?: EndlessClock;
  xpMultiplier: number;
  difficulty: number; // 1-3 stars
  tagline: string;
  mascotMood: "happy" | "excited" | "determined";
}

export const GAME_MODES: ModeConfig[] = [
  {
    id: "quick",
    title: "Quick Play",
    description: "Pick a unit and play its 10 statements",
    icon: "Flash",
    color: "#FF9500",
    colorSecondary: "#FFB84D",
    rounds: 10,
    byUnit: true,
    xpMultiplier: 1,
    difficulty: 1,
    tagline: "Perfect for beginners!",
    mascotMood: "happy",
  },
  {
    id: "challenge",
    title: "Challenge",
    description: "A mix of every statement, 3 lives, no timer",
    icon: "Heart",
    color: "#FF3B5C",
    colorSecondary: "#FF6B88",
    rounds: 15,
    lives: 3,
    xpMultiplier: 1.5,
    difficulty: 2,
    tagline: "Make every answer count!",
    mascotMood: "excited",
  },
  {
    id: "endless",
    title: "Endless",
    description: "Beat the clock: right adds time, wrong takes it",
    icon: "Timer",
    color: "#8B5CF6",
    colorSecondary: "#A78BFA",
    rounds: 999,
    clock: { start: 30, gain: 3, loss: 5, max: 45 },
    xpMultiplier: 2,
    difficulty: 3,
    tagline: "For true MythBusters!",
    mascotMood: "determined",
  },
];