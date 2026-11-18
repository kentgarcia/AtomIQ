/**
 * Curriculum v2 types: units, objectives, lessons made of cards, and the item bank.
 *
 * Framework-free and erasable-syntax only (no enums, `import type` only), so Node
 * tests and content scripts can load it directly. See docs/LESSON_RESTRUCTURE_SPEC.md.
 *
 * Rules that make the data safe to localize and shuffle:
 *  - correct answers always refer to option ids, never to text or array position;
 *  - option lists are arrays of `{ id, ... }` objects so a translation can be merged by id.
 */

import type { VisualBlock, VisualScene, VisualSource } from "../types";

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

export type UnitTone = "primary" | "accent" | "success" | "warning" | "danger" | "info";

export interface Unit {
  id: string;
  position: number;
  title: string;
  subtitle: string;
  description: string;
  goal: string;
  /** Short overview and the encyclopedia terms shown in the Guidebook. */
  guidebook: { summary?: string; termIds?: string[] };
  icon: string;
  tone: UnitTone;
  /** The unit's NPC teacher (`npcs.id`), when it has one. */
  teacherNpcId?: string;
}

export interface Objective {
  id: string;
  unitId: string;
  position: number;
  statement: string;
  /** The wrong idea this objective confronts, when there is one. */
  misconception?: string;
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  xpReward: number;
  /** Objective ids this lesson teaches (exactly one lesson teaches each objective). */
  teaches: string[];
  /** Objective ids from earlier lessons this lesson relies on. */
  reliesOn: string[];
}

export type PathNodeKind = "lesson" | "practice" | "checkpoint";

export interface PathNodeConfig {
  /** Number of items drawn for practice nodes and checkpoints. */
  questionCount?: number;
  /** Fraction (0-1) of items drawn from earlier units. */
  earlierShare?: number;
  /** Pass mark as a fraction (0-1). */
  passMark?: number;
}

export interface PathNode {
  id: string;
  unitId: string;
  position: number;
  kind: PathNodeKind;
  /** Set when `kind` is `lesson`. */
  lessonId?: string;
  config: PathNodeConfig;
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

export type ReferenceKind = "official" | "textbook" | "research" | "article" | "video" | "book";

export interface Reference {
  id: string;
  kind: ReferenceKind;
  publisher: string;
  title: string;
  authors: string;
  year: string;
  url: string;
  /** ISO date the source was last opened and checked. */
  accessed: string;
  /** True once a person has opened the source and confirmed what it supports. */
  verified: boolean;
  note: string;
}

/** A reference attached to a lesson, with the claim it backs. */
export interface LessonReference {
  referenceId: string;
  supports: string;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export type CardKind = "teach" | "item" | "sim";
export type CardTier = "core" | "deeper";

export const TEACH_TYPES = ["explain", "story", "reveal"] as const;
export type TeachType = (typeof TEACH_TYPES)[number];

export const ITEM_TYPES = [
  "choice",
  "true_or_myth",
  "order",
  "match",
  "sort",
  "fill",
  "estimate",
  "hotspot",
  "predict",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const SIM_TYPES = ["atom-builder", "scale-zoom", "decay-wait", "decay-chain", "radiation-id"] as const;
export type SimType = (typeof SIM_TYPES)[number];

/** Item types that are not a plain pick-one question (the §6.2 "non-choice" count). */
export const NON_CHOICE_ITEM_TYPES: readonly string[] = [
  "order",
  "match",
  "sort",
  "fill",
  "estimate",
  "hotspot",
];

/** A figure for a teaching card: a scene drawn from shapes, with text for screen readers. */
export interface CardFigure {
  scene: VisualScene;
  /** What the figure shows, for screen readers. */
  altText: string;
  caption?: string;
  source?: VisualSource;
}

interface TeachBase {
  /** Short heading, optional. */
  title?: string;
  /** Teaching text. At most 60 words (80 hard limit). May contain [[term-id|shown text]] markers. */
  body: string;
  figure?: CardFigure;
  /**
   * Where the figure comes in the lecture: how many of the teacher's bubbles (at most 3) are said before it.
   * 0 = the picture leads, left out = after the first bubble.
   */
  figureAt?: number;
  /** An existing structured visual block (docs/completed/VISUAL_LESSON_BLOCKS.md). */
  visual?: VisualBlock;
}

export type ExplainData = TeachBase;
export interface StoryData extends TeachBase {
  /** Short label such as "1911" or "Rutherford". */
  tag?: string;
  /** The NPC teacher telling the story (`npcs.id`): the unit's teacher (docs/NPC_TEACHERS_SPEC.md). */
  speaker?: string;
}
export interface RevealData extends TeachBase {
  /** The `predict` card this answers. */
  predictCardId: string;
}

export type TeachData = ExplainData | StoryData | RevealData;

// -- Items ------------------------------------------------------------------

export interface ChoiceOption {
  id: string;
  label: string;
  icon?: string;
  /** A picture from the lesson object art. When every option has one, the options show as picture cards. */
  art?: string;
  /** Shown when this wrong option is picked; ideally names the misconception. */
  note?: string;
}

interface ItemBase {
  prompt: string;
  explanation: string;
  figure?: CardFigure;
}

export interface ChoiceItemData extends ItemBase {
  options: ChoiceOption[];
  answer: string;
}

export interface TrueOrMythItemData extends Omit<ItemBase, "prompt"> {
  statement: string;
  answer: "true" | "myth";
  prompt?: string;
}

export interface OrderItemData extends ItemBase {
  /** Listed in the correct order; the app shuffles them for display. */
  items: { id: string; label: string; art?: string }[];
}

export interface MatchItemData extends ItemBase {
  /** Each pair is one correct match. */
  pairs: { id: string; left: string; right: string }[];
}

export interface SortItemData extends ItemBase {
  /** `icon` is an Iconsax name: the group's button and its entry in the legend. Give every group one, each different. */
  buckets: { id: string; label: string; icon?: string }[];
  items: { id: string; label: string; bucket: string; art?: string }[];
}

export interface FillItemData extends ItemBase {
  /** Use ___ in `prompt` for the blank. */
  mode: "bank" | "number";
  bank?: { id: string; label: string }[];
  /** Bank option id, or the number for number mode. */
  answer: string | number;
  tolerance?: number;
  unit?: string;
}

export interface EstimateItemData extends ItemBase {
  min: number;
  max: number;
  step?: number;
  unit?: string;
  scale?: "linear" | "log";
  answer: number;
  /** Accepted distance from `answer`: absolute for linear, a factor for log (10 = within one decade). */
  tolerance: number;
}

export interface HotspotItemData extends ItemBase {
  scene: VisualScene;
  /** Tappable targets in scene units. */
  targets: { id: string; label: string; x: number; y: number; r: number }[];
  answer: string;
  /** On the correct tap, the circles inside the answer target tremble (a short scene motion). Still with reduced motion. */
  animateOnCorrect?: boolean;
}

/** A prediction: unscored, committed before the lesson explains the answer. */
export interface PredictItemData extends ItemBase {
  input: "choice" | "estimate";
  options?: ChoiceOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  scale?: "linear" | "log";
  /** The value the later `reveal` card confirms. Not used to score. */
  answer: string | number;
}

export type ItemData =
  | ChoiceItemData
  | TrueOrMythItemData
  | OrderItemData
  | MatchItemData
  | SortItemData
  | FillItemData
  | EstimateItemData
  | HotspotItemData
  | PredictItemData;

// -- Simulations --------------------------------------------------------------

export type AtomBuilderMode = "build" | "element" | "isotope" | "stability";

export interface AtomBuilderData {
  mode: AtomBuilderMode;
  /** One sentence telling the learner what to do. */
  task: string;
  /** What counts as done. Every key present must match the final state. */
  goal: { protons?: number; neutrons?: number; electrons?: number; stable?: boolean; elementSymbol?: string };
  hint?: string;
  /** Ceiling for the counters. */
  maxProtons?: number;
  maxNeutrons?: number;
  /** Counters that start non-zero and may be locked. */
  start?: { protons?: number; neutrons?: number; electrons?: number };
  lock?: { protons?: boolean; neutrons?: boolean; electrons?: boolean };
  /** Objective ids this simulation exercises. */
  objectives?: string[];
}

export interface ScaleZoomStop {
  id: string;
  label: string;
  /** Size in metres, shown with a unit. */
  meters: number;
  sizeLabel: string;
  note: string;
  /** Icon name for the stop. */
  icon?: string;
  /** A picture from the lesson object art, shown instead of the icon. */
  art?: string;
}

export interface ScaleZoomData {
  task: string;
  stops: ScaleZoomStop[];
}

/** Unit 2: nuclei that change by themselves (docs/UNIT_2_RADIOACTIVITY_SPEC.md §8). */
export type DecayWaitMode = "single" | "half-life";

export interface DecayWaitData {
  /** `single`: genuinely random, each nucleus changes on its own. `half-life`: guided random, about half change per press. */
  mode: DecayWaitMode;
  task: string;
  /** How many unstable nuclei the card starts with. */
  count: number;
  /** Complete after this many presses of the wait button. */
  goal: { presses: number };
  hint?: string;
  objectives?: string[];
}

export interface DecayChainNode {
  id: string;
  label: string;
  state: "unstable" | "stable";
}

export interface DecayChainData {
  task: string;
  /** In order, from the parent to the stable end. Every node but the last is unstable. */
  nodes: DecayChainNode[];
  /** Complete when this node (the stable end) is reached. */
  goal: { reach: string };
  hint?: string;
  objectives?: string[];
}

export type RadiationKind = "alpha" | "beta" | "gamma";

export interface RadiationIdCase {
  id: string;
  answer: RadiationKind;
  /** What the learner is told about what leaves the nucleus. The animation plays after the guess. */
  clue: string;
}

export interface RadiationIdData {
  task: string;
  cases: RadiationIdCase[];
  /** Complete when every case has been identified (a wrong guess is allowed and re-tried). */
  goal: { all: true };
  hint?: string;
  objectives?: string[];
}

export type SimData = AtomBuilderData | ScaleZoomData | DecayWaitData | DecayChainData | RadiationIdData;

// -- Card -------------------------------------------------------------------------

export interface LessonCard {
  id: string;
  lessonId: string;
  position: number;
  kind: CardKind;
  type: string;
  tier: CardTier;
  /** For `item` cards: the bank item to play. */
  itemId?: string;
  /** Items are scored unless this is false (predictions). */
  scored: boolean;
  /**
   * Teach and sim content. For item cards it is empty, or `{ connected: true }`: the activity belongs to the
   * lecture right before it and is played on the same page.
   */
  data: Record<string, unknown>;
}

/** An item from the bank, with the data its interaction needs. */
export interface Item {
  id: string;
  objectiveId: string;
  type: ItemType;
  data: Record<string, unknown>;
  difficulty: 1 | 2 | 3;
  surfaces: ItemSurface[];
  referenceIds: string[];
}

export type ItemSurface = "lesson" | "practice" | "checkpoint" | "review" | "game";

/** A card with its bank item resolved, ready to render. */
export interface ResolvedCard extends LessonCard {
  item?: Item;
}

export interface LessonContent {
  lesson: Lesson;
  cards: ResolvedCard[];
  references: (Reference & { supports: string })[];
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/** What the learner submitted. The shape depends on the item type. */
export type ItemResponse =
  | { type: "choice"; optionId: string }
  | { type: "true_or_myth"; answer: "true" | "myth" }
  | { type: "order"; orderedIds: string[] }
  | { type: "match"; matches: Record<string, string> }
  | { type: "sort"; placements: Record<string, string> }
  | { type: "fill"; value: string | number }
  | { type: "estimate"; value: number }
  | { type: "hotspot"; targetId: string }
  | { type: "predict"; value: string | number };

export interface ItemResult {
  correct: boolean;
  /** For choice items: the note on the picked wrong option, if any. */
  note?: string;
  /** Item ids inside the response that were wrong (match/sort/order), for highlighting. */
  wrongIds?: string[];
}
