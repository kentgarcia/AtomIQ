/**
 * AtomIQ Explorer Types
 * Encarta-style interactive knowledge journey system
 */

import { Myth, Article, Post, Quiz } from '../types';

// ============================================
// JOURNEY TYPES
// ============================================

export interface JourneyNode {
  id: string;
  type: 'myth' | 'article' | 'fact' | 'interactive' | 'quiz';
  title: string;
  contentId: string; // References myth, article, or quiz ID
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
  sources?: Array<{
    title: string;
    url: string;
    organization: 'UNSCEAR' | 'IAEA' | 'NEA' | 'other';
  }>;
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
    evidence: Array<{
      statement: string;
      source: {
        organization: 'UNSCEAR' | 'IAEA' | 'NEA' | 'other';
        title: string;
        url: string;
        year?: number;
      };
    }>;
    keyFindings: string[];
  };
  multimedia?: {
    animations?: Array<{
      id: string;
      title: string;
      type: 'reactor_safety' | 'radiation_penetration' | 'decay_process' | 'other';
      description: string;
    }>;
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
// ATOMMAZE QUIZ TYPES
// ============================================

export interface AtomMazeChallenge {
  id: string;
  title: string;
  description: string;
  theme: string; // e.g., "Nuclear Safety Adventure"
  rooms: AtomMazeRoom[];
  xpReward: number;
  timeLimit?: number; // seconds
}

export interface AtomMazeRoom {
  id: string;
  title: string;
  description: string;
  question: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    points: number;
  };
  nextRoomId?: string; // Path through the maze
  alternativePathId?: string; // Branching paths
  unlockCondition?: {
    type: 'score_threshold' | 'time_limit';
    value: number;
  };
}

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
  debunkingSnippet?: string; // If it debunks a myth
  sources: Array<{
    organization: 'UNSCEAR' | 'IAEA' | 'NEA' | 'other';
    title: string;
    url: string;
  }>;
  relatedMyths?: string[]; // Myth IDs
  relatedArticles?: string[]; // Article IDs
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
  currentMode: 'journey' | 'encyclopedia' | 'maze';
  searchQuery?: string;
  filters?: {
    category?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

