import { Quiz } from '../types';

export const safetySecurityQuiz: Quiz = {
  id: 'safety-security-quiz',
  title: 'Nuclear Safety & Security',
  description: 'Check your understanding of reactor safety systems and safeguards.',
  category: 'safety-security',
  difficulty: 'medium',
  passingScore: 70,
  xpReward: 90,
  timeLimit: 480,
  tags: ['safety', 'security', 'regulation', 'unit5'],

  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'What is the role of containment buildings?',
      options: ['Decorative', 'Amplify power', 'Provide a barrier to keep radioactivity inside', 'Store spent fuel'],
      correctAnswer: 2,
      explanation: 'Containment is a reinforced barrier to prevent radioactive releases.',
      difficulty: 'easy',
      points: 12
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'Which international agency sets safety standards and shares best practices?',
      options: ['UNICEF', 'IAEA', 'WHO', 'Interpol'],
      correctAnswer: 1,
      explanation: 'The IAEA develops safety standards and coordinates peer reviews among member states.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      question: 'What do physical protection systems guard against?',
      options: ['Cyber spam', 'Theft or sabotage of nuclear material and facilities', 'Weather changes', 'Marketing emails'],
      correctAnswer: 1,
      explanation: 'Security systems deter and detect theft or sabotage of nuclear material and assets.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q4',
      type: 'true_false',
      question: 'Defense-in-depth means relying on a single safety barrier.',
      options: ['True', 'False'],
      correctAnswer: 1,
      explanation: 'Defense-in-depth uses multiple redundant and diverse safety layers, not just one.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'Safeguards primarily aim to:',
      options: ['Improve plant efficiency', 'Verify nuclear material is not diverted to weapons', 'Reduce fuel costs', 'Increase reactor temperature'],
      correctAnswer: 1,
      explanation: 'IAEA safeguards include inspections and accounting to ensure peaceful use of nuclear material.',
      difficulty: 'medium',
      points: 14
    }
  ]
};

export default safetySecurityQuiz;
