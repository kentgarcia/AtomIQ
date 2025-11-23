/**
 * Lesson Registry - Organized by Unit
 * Import and export all lessons here
 */

import { Lesson } from '../types';

// ============================================
// UNIT 1: THE ATOMIC PLAYGROUND
// ============================================
import meetTheAtomLesson from './unit1-atomic-playground/meet-the-atom';
import whatIsIsotopeLesson from './unit1-atomic-playground/what-is-isotope';
import backgroundRadiationLesson from './unit1-atomic-playground/background-radiation';

// ============================================
// UNIT 2: THE INVISIBLE RAYS
// ============================================
import radiationShieldingLesson from './unit2-invisible-rays/radiation-shielding';

// ============================================
// UNIT 3: THE DOSE MAKES THE POISON
// ============================================
// To be implemented

// ============================================
// UNIT 4: THE ENGINE ROOM
// ============================================
import nuclearFissionLesson from './unit4-engine-room/nuclear-fission';

// ============================================
// UNIT 5: THE GREEN HORIZON
// ============================================
// To be implemented

// Lesson registry
export const lessons: Record<string, Lesson> = {
  // Unit 1: Atomic Playground
  'meet-the-atom': meetTheAtomLesson,
  'what-is-isotope': whatIsIsotopeLesson,
  'background-radiation': backgroundRadiationLesson,
  
  // Unit 2: Invisible Rays
  'radiation-shielding': radiationShieldingLesson,
  
  // Unit 4: Engine Room
  'nuclear-fission': nuclearFissionLesson,
};

// Helper functions
export const getLessonById = (id: string): Lesson | undefined => {
  return lessons[id];
};

export const getLessonsByUnit = (unitId: string): Lesson[] => {
  return Object.values(lessons).filter(lesson => lesson.unitId === unitId);
};

export const getLessonsByTag = (tag: string): Lesson[] => {
  return Object.values(lessons).filter(lesson => lesson.tags.includes(tag));
};

export const getLessonsByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): Lesson[] => {
  return Object.values(lessons).filter(lesson => lesson.difficulty === difficulty);
};

export const getAllLessons = (): Lesson[] => {
  return Object.values(lessons);
};

// Get lessons by unit in order
export const getLessonsForUnit = (unitId: string): Lesson[] => {
  const unitLessons = getLessonsByUnit(unitId);
  // Sort by prerequisites if needed, or return in order
  return unitLessons;
};

export default lessons;
