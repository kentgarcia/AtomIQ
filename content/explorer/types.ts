/**
 * AtomIQ Explorer Types
 * Encarta-style interactive knowledge journey system
 */


// ============================================
// JOURNEY TYPES
// ============================================

export interface JourneyNode {
  id: string;
  type: 'myth' | 'fact' | 'interactive' | 'quiz';
  title: string;
  contentId: string; // References myth or quiz ID
  position: number; // Order in the journey
  description?: string;
  unlockCondition?: {
    type: 'previous_node' | 'xp_threshold' | 'myth_completed';
    value: string | number;
  };
}

export interface Journey {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  coverImage?: string;
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  nodes: JourneyNode[];
  xpReward: number;
  tags: string[];
  sources?: {
    title: string;
    url: string;
    organization: 'UNSCEAR' | 'IAEA' | 'NEA' | 'other';
  }[];
}

// ============================================
// MYTH NODE TYPES (Encarta-Style)
// ============================================

export interface MythNodeContent {
  mythId: string;
  whatPeopleThink: {
    title: string;
    content: string;
    commonBeliefs: string[];
    sources?: string[]; // Media/public sources
  };
  whatScienceSays: {
    title: string;
    content: string;
    evidence: {
      statement: string;
      source: {
        organization: 'UNSCEAR' | 'IAEA' | 'NEA' | 'other';
        title: string;
        url: string;
        year?: number;
      };
    }[];
    keyFindings: string[];
  };
  multimedia?: {
    animations?: {
      id: string;
      title: string;
      type: 'reactor_safety' | 'radiation_penetration' | 'decay_process' | 'other';
      description: string;
    }[];
    audioNarration?: {
      url: string;
      duration: number; // seconds
      transcript?: string;
    };
  };
}

// ============================================
// MULTIMEDIA POP-UP TYPES
// ============================================

export interface MultimediaPopUp {
  id: string;
  type: 'animation' | 'audio' | 'interactive' | 'video';
  title: string;
  description: string;
  content: {
    animationType?: 'reactor_safety' | 'radiation_penetration' | 'decay_process' | 'other';
    audioUrl?: string;
    videoUrl?: string;
    interactiveData?: any;
  };
  triggerNodeId?: string; // Which journey node triggers this
  position?: 'inline' | 'popup' | 'overlay';
}

// ============================================
// QUESTION TYPES
// ============================================

export type QuestionType = 'quiz' | 'scramble';

export interface QuizQuestion {
  type: 'quiz';
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
}

export interface ScrambleQuestion {
  type: 'scramble';
  question: string;
  answer: string; // The correct word to form
  hint?: string;
}

export type BattleQuestion = QuizQuestion | ScrambleQuestion;

// ============================================
// ENCYCLOPEDIA TYPES
// ============================================

export interface EncyclopediaEntry {
  id: string;
  term: string;
  definition: string;
  category: string;
  relatedTerms: string[]; // Cross-references
  quickFacts: string[];
  image?: string; // Optional image path for the entry
  debunkingSnippet?: string; // If it debunks a myth
  sources: {
    organization: 'UNSCEAR' | 'IAEA' | 'NEA' | 'other';
    title: string;
    url: string;
  }[];
  relatedMyths?: string[]; // Myth IDs
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ============================================
// EXPLORER STATE TYPES
// ============================================

export interface ExplorerProgress {
  journeyId: string;
  currentNodeId: string;
  completedNodes: string[];
  unlockedNodes: string[];
  startedAt: string;
  completedAt?: string;
  xpEarned: number;
}

export interface ExplorerSession {
  currentJourneyId?: string;
  currentMode: 'journey' | 'encyclopedia';
  searchQuery?: string;
  filters?: {
    category?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

