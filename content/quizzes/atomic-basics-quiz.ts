import { Quiz } from '../types';

export const atomicBasicsQuiz: Quiz = {
  id: 'atomic-basics-quiz',
  title: 'Atomic Basics: The Safety Inspection',
  description: 'Test your knowledge of atoms, isotopes, and natural radiation!',
  unitId: 'atomic-playground',
  difficulty: 'beginner',
  estimatedMinutes: 10,
  xpReward: 100,
  passingScore: 70,
  tags: ['quiz', 'atoms', 'isotopes', 'radiation', 'unit1'],
  
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'What particle in an atom determines which element it is?',
      options: [
        'Neutrons',
        'Protons',
        'Electrons',
        'Quarks'
      ],
      correctAnswer: 1,
      explanation: 'The number of protons (atomic number) determines the element. Carbon always has 6 protons, oxygen has 8, uranium has 92, etc. Change the proton count, and you have a different element!',
      points: 10,
      timeLimit: 30
    },
    
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'What are isotopes?',
      options: [
        'Atoms with different numbers of protons',
        'Atoms with different numbers of neutrons',
        'Atoms with different numbers of electrons',
        'Atoms from different elements'
      ],
      correctAnswer: 1,
      explanation: 'Isotopes are atoms of the same element (same protons) with different numbers of neutrons. For example, Carbon-12 and Carbon-14 are both carbon (6 protons) but have 6 and 8 neutrons respectively.',
      points: 10,
      timeLimit: 30
    },
    
    {
      id: 'q3',
      type: 'true_false',
      question: 'All isotopes are radioactive and dangerous.',
      correctAnswer: false,
      explanation: 'False! Most isotopes are completely stable. You\'re made mostly of stable isotopes like Carbon-12, Oxygen-16, and Nitrogen-14. Only isotopes with unstable neutron-to-proton ratios are radioactive.',
      points: 10,
      timeLimit: 20
    },
    
    {
      id: 'q4',
      type: 'multiple_choice',
      question: 'An atom has 8 protons, 8 neutrons, and 10 electrons. What is it?',
      options: [
        'A neutral oxygen atom',
        'An oxygen ion (O²⁻)',
        'A nitrogen atom',
        'A neon atom'
      ],
      correctAnswer: 1,
      explanation: '8 protons = oxygen (atomic number 8). But it has 10 electrons (2 more than protons), making it negatively charged: O²⁻ ion. Neutral oxygen would have 8 electrons.',
      points: 15,
      timeLimit: 45
    },
    
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'What percentage of average human radiation exposure comes from natural sources?',
      options: [
        '20%',
        '50%',
        '80%',
        '100%'
      ],
      correctAnswer: 2,
      explanation: 'About 80% comes from natural sources: cosmic rays (space), terrestrial radiation (rocks/soil), radon gas, and internal sources (potassium-40 in our bodies). Only ~20% comes from human activities, mostly medical procedures.',
      points: 10,
      timeLimit: 30
    },
    
    {
      id: 'q6',
      type: 'multiple_choice',
      question: 'Which is the LARGEST natural source of radiation exposure for most people?',
      options: [
        'Cosmic rays from space',
        'Radon gas',
        'Bananas (potassium-40)',
        'Granite countertops'
      ],
      correctAnswer: 1,
      explanation: 'Radon gas is the largest single source of natural radiation exposure, contributing about 50% of our natural background dose. It comes from uranium decay in rocks and soil and can accumulate in basements.',
      points: 10,
      timeLimit: 30
    },
    
    {
      id: 'q7',
      type: 'true_false',
      question: 'Living in Denver, Colorado exposes you to more cosmic radiation than living at sea level.',
      correctAnswer: true,
      explanation: 'True! Denver is at high altitude (~1 mile above sea level), so there\'s less atmosphere to shield cosmic rays from space. People in Denver receive about 2x more cosmic radiation than people at sea level.',
      points: 10,
      timeLimit: 20
    },
    
    {
      id: 'q8',
      type: 'multiple_choice',
      question: 'What makes an isotope unstable (radioactive)?',
      options: [
        'Too many protons',
        'Imbalanced neutron-to-proton ratio',
        'Too many electrons',
        'Exposure to radiation'
      ],
      correctAnswer: 1,
      explanation: 'An imbalanced neutron-to-proton ratio makes isotopes unstable. Too many or too few neutrons causes the nucleus to decay, emitting radiation to reach a more stable configuration.',
      points: 10,
      timeLimit: 30
    },
    
    {
      id: 'q9',
      type: 'multiple_choice',
      question: 'Where are protons and neutrons located in an atom?',
      options: [
        'In the electron shells',
        'In the nucleus (center)',
        'Orbiting around the nucleus',
        'Randomly distributed'
      ],
      correctAnswer: 1,
      explanation: 'Protons and neutrons are in the nucleus at the center of the atom. The nucleus is incredibly dense and tiny - if an atom were the size of a football stadium, the nucleus would be the size of a marble at the center!',
      points: 10,
      timeLimit: 25
    },
    
    {
      id: 'q10',
      type: 'multiple_choice',
      question: 'Carbon-14 is used in carbon dating. Why does it work?',
      options: [
        'C-14 is stable forever',
        'C-14 decays at a predictable rate (half-life)',
        'C-14 glows in the dark',
        'C-14 is magnetic'
      ],
      correctAnswer: 1,
      explanation: 'Carbon-14 is radioactive and decays at a predictable rate (half-life of 5,730 years). Living things constantly replace C-14, but when they die, the C-14 starts decaying. By measuring how much C-14 remains, we can determine how long ago the organism died!',
      points: 15,
      timeLimit: 45
    }
  ],
  
  metadata: {
    category: 'atomic-basics',
    tags: ['atoms', 'isotopes', 'radiation', 'basics'],
    difficulty: 'beginner',
    version: '1.0',
    author: 'AtomIQ Team',
    lastUpdated: '2025-11-23'
  }
};

export default atomicBasicsQuiz;


