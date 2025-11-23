import { Lesson } from '../types';

export const radiationShieldingLesson: Lesson = {
  id: 'radiation-shielding',
  title: 'Radiation Shielding',
  description: 'Learn how different materials protect against radiation and why lead is commonly used.',
  unitId: 'nuclear-safety',
  difficulty: 'beginner',
  estimatedMinutes: 5,
  xpReward: 50,
  tags: ['safety', 'radiation', 'shielding', 'protection'],
  
  steps: [
    {
      id: 'briefing',
      type: 'briefing',
      data: {
        topic: 'Radiation Shielding',
        mission: 'Stop the Gamma Rays!',
        icon: 'ShieldTick'
      }
    },
    
    {
      id: 'myth-buster',
      type: 'myth_buster',
      data: {
        myth: 'Any thick material can block all types of radiation',
        reality: 'Different types of radiation require different shielding materials',
        explanation: 'Alpha particles can be stopped by paper, beta particles by aluminum, but gamma rays need dense materials like lead or concrete.',
        image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400'
      }
    },
    
    {
      id: 'micro-learn',
      type: 'micro_learn',
      data: {
        title: 'Types of Radiation Shielding',
        content: 'Different types of radiation have different penetrating powers. Alpha particles are stopped by paper, beta particles by thin metal, and gamma rays require dense materials like lead.',
        keyPoints: [
          'Alpha: Stopped by paper or skin',
          'Beta: Stopped by aluminum or plastic',
          'Gamma: Requires lead, concrete, or water',
          'Neutrons: Require hydrogen-rich materials'
        ],
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
      }
    },
    
    {
      id: 'lab',
      type: 'lab',
      data: {
        title: 'Shield Selection Lab',
        description: 'A gamma ray source is detected! Choose the right material to protect yourself.',
        task: 'Select the most effective shield against gamma radiation',
        options: [
          { id: 'paper', label: 'Paper', icon: 'Document' },
          { id: 'aluminum', label: 'Aluminum', icon: 'Box' },
          { id: 'lead', label: 'Lead', icon: 'ShieldTick' },
          { id: 'plastic', label: 'Plastic', icon: 'Box' }
        ],
        correctAnswer: 'lead',
        explanation: 'Lead is the most effective shield against gamma radiation due to its high density and atomic number. It absorbs gamma rays through photoelectric effect and Compton scattering.'
      }
    },
    
    {
      id: 'assessment',
      type: 'assessment',
      data: {
        question: 'Which of these materials is best for shielding Gamma radiation?',
        options: ['Wood', 'Aluminum', 'Lead', 'Water'],
        correctIndex: 2,
        explanation: 'Lead is the most effective material for gamma radiation shielding due to its high density (11.34 g/cm³) and high atomic number (82), which allows it to effectively absorb gamma rays.',
        image: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400'
      }
    },
    
    {
      id: 'debrief',
      type: 'debrief',
      data: {
        title: 'Mission Complete!',
        message: "You've mastered the basics of radiation shielding.",
        rewards: {
          xp: 50,
          stars: 3
        }
      }
    }
  ]
};

export default radiationShieldingLesson;

