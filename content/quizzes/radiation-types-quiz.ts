import { Quiz } from '../types';

export const radiationTypesQuiz: Quiz = {
  id: 'radiation-types-quiz',
  title: 'Radiation Types & Shielding',
  description: 'Identify alpha, beta, and gamma characteristics and how to shield them.',
  category: 'radiation-types',
  difficulty: 'easy',
  passingScore: 70,
  xpReward: 70,
  timeLimit: 360,
  tags: ['alpha', 'beta', 'gamma', 'shielding', 'unit6'],

  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Alpha particles can be stopped by:',
      options: ['Paper', 'Aluminum plate', 'Thick lead', 'No barrier'],
      correctAnswer: 0,
      explanation: 'A sheet of paper or skin stops alpha particles; they are not very penetrating.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'Beta particles are best shielded with:',
      options: ['Air only', 'Wood', 'Aluminum or plastic', 'Gold'],
      correctAnswer: 2,
      explanation: 'Low-density materials like aluminum or plastic effectively stop beta particles.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      question: 'Which is pure electromagnetic radiation?',
      options: ['Alpha', 'Beta', 'Gamma', 'Neutron'],
      correctAnswer: 2,
      explanation: 'Gamma rays are high-energy photons, unlike particle radiation.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q4',
      type: 'true_false',
      question: 'Gamma shielding often uses dense materials like lead or concrete.',
      options: ['True', 'False'],
      correctAnswer: 0,
      explanation: 'Dense materials provide better attenuation for penetrating gamma rays.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'Which statement is correct about exposure risk?',
      options: [
        'Alpha is harmless in any situation',
        'Beta is always more dangerous than gamma',
        'Alpha is dangerous if inhaled/ingested despite weak penetration',
        'Gamma cannot cause harm'
      ],
      correctAnswer: 2,
      explanation: 'Alpha cannot penetrate skin but is hazardous if inside the body.',
      difficulty: 'medium',
      points: 12
    }
  ]
};

export default radiationTypesQuiz;
