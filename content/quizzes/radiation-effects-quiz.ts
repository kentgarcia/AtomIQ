import { Quiz } from '../types';

export const radiationEffectsQuiz: Quiz = {
  id: 'radiation-effects-quiz',
  title: 'Radiation Effects Checkpoint',
  description: 'Test how radiation interacts with people and matter.',
  category: 'radiation-effects',
  difficulty: 'medium',
  passingScore: 70,
  xpReward: 80,
  timeLimit: 420,
  tags: ['radiation', 'health', 'effects', 'unit3'],

  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Which type of radiation is most penetrating?',
      options: ['Alpha', 'Beta', 'Gamma', 'Visible light'],
      correctAnswer: 2,
      explanation: 'Gamma rays are highly penetrating electromagnetic waves; alpha is the least penetrating.',
      difficulty: 'easy',
      points: 12
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'What does half-life describe?',
      options: [
        'Time for all atoms to decay',
        'Time for half of a sample to decay',
        'Time until radiation is harmless',
        'Time to double activity'
      ],
      correctAnswer: 1,
      explanation: 'Half-life is the predictable time for 50% of a radioactive sample to decay.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      question: 'Which health effect is linked to high acute radiation dose?',
      options: ['Sunburn', 'Acute radiation syndrome', 'Common cold', 'Allergy'],
      correctAnswer: 1,
      explanation: 'A large, short-term dose can cause acute radiation syndrome; lower doses spread over time generally do not.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q4',
      type: 'true_false',
      question: 'Radiation from a medical X-ray makes you radioactive afterward.',
      options: ['True', 'False'],
      correctAnswer: 1,
      explanation: 'Diagnostic X-rays pass through the body; they do not leave you radioactive.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'Which everyday source contributes the most natural background dose for most people?',
      options: ['Cosmic rays', 'Radon gas', 'Food potassium-40', 'Air travel'],
      correctAnswer: 1,
      explanation: 'Radon gas from the ground is usually the largest contributor to natural background dose.',
      difficulty: 'medium',
      points: 14
    }
  ]
};

export default radiationEffectsQuiz;
