/**
 * Lesson Registry - Organized by Unit
 * Import and export all lessons here
 */

import { Lesson } from '../types';

// ============================================
// UNIT 1: THE ATOMIC PLAYGROUND
// ============================================
import backgroundRadiationLesson from './unit1-atomic-playground/background-radiation';
import historyOfNuclearScienceLesson from './unit1-atomic-playground/history-of-nuclear-science';
import meetTheAtomLesson from './unit1-atomic-playground/meet-the-atom';
import nuclearEnergyExplainedLesson from './unit1-atomic-playground/nuclear-energy-explained';
import whatIsIsotopeLesson from './unit1-atomic-playground/what-is-isotope';

// ============================================
// UNIT 2: NUCLEAR REACTIONS
// ============================================
import nuclearFissionLesson from './unit2-nuclear-reactions/nuclear-fission';
import nuclearFusionLesson from './unit2-nuclear-reactions/nuclear-fusion';
import radioactiveDecayLesson from './unit2-nuclear-reactions/radioactive-decay';

// ============================================
// UNIT 3: RADIATION & ITS EFFECTS
// ============================================
import measuringRadiationLesson from './unit3-radiation-effects/measuring-radiation';
import radiationBiologicalEffectsLesson from './unit3-radiation-effects/radiation-biological-effects';
import typesOfRadiationLesson from './unit3-radiation-effects/types-of-radiation';

// ============================================
// UNIT 4: NUCLEAR TECHNOLOGY IN EVERYDAY LIFE
// ============================================
import environmentalProtectionLesson from './unit4-nuclear-everyday-life/environmental-protection';
import industrialAgriculturalUsesLesson from './unit4-nuclear-everyday-life/industrial-agricultural-uses';
import medicalApplicationsLesson from './unit4-nuclear-everyday-life/medical-applications';

// ============================================
// UNIT 5: NUCLEAR SAFETY, SECURITY & GLOBAL RESPONSIBILITY
// ============================================
import nuclearPolicyLesson from './unit5-nuclear-safety-security/nuclear-policy';
import nuclearSafetySystemsLesson from './unit5-nuclear-safety-security/nuclear-safety-systems';
import nuclearSecurityLesson from './unit5-nuclear-safety-security/nuclear-security';

// ============================================
// UNIT 6: THE INVISIBLE RAYS (formerly Unit 2)
// ============================================
import radiationShieldingLesson from './unit2-invisible-rays/radiation-shielding';

// ============================================
// UNIT 7: THE DOSE MAKES THE POISON
// ============================================
// To be implemented

// ============================================
// UNIT 8: THE ENGINE ROOM
// ============================================
// Moved to Unit 2

// ============================================
// UNIT 9: THE GREEN HORIZON
// ============================================
// To be implemented

// Lesson registry
export const lessons: Record<string, Lesson> = {
  // Unit 1: Introduction to Nuclear Science
  'meet-the-atom': meetTheAtomLesson,
  'nuclear-energy-explained': nuclearEnergyExplainedLesson,
  'history-of-nuclear-science': historyOfNuclearScienceLesson,
  'what-is-isotope': whatIsIsotopeLesson,
  'background-radiation': backgroundRadiationLesson,
  
  // Unit 2: Nuclear Reactions
  'nuclear-fission': nuclearFissionLesson,
  'nuclear-fusion': nuclearFusionLesson,
  'radioactive-decay': radioactiveDecayLesson,
  
  // Unit 3: Radiation & Its Effects
  'types-of-radiation': typesOfRadiationLesson,
  'radiation-biological-effects': radiationBiologicalEffectsLesson,
  'measuring-radiation': measuringRadiationLesson,
  
  // Unit 4: Nuclear Technology in Everyday Life
  'medical-applications': medicalApplicationsLesson,
  'industrial-agricultural-uses': industrialAgriculturalUsesLesson,
  'environmental-protection': environmentalProtectionLesson,
  
  // Unit 5: Nuclear Safety, Security & Global Responsibility
  'nuclear-safety-systems': nuclearSafetySystemsLesson,
  'nuclear-security': nuclearSecurityLesson,
  'nuclear-policy': nuclearPolicyLesson,
  
  // Unit 6: Invisible Rays
  'radiation-shielding': radiationShieldingLesson,
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
