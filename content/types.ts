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
  correctAnswer: string | number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  image?: string;
  points: number;
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
  relatedFacts?: string[]; // Fact IDs
  relatedLessons?: string[]; // Lesson IDs
  image?: string;
  tags: string[];
  popularity: number; // How common this myth is (1-10)
}

// ============================================
// FACT TYPES
// ============================================

export interface Fact {
  id: string;
  title: string;
  statement: string;
  explanation: string;
  category: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  sources: Source[];
  relatedMyths?: string[]; // Myth IDs
  relatedLessons?: string[]; // Lesson IDs
  image?: string;
  tags: string[];
  dateAdded: string;
  lastUpdated: string;
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
  totalFacts: number;
  categories: ContentCategory[];
  lastUpdated: string;
}

