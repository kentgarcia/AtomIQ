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
}

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

