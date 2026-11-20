/**
 * The instructions of the Games tab, one set per game (framework-free data). The picker's "How to play" button opens
 * them: it starts on the game whose levels are open, or on the overview, and the learner can switch to another set.
 */

import { GAME_MODES } from "../../constants/mythbuster-modes.ts";

export type GuideId = "overview" | "mythbuster" | "atom-maze" | "lab";

export interface GuideStep {
  icon: string;
  title: string;
  hint: string;
}

export interface GameGuide {
  id: GuideId;
  /** Label of its chip. */
  label: string;
  icon: string;
  color: string;
  /** One line under the chips. */
  summary: string;
  steps: GuideStep[];
}

const mode = (id: "quick" | "challenge" | "endless") => GAME_MODES.find((m) => m.id === id)!;

export const GAME_GUIDES: readonly GameGuide[] = [
  {
    id: "overview",
    label: "Games",
    icon: "Game",
    color: "#0EA5E9",
    summary: "Pick a game, then pick how you want to play it.",
    steps: [
      { icon: "Game", title: "Pick a game", hint: "Tap a card to choose. Each game opens its levels right here." },
      { icon: "Layer", title: "Choose your level", hint: "Tap a level card to start playing at once." },
      { icon: "ArrowLeft2", title: "Back", hint: "Tap the back arrow in the header to return to the games list." },
    ],
  },
  {
    id: "mythbuster",
    label: "Myth Buster",
    icon: "Judge",
    color: "#A66CFF",
    summary: "Swipe MYTH or FACT on each statement.",
    steps: [
      { icon: "Dislike", title: "Swipe MYTH", hint: "Swipe a statement left when it's a myth." },
      { icon: "Like", title: "Swipe FACT", hint: "Swipe right when it's actually a fact." },
      { icon: mode("quick").icon, title: mode("quick").title, hint: `Pick a unit and play its ${mode("quick").rounds} statements. No timer, no lives: take your time.` },
      { icon: mode("challenge").icon, title: mode("challenge").title, hint: `${mode("challenge").rounds} statements from every deck, old and new. You have ${mode("challenge").lives} lives and a wrong answer costs one. No timer.` },
      { icon: mode("endless").icon, title: mode("endless").title, hint: `You start with ${mode("endless").clock!.start} seconds. A right answer adds ${mode("endless").clock!.gain}, a wrong one takes ${mode("endless").clock!.loss}. When the clock hits 0, it's over.` },
    ],
  },
  {
    id: "atom-maze",
    label: "Atom Maze",
    icon: "Grid9",
    color: "#1CB0F6",
    summary: "Run, jump and answer your way through each level.",
    steps: [
      { icon: "Map", title: "Pick a level", hint: "Levels open one after another. Beat one to unlock the next." },
      { icon: "MessageQuestion", title: "Battle with questions", hint: "Touch an enemy and answer its question. A right answer attacks, a wrong one costs a heart." },
      { icon: "Heart", title: "Mind your hearts", hint: "Run out of hearts and the level starts over." },
      { icon: "Star", title: "Reach the door", hint: "Collect coins for a better score: up to three stars a level." },
    ],
  },
  {
    id: "lab",
    label: "Lab",
    icon: "Microscope",
    color: "#58CC02",
    summary: "Three experiments to try for real.",
    steps: [
      { icon: "ShieldTick", title: "Radiation Shield Lab", hint: "Pick the right shield for each source." },
      { icon: "Atom", title: "Build an Atom", hint: "Add protons, neutrons and electrons." },
      { icon: "Timer1", title: "Radioactive Decay Lab", hint: "Watch half-lives play out." },
    ],
  },
];

export const guideById = (id: GuideId): GameGuide => GAME_GUIDES.find((g) => g.id === id) ?? GAME_GUIDES[0]!;

/** The guide to open on: the game whose levels are open (the picker's `DifficultyGame` ids), else the overview. */
export const initialGuide = (activeGame: "mythbuster" | "lab" | null): GuideId => activeGame ?? "overview";
