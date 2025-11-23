/**
 * Unit Structure and Configuration
 * Defines the learning path and unit organization
 */

export interface UnitConfig {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  goal: string;
  color: string;
  icon: string;
  lessonIds: string[];
  mythIds: string[];
  quizIds: string[];
  estimatedMinutes: number;
  totalXP: number;
  isLocked: boolean;
  requiredXP?: number;
}

export const UNITS: UnitConfig[] = [
  {
    id: 'atomic-playground',
    order: 1,
    title: 'The Atomic Playground',
    subtitle: 'Basics',
    description: 'Master the fundamentals of atoms, isotopes, and natural radiation',
    goal: 'Establish the vocabulary. Users cannot understand isotopes or fission if they don\'t understand the atom.',
    color: '#FFB74D',
    icon: 'Atom',
    lessonIds: [
      'meet-the-atom',
      'what-is-isotope',
      'background-radiation'
    ],
    mythIds: [
      'all-radiation-manmade'
    ],
    quizIds: [
      'atomic-basics-quiz'
    ],
    estimatedMinutes: 21, // 6 + 7 + 8
    totalXP: 180, // 50 + 60 + 70
    isLocked: false
  },
  
  {
    id: 'invisible-rays',
    order: 2,
    title: 'The Invisible Rays',
    subtitle: 'Types & Shielding',
    description: 'Learn about different types of radiation and how to protect against them',
    goal: 'Demystify "Radiation" by breaking it down into manageable types.',
    color: '#64B5F6',
    icon: 'Flash',
    lessonIds: [
      'alpha-beta-particles',
      'gamma-rays',
      'radiation-shielding'
    ],
    mythIds: [
      'radiation-glows-green'
    ],
    quizIds: [
      'radiation-types-quiz'
    ],
    estimatedMinutes: 20,
    totalXP: 180,
    isLocked: false,
    requiredXP: 100 // Complete some of Unit 1
  },
  
  {
    id: 'dose-poison',
    order: 3,
    title: 'The Dose Makes the Poison',
    subtitle: 'Health & Measurement',
    description: 'Understand radiation doses, measurements, and health effects',
    goal: 'Contextualize safety using radiation comparison and dose visualization.',
    color: '#81C784',
    icon: 'Health',
    lessonIds: [
      'what-is-sievert',
      'dose-visualizer',
      'acute-chronic-exposure'
    ],
    mythIds: [
      'nuclear-plant-cancer'
    ],
    quizIds: [
      'radiation-safety-quiz'
    ],
    estimatedMinutes: 23,
    totalXP: 190,
    isLocked: false,
    requiredXP: 280 // Complete Unit 1 + some of Unit 2
  },
  
  {
    id: 'engine-room',
    order: 4,
    title: 'The Engine Room',
    subtitle: 'How Reactors Work',
    description: 'Discover how nuclear reactors generate clean, reliable energy',
    goal: 'Explain the mechanics to debunk the "Explosion" myth.',
    color: '#BA68C8',
    icon: 'Setting2',
    lessonIds: [
      'nuclear-fission',
      'control-rods',
      'reactor-safety-lab'
    ],
    mythIds: [
      'reactors-explode-like-bombs'
    ],
    quizIds: [
      'reactor-mechanics-quiz'
    ],
    estimatedMinutes: 23,
    totalXP: 190,
    isLocked: false,
    requiredXP: 470 // Complete Units 1-3
  },
  
  {
    id: 'green-horizon',
    order: 5,
    title: 'The Green Horizon',
    subtitle: 'Sustainability & Waste',
    description: 'Explore nuclear energy\'s environmental benefits and waste management',
    goal: 'Address environmental concerns using energy statistics visualizations.',
    color: '#4DB6AC',
    icon: 'Global',
    lessonIds: [
      'waste-issue',
      'energy-showdown'
    ],
    mythIds: [
      'nuclear-waste-forever',
      'nuclear-not-clean'
    ],
    quizIds: [
      'sustainability-quiz'
    ],
    estimatedMinutes: 18,
    totalXP: 150,
    isLocked: false,
    requiredXP: 660 // Complete Units 1-4
  }
];

/**
 * Get unit by ID
 */
export const getUnitById = (id: string): UnitConfig | undefined => {
  return UNITS.find(unit => unit.id === id);
};

/**
 * Get units in order
 */
export const getUnitsInOrder = (): UnitConfig[] => {
  return [...UNITS].sort((a, b) => a.order - b.order);
};

/**
 * Get next unit
 */
export const getNextUnit = (currentUnitId: string): UnitConfig | undefined => {
  const currentUnit = getUnitById(currentUnitId);
  if (!currentUnit) return undefined;
  
  return UNITS.find(unit => unit.order === currentUnit.order + 1);
};

/**
 * Get previous unit
 */
export const getPreviousUnit = (currentUnitId: string): UnitConfig | undefined => {
  const currentUnit = getUnitById(currentUnitId);
  if (!currentUnit) return undefined;
  
  return UNITS.find(unit => unit.order === currentUnit.order - 1);
};

/**
 * Check if unit is unlocked based on user XP
 */
export const isUnitUnlocked = (unitId: string, userXP: number): boolean => {
  const unit = getUnitById(unitId);
  if (!unit) return false;
  
  if (unit.isLocked) return false;
  if (!unit.requiredXP) return true;
  
  return userXP >= unit.requiredXP;
};

/**
 * Get unit progress
 */
export const getUnitProgress = (unitId: string, completedLessonIds: string[]): {
  completed: number;
  total: number;
  percentage: number;
} => {
  const unit = getUnitById(unitId);
  if (!unit) return { completed: 0, total: 0, percentage: 0 };
  
  const completed = unit.lessonIds.filter(id => completedLessonIds.includes(id)).length;
  const total = unit.lessonIds.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, total, percentage };
};

/**
 * Get total curriculum stats
 */
export const getCurriculumStats = () => {
  const totalLessons = UNITS.reduce((sum, unit) => sum + unit.lessonIds.length, 0);
  const totalMyths = UNITS.reduce((sum, unit) => sum + unit.mythIds.length, 0);
  const totalQuizzes = UNITS.reduce((sum, unit) => sum + unit.quizIds.length, 0);
  const totalMinutes = UNITS.reduce((sum, unit) => sum + unit.estimatedMinutes, 0);
  const totalXP = UNITS.reduce((sum, unit) => sum + unit.totalXP, 0);
  
  return {
    totalUnits: UNITS.length,
    totalLessons,
    totalMyths,
    totalQuizzes,
    totalMinutes,
    totalXP,
    estimatedHours: Math.round(totalMinutes / 60 * 10) / 10
  };
};

export default UNITS;

