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
    title: 'Introduction to Nuclear Science',
    subtitle: 'Understanding the Atom and its Energy',
    description: 'Explore the basics of nuclear science, including atoms, isotopes, and the energy contained within nuclei',
    goal: 'Learners will understand atomic structure, nuclear energy fundamentals, and recognize common misconceptions.',
    color: '#FFB74D',
    icon: 'Atom',
    lessonIds: [
      'meet-the-atom',
      'nuclear-energy-explained',
      'history-of-nuclear-science',
      'what-is-isotope',
      'background-radiation'
    ],
    mythIds: [
      'all-radiation-manmade'
    ],
    quizIds: [
      'atomic-basics-quiz'
    ],
    estimatedMinutes: 40, // 8 + 8 + 9 + 7 + 8
    totalXP: 300, // 50 + 60 + 70 + 60 + 60
    isLocked: false
  },
  
  {
    id: 'nuclear-reactions',
    order: 2,
    title: 'Nuclear Reactions',
    subtitle: 'How Atoms Transform and Release Energy',
    description: 'Explores the fundamental nuclear reactions that power stars, fuel nuclear power plants, and enable essential technologies',
    goal: 'Learners will gain foundational knowledge about how nuclear reactions work, how energy is released, and how these processes are safely controlled and applied in real life.',
    color: '#64B5F6',
    icon: 'Flash',
    lessonIds: [
      'nuclear-fission',
      'nuclear-fusion',
      'radioactive-decay'
    ],
    mythIds: [
      'reactors-explode-like-bombs'
    ],
    quizIds: [
      'nuclear-reactions-quiz'
    ],
    estimatedMinutes: 30, // 10 + 10 + 10
    totalXP: 240, // 80 + 80 + 80
    isLocked: false,
    requiredXP: 180 // Complete some of Unit 1
  },
  
  {
    id: 'radiation-effects',
    order: 3,
    title: 'Radiation & Its Effects',
    subtitle: 'Understanding Radiation, Safety, and Real-World Uses',
    description: 'Introduces learners to the different types of radiation, how radiation interacts with matter, and the real science behind radiation effects on human health and the environment',
    goal: 'Equip learners with factual, science-based understanding of radiation — what it is, how it works, and how it can be used safely — while countering fear and misconceptions with evidence.',
    color: '#81C784',
    icon: 'Health',
    lessonIds: [
      'types-of-radiation',
      'radiation-biological-effects',
      'measuring-radiation'
    ],
    mythIds: [
      'all-radiation-manmade'
    ],
    quizIds: [
      'radiation-effects-quiz'
    ],
    estimatedMinutes: 34, // 10 + 12 + 12
    totalXP: 260, // 80 + 90 + 90
    isLocked: false,
    requiredXP: 420 // Complete Units 1-2
  },
  
  {
    id: 'nuclear-everyday-life',
    order: 4,
    title: 'Nuclear Technology in Everyday Life',
    subtitle: 'How Nuclear Science Helps Heal, Build, and Protect Our World',
    description: 'Explores the positive and practical applications of nuclear technology in society. From diagnosing diseases to ensuring food safety and protecting the environment',
    goal: 'To help learners understand the safe, essential, and beneficial uses of nuclear technology—empowering them to separate evidence-based facts from misconceptions.',
    color: '#BA68C8',
    icon: 'Heart',
    lessonIds: [
      'medical-applications',
      'industrial-agricultural-uses',
      'environmental-protection'
    ],
    mythIds: [
      'radiation-glows-green'
    ],
    quizIds: [
      'everyday-nuclear-quiz'
    ],
    estimatedMinutes: 36, // 12 + 12 + 12
    totalXP: 270, // 90 + 90 + 90
    isLocked: false,
    requiredXP: 680 // Complete Units 1-3
  },
  
  {
    id: 'nuclear-safety-security',
    order: 5,
    title: 'Nuclear Safety, Security & Global Responsibility',
    subtitle: 'How the World Ensures Nuclear Technology Is Safe, Secure, and Peacefully Used',
    description: 'Focuses on how countries, scientists, and international organizations work together to ensure nuclear technology is used safely, securely, and responsibly',
    goal: 'To help learners understand how nuclear safety frameworks, regulations, and global cooperation protect people and the environment, and to cultivate awareness of the peaceful uses of nuclear technology.',
    color: '#FF7043',
    icon: 'ShieldSecurity',
    lessonIds: [
      'nuclear-safety-systems',
      'nuclear-security',
      'nuclear-policy'
    ],
    mythIds: [
      'reactors-explode-like-bombs'
    ],
    quizIds: [
      'safety-security-quiz'
    ],
    estimatedMinutes: 45, // 15 + 15 + 15
    totalXP: 300, // 100 + 100 + 100
    isLocked: false,
    requiredXP: 950 // Complete Units 1-4
  },
  
  {
    id: 'invisible-rays',
    order: 6,
    title: 'The Invisible Rays',
    subtitle: 'Types & Shielding',
    description: 'Learn about different types of radiation and how to protect against them',
    goal: 'Demystify "Radiation" by breaking it down into manageable types.',
    color: '#9C27B0',
    icon: 'ShieldTick',
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
    requiredXP: 1250 // Complete Units 1-5
  },
  
  {
    id: 'dose-poison',
    order: 7,
    title: 'The Dose Makes the Poison',
    subtitle: 'Health & Measurement',
    description: 'Understand radiation doses, measurements, and health effects',
    goal: 'Contextualize safety using radiation comparison and dose visualization.',
    color: '#E91E63',
    icon: 'Chart',
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
    requiredXP: 1430 // Complete Units 1-6
  },
  
  {
    id: 'engine-room',
    order: 8,
    title: 'The Engine Room',
    subtitle: 'How Reactors Work',
    description: 'Discover how nuclear reactors generate clean, reliable energy',
    goal: 'Explain the mechanics to debunk the "Explosion" myth.',
    color: '#00BCD4',
    icon: 'Setting2',
    lessonIds: [
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
    requiredXP: 1620 // Complete Units 1-7
  },
  
  {
    id: 'green-horizon',
    order: 9,
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
    requiredXP: 1810 // Complete Units 1-8
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

