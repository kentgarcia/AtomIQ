import { Lesson } from '../types';

export const whatIsIsotopeLesson: Lesson = {
  id: 'what-is-isotope',
  title: 'What is an Isotope?',
  description: 'Learn about isotopes and the difference between stable and unstable atoms.',
  unitId: 'atomic-playground',
  difficulty: 'beginner',
  estimatedMinutes: 7,
  xpReward: 60,
  tags: ['basics', 'isotope', 'stability', 'radioactive'],
  prerequisites: ['meet-the-atom'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'What is an Isotope?',
        mission: 'Understand Atomic Twins!',
        icon: 'Element3'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'All atoms of the same element are identical',
        reality: 'Atoms of the same element can have different numbers of neutrons - these are called isotopes',
        explanation: 'While all carbon atoms have 6 protons, they can have different numbers of neutrons. Carbon-12 (6 neutrons) is stable, while Carbon-14 (8 neutrons) is radioactive and used in carbon dating!',
        image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Isotopes: Atomic Siblings',
        content: 'Isotopes are atoms of the same element with different numbers of neutrons. They have the same chemical properties but different masses. Some isotopes are stable, while others are unstable (radioactive) and decay over time.',
        keyPoints: [
          'Same element = same protons, different neutrons',
          'Notation: Element-Mass (e.g., Carbon-14)',
          'Stable isotopes: balanced neutron-to-proton ratio',
          'Unstable isotopes: radioactive, decay over time',
          'Example: Uranium-235 (unstable) vs Uranium-238'
        ],
        image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Isotope Detective',
        description: 'You found two carbon atoms. One has 6 neutrons, the other has 8 neutrons.',
        task: 'Are these the same element?',
        options: [
          { id: 'yes-isotopes', label: 'Yes - They\'re isotopes', icon: 'TickCircle' },
          { id: 'no-different', label: 'No - Different elements', icon: 'CloseCircle' },
          { id: 'same-atom', label: 'They\'re identical', icon: 'Copy' },
          { id: 'not-carbon', label: 'Neither is carbon', icon: 'Danger' }
        ],
        correctAnswer: 'yes-isotopes',
        explanation: 'Correct! Both have 6 protons (making them carbon), but different neutrons. They\'re isotopes: Carbon-12 (6+6) and Carbon-14 (6+8). Same element, different mass!'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'What makes an isotope unstable (radioactive)?',
        options: [
          'Too many protons',
          'Too many or too few neutrons for stability',
          'Too many electrons',
          'Being exposed to radiation'
        ],
        correctIndex: 1,
        explanation: 'An unstable neutron-to-proton ratio makes isotopes radioactive. Too many or too few neutrons creates an imbalance, causing the nucleus to decay and emit radiation to reach a stable state.',
        image: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Isotope Expert!',
        message: 'You can now distinguish between stable and unstable isotopes!',
        rewards: {
          xp: 60,
          stars: 3
        }
      }
    }
  ]
};

export default whatIsIsotopeLesson;

