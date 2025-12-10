import { Quiz } from '../types';

export const sustainabilityQuiz: Quiz = {
  id: 'sustainability-quiz',
  title: 'Sustainability & Waste',
  description: 'Gauge your grasp of nuclear energy’s environmental footprint and waste.',
  category: 'sustainability',
  difficulty: 'medium',
  passingScore: 70,
  xpReward: 80,
  timeLimit: 420,
  tags: ['environment', 'waste', 'carbon', 'unit9'],

  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Compared to coal, nuclear power emits how much CO₂ during operation?',
      options: ['More', 'About the same', 'Less (near-zero operational emissions)', 'Unknown'],
      correctAnswer: 2,
      explanation: 'Nuclear plants have very low operational CO₂ emissions compared to fossil plants.',
      difficulty: 'easy',
      points: 12
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'What is the typical strategy for managing used nuclear fuel initially?',
      options: ['Open burning', 'Deep ocean dumping', 'On-site pool cooling then dry cask storage', 'Immediate reprocessing only'],
      correctAnswer: 2,
      explanation: 'Fuel is cooled in spent fuel pools, then often moved to robust dry cask storage.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      question: 'Why is high energy density of nuclear fuel an environmental benefit?',
      options: ['It reduces transmission losses', 'It means far less fuel volume and mining per kWh', 'It eliminates all waste', 'It increases ash production'],
      correctAnswer: 1,
      explanation: 'High energy density means small fuel amounts produce large energy, reducing mining and material throughput.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q4',
      type: 'true_false',
      question: 'Long-lived nuclear waste cannot be contained safely.',
      options: ['True', 'False'],
      correctAnswer: 1,
      explanation: 'Engineered barriers, dry casks, and deep geological repositories are designed to safely isolate long-lived waste.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'Which pairing best shows nuclear’s role in clean grids?',
      options: ['Intermittent baseload', 'Firm low-carbon generation', 'High-emission peaker', 'Zero capacity factor'],
      correctAnswer: 1,
      explanation: 'Nuclear provides firm, dispatchable low-carbon power that complements variable renewables.',
      difficulty: 'medium',
      points: 14
    }
  ]
};

export default sustainabilityQuiz;
