/**
 * Type definitions for all content types
 */

// ============================================
// LESSON TYPES
// ============================================

export type LessonStepType = 
  | 'briefing'
  | 'myth_buster'
  | 'micro_learn'
  | 'lab'
  | 'assessment'
  | 'debrief';

export interface LessonStep {
  id: string;
  type: LessonStepType;
  data: any; // Specific to step type
}

export interface MythBusterStep {
  myth: string;
  reality: string;
  explanation: string;
  image?: string;
}

export interface MicroLearnStep {
  title: string;
  content: string;
  image?: string;
  keyPoints?: string[];
  /** Structured visual lesson blocks (see docs/completed/VISUAL_LESSON_BLOCKS.md). Additive; optional. */
  visuals?: VisualBlock[];
}

/** Briefing steps auto-advance, so `visuals` is accepted by the schema but not rendered there yet. */
export interface BriefingStep {
  topic: string;
  mission: string;
  icon?: string;
  visuals?: VisualBlock[];
}

/** Debrief steps accept `visuals` for a future recap figure; not rendered yet. */
export interface DebriefStep {
  title: string;
  message: string;
  rewards?: { xp?: number; stars?: number };
  visuals?: VisualBlock[];
}

// ============================================
// VISUAL LESSON BLOCKS
// ============================================

export type VisualBlockKind =
  | 'diagram'
  | 'process_flow'
  | 'model'
  | 'comparison_cards'
  | 'annotated_illustration'
  | 'real_life_example';

/** Semantic hue for illustration shapes. Mapped to theme roles by the renderer. */
export type VisualTone =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

/** Where a visual's facts or imagery come from. */
export type VisualSource =
  | { type: 'original'; note: string }
  | {
      type: 'reference';
      publisher: string;
      title: string;
      year?: number | string;
      url?: string;
      note?: string;
      /** True when the figures should be re-checked against the publisher before wide release. */
      verify?: boolean;
    };

export interface VisualResponsiveHint {
  /** Content width (dp) below which the figure's labels fall back to a stacked list. Default 280. */
  stackBelow?: number;
  /** Tablet arrangement of figure + legend. Default 'side-by-side'. */
  tabletLayout?: 'side-by-side' | 'stacked';
}

interface VisualBlockBase {
  /** Globally unique, stable id (kebab-case). */
  id: string;
  /** What the learner should be able to do/explain after this visual. Authoring-first field. */
  learningObjective: string;
  title: string;
  /** The teaching text shown as normal body copy next to the figure. */
  explanation: string;
  /** Screen-reader description of what the figure SHOWS (not a copy of the title). */
  altText: string;
  /** Plain-text equivalent that fully conveys the content (every label, value and relationship). */
  plainText: string;
  caption?: string;
  /** Required for comparison_cards and real_life_example (external facts); recommended elsewhere. */
  source?: VisualSource;
  /** Credit line for imagery/illustration. */
  credit?: string;
  responsive?: VisualResponsiveHint;
}

/**
 * Idle life for a scene shape. Frame 0 is always the authored drawing, so a still
 * figure (reduced motion) reads correctly. `period` (ms) must divide
 * SCENE_LOOP_MS so the figure's shared loop never jumps (see visual-blocks.ts).
 */
export type SceneMotion =
  /** Revolves around (cx, cy), linear, starting from the authored position (so no phase). Circles only. */
  | { kind: 'orbit'; cx: number; cy: number; period: number }
  /** Scales about its own centre by up to `amount` (default 0.06, max 0.12). */
  | { kind: 'pulse'; period: number; amount?: number; phase?: number }
  /** Bobs up and down by `dy` units (default 1, max 2). */
  | { kind: 'float'; period: number; dy?: number; phase?: number };

/** A shape in a 100-unit-wide scene. Coordinates are scene units; y grows downward. */
export type SceneShape =
  | { t: 'rect'; x: number; y: number; w: number; h: number; tone?: VisualTone; fill?: 'solid' | 'soft' | 'none'; rx?: number; motion?: SceneMotion }
  | { t: 'circle'; x: number; y: number; r: number; tone?: VisualTone; fill?: 'solid' | 'soft' | 'none'; motion?: SceneMotion }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; tone?: VisualTone; dash?: boolean; arrow?: boolean; width?: number }
  | { t: 'text'; x: number; y: number; text: string; size?: number; anchor?: 'start' | 'middle' | 'end'; tone?: VisualTone; keep?: boolean }
  /** A picture from the lesson object art (components/lesson/visual/object-art.ts), centred on (x, y), `size` units square. */
  | { t: 'art'; id: string; x: number; y: number; size: number };

export interface VisualScene {
  /** Scene height in units (width is always 100). 20-120. */
  height: number;
  shapes: SceneShape[];
}

export interface VisualCallout {
  /** Marker text drawn in the figure, e.g. "1". */
  id: string;
  label: string;
  detail: string;
  /** Marker position in scene units. */
  x: number;
  y: number;
}

export interface VisualKeyItem {
  tone: VisualTone;
  label: string;
  /** Shape used in the key swatch so meaning never relies on color alone. */
  swatch?: 'circle' | 'square' | 'line';
}

interface SceneBlockFields {
  scene: VisualScene;
  callouts: VisualCallout[];
  key?: VisualKeyItem[];
}

export interface DiagramBlock extends VisualBlockBase, SceneBlockFields {
  kind: 'diagram';
}

export interface ModelBlock extends VisualBlockBase, SceneBlockFields {
  kind: 'model';
}

export interface AnnotatedIllustrationBlock extends VisualBlockBase, SceneBlockFields {
  kind: 'annotated_illustration';
}

export interface ProcessFlowStep {
  label: string;
  detail?: string;
  /** Short value shown large, e.g. "50". */
  value?: string;
  /** 0-1 proportion drawn as a meter (e.g. amount remaining). */
  meter?: number;
}

export interface ProcessFlowBlock extends VisualBlockBase {
  kind: 'process_flow';
  steps: ProcessFlowStep[];
}

export interface ComparisonItem {
  label: string;
  /** Display value with its unit, e.g. "about 0.1 mSv". */
  value: string;
  detail?: string;
  /** Positive number in the shared unit; used only to draw the bar. */
  numeric?: number;
  tone?: VisualTone;
}

export interface ComparisonCardsBlock extends VisualBlockBase {
  kind: 'comparison_cards';
  items: ComparisonItem[];
  /** Bar scale when every item has `numeric`. Default 'none'. */
  scale?: 'log' | 'linear' | 'none';
  /** Note shown under the cards, e.g. "Bars use a log scale". */
  scaleNote?: string;
}

export interface RealLifeExampleBlock extends VisualBlockBase {
  kind: 'real_life_example';
  headline: string;
  whatYouSee: string;
  theScience: string;
  whyItMatters: string;
  facts?: string[];
  scene?: VisualScene;
}

export type VisualBlock =
  | DiagramBlock
  | ProcessFlowBlock
  | ModelBlock
  | ComparisonCardsBlock
  | AnnotatedIllustrationBlock
  | RealLifeExampleBlock;

export interface LabStep {
  title: string;
  description: string;
  task: string;
  options: LabOption[];
  correctAnswer: string;
  explanation: string;
}

export interface LabOption {
  id: string;
  label: string;
  icon?: string;
  image?: string;
}

export interface AssessmentStep {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  image?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  unitId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  xpReward: number;
  steps: LessonStep[];
  prerequisites?: string[]; // Other lesson IDs
  tags: string[];
}

// ============================================
// QUIZ TYPES
// ============================================

export type QuizType = 'multiple_choice' | 'true_false' | 'matching' | 'fill_blank';

export interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string | number | boolean; // index for multiple choice; boolean for true/false
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  image?: string;
  points: number;
  timeLimit?: number; // In seconds (legacy; kept on pre-migration question data)
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  timeLimit?: number; // In seconds
  passingScore: number; // Percentage
  xpReward: number;
  tags: string[];
  // Optional legacy fields carried by the pre-migration data (kept for fidelity).
  unitId?: string;
  estimatedMinutes?: number;
  metadata?: Record<string, unknown>; // e.g. { author, version, lastUpdated, ... }
}

// ============================================
// MYTH TYPES
// ============================================

export interface Myth {
  id: string;
  title: string;
  mythStatement: string;
  reality: string;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sources: Source[];
  relatedLessons?: string[]; // Lesson IDs
  image?: string;
  tags: string[];
  popularity: number; // How common this myth is (1-10)
}

// ============================================
// COMMON TYPES
// ============================================

export interface Source {
  title: string;
  url: string;
  author?: string;
  date?: string;
  type: 'article' | 'research' | 'video' | 'book' | 'official';
}

export interface ContentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// ============================================
// UNIT/PROGRESSION TYPES
// ============================================

export interface Unit {
  id: string;
  title: string;
  description: string;
  color: string;
  order: number;
  lessons: string[]; // Lesson IDs
  requiredXP?: number;
  isLocked: boolean;
}

export interface LevelNode {
  id: string;
  type: 'lesson' | 'quiz' | 'boss' | 'trophy';
  contentId: string; // References lesson or quiz ID
  position: number;
  isLocked: boolean;
  status: 'locked' | 'in_progress' | 'completed';
  stars?: number;
  xpEarned?: number;
}

// ============================================
// CONTENT METADATA
// ============================================

export interface ContentMetadata {
  totalLessons: number;
  totalQuizzes: number;
  totalMyths: number;
  categories: ContentCategory[];
  lastUpdated: string;
}

