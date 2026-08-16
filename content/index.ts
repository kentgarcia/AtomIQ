/**
 * Main Content Export
 * Central hub for all educational content
 */

// Types
// Content metadata
import { getAllLessons, getLessonById } from './lessons';
import quizzes, { getAllQuizzes } from './quizzes';
import myths, { getAllMyths } from './myths';
import facts, { getAllFacts } from './facts';
import { ContentMetadata, ContentCategory } from './types';

export * from './types';

// Units
export * from './units';
export { default as UNITS } from './units';

// Lessons (DB-backed — lookups are async)
export * from './lessons';

// Quizzes
export * from './quizzes';
export { default as quizzes } from './quizzes';

// Myths & facts (DB-backed — lookups are async)
export * from './myths';
export { default as myths } from './myths';
export * from './facts';
export { default as facts } from './facts';

export const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    id: 'safety',
    name: 'Safety',
    description: 'Nuclear safety and radiation protection',
    icon: 'ShieldTick',
    color: '#FFB74D'
  },
  {
    id: 'waste',
    name: 'Waste Management',
    description: 'Nuclear waste handling and storage',
    icon: 'Trash',
    color: '#64B5F6'
  },
  {
    id: 'environment',
    name: 'Environment',
    description: 'Environmental impact and benefits',
    icon: 'Global',
    color: '#81C784'
  },
  {
    id: 'energy',
    name: 'Energy Production',
    description: 'How nuclear energy is generated',
    icon: 'Flash',
    color: '#BA68C8'
  },
  {
    id: 'history',
    name: 'History',
    description: 'Nuclear energy history and development',
    icon: 'Book',
    color: '#E57373'
  },
  {
    id: 'future',
    name: 'Future Tech',
    description: 'Next-generation nuclear technology',
    icon: 'Rocket',
    color: '#4DB6AC'
  }
];

export const getContentMetadata = async (): Promise<ContentMetadata> => {
  return {
    totalLessons: (await getAllLessons()).length,
    totalQuizzes: (await getAllQuizzes()).length,
    totalMyths: (await getAllMyths()).length,
    totalFacts: (await getAllFacts()).length,
    categories: CONTENT_CATEGORIES,
    lastUpdated: new Date().toISOString()
  };
};

// Search across all content
export const searchContent = async (query: string) => {
  const lowerQuery = query.toLowerCase();

  const matchingLessons = (await getAllLessons()).filter(lesson =>
    lesson.title.toLowerCase().includes(lowerQuery) ||
    lesson.description.toLowerCase().includes(lowerQuery) ||
    lesson.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
  
  const matchingQuizzes = (await getAllQuizzes()).filter(quiz =>
    quiz.title.toLowerCase().includes(lowerQuery) ||
    quiz.description.toLowerCase().includes(lowerQuery) ||
    quiz.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
  
  const matchingMyths = (await getAllMyths()).filter(myth =>
    myth.title.toLowerCase().includes(lowerQuery) ||
    myth.mythStatement.toLowerCase().includes(lowerQuery) ||
    myth.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
  
  const matchingFacts = (await getAllFacts()).filter(fact =>
    fact.title.toLowerCase().includes(lowerQuery) ||
    fact.statement.toLowerCase().includes(lowerQuery) ||
    fact.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
  
  return {
    lessons: matchingLessons,
    quizzes: matchingQuizzes,
    myths: matchingMyths,
    facts: matchingFacts,
    total: matchingLessons.length + matchingQuizzes.length + matchingMyths.length + matchingFacts.length
  };
};

// Get related content
export const getRelatedContent = (contentId: string, contentType: 'lesson' | 'quiz' | 'myth' | 'fact') => {
  const related = {
    lessons: [] as any[],
    quizzes: [] as any[],
    myths: [] as any[],
    facts: [] as any[]
  };
  
  // Implementation would fetch related content based on tags, categories, etc.
  // This is a placeholder for the actual implementation
  
  return related;
};

export default {
  getLessonById,
  getAllLessons,
  quizzes,
  myths,
  facts,
  CONTENT_CATEGORIES,
  getContentMetadata,
  searchContent,
  getRelatedContent
};

