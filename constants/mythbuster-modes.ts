export type GameState = "intro" | "playing" | "results";
export type GameMode = "quick" | "challenge" | "endless";

export interface ModeConfig {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  colorSecondary: string;
  rounds: number;
  timeLimit?: number;
  xpMultiplier: number;
  difficulty: number; // 1-3 stars
  tagline: string;
  mascotMood: "happy" | "excited" | "determined";
}

export const GAME_MODES: ModeConfig[] = [
  {
    id: "quick",
    title: "Quick Play",
    description: "5 myths at your own pace",
    icon: "Flash",
    color: "#FF9500",
    colorSecondary: "#FFB84D",
    rounds: 5,
    xpMultiplier: 1,
    difficulty: 1,
    tagline: "Perfect for beginners!",
    mascotMood: "happy",
  },
  {
    id: "challenge",
    title: "Challenge",
    description: "10 myths with time pressure",
    icon: "Timer",
    color: "#FF3B5C",
    colorSecondary: "#FF6B88",
    rounds: 10,
    timeLimit: 10,
    xpMultiplier: 1.5,
    difficulty: 2,
    tagline: "Race against the clock!",
    mascotMood: "excited",
  },
  {
    id: "endless",
    title: "Endless",
    description: "Survive as long as you can",
    icon: "Unlimited",
    color: "#8B5CF6",
    colorSecondary: "#A78BFA",
    rounds: 999,
    xpMultiplier: 2,
    difficulty: 3,
    tagline: "For true MythBusters!",
    mascotMood: "determined",
  },
];