import { Quiz } from '../types';

export const everydayNuclearQuiz: Quiz = {
  id: 'everyday-nuclear-quiz',
  title: 'Nuclear in Everyday Life',
  description: 'See how nuclear tech shows up in health, food, and industry.',
  category: 'everyday-nuclear',
  difficulty: 'medium',
  passingScore: 70,
  xpReward: 80,
  timeLimit: 420,
  tags: ['medicine', 'industry', 'environment', 'unit4'],

  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Which medical use relies on radiation to image inside the body?',
      options: ['MRI', 'PET scan', 'Ultrasound', 'Stethoscope'],
      correctAnswer: 1,
      explanation: 'PET scans use positron-emitting tracers to produce detailed images.',
      difficulty: 'easy',
      points: 12
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'Food irradiation primarily helps with what?',
      options: ['Adding flavor', 'Preserving freshness by killing microbes', 'Cooking food', 'Changing color'],
      correctAnswer: 1,
      explanation: 'Irradiation kills bacteria and pests to improve safety and shelf life.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      question: 'Which industry use relies on gauging thickness with radiation?',
      options: ['Construction cranes', 'Paper/steel rolling mills', 'Text editing', 'Cloud storage'],
      correctAnswer: 1,
      explanation: 'Beta/gamma gauges measure material thickness in paper and steel production.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q4',
      type: 'true_false',
      question: 'Smoke detectors often use a tiny radioactive source to sense smoke.',
      options: ['True', 'False'],
      correctAnswer: 0,
      explanation: 'Ionization smoke detectors use a minute americium-241 source to detect smoke particles.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'What is a key environmental benefit of nuclear power?',
      options: ['Zero water use', 'Near-zero operational carbon emissions', 'Requires no mining', 'Runs without fuel'],
      correctAnswer: 1,
      explanation: 'Nuclear plants generate electricity with very low operational CO2 emissions.',
      difficulty: 'medium',
      points: 14
    }
  ]
};

export default everydayNuclearQuiz;
