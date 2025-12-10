import { Quiz } from '../types';

export const reactorMechanicsQuiz: Quiz = {
  id: 'reactor-mechanics-quiz',
  title: 'Reactor Mechanics Check',
  description: 'Confirm how reactors control fission and produce power.',
  category: 'reactor-mechanics',
  difficulty: 'medium',
  passingScore: 70,
  xpReward: 80,
  timeLimit: 420,
  tags: ['reactor', 'control-rods', 'cooling', 'unit8'],

  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'What do control rods primarily do?',
      options: ['Cool the core', 'Absorb neutrons to regulate the chain reaction', 'Enrich fuel', 'Start turbines'],
      correctAnswer: 1,
      explanation: 'Control rods absorb excess neutrons, keeping the reactor critical but controlled.',
      difficulty: 'easy',
      points: 12
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'Why is coolant flow important?',
      options: ['It powers the grid directly', 'It removes heat and transfers it to make steam', 'It enriches uranium', 'It stops radiation'],
      correctAnswer: 1,
      explanation: 'Coolant carries heat from the core to steam generators or turbines for electricity.',
      difficulty: 'easy',
      points: 12
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      question: 'Which design feature slows down neutrons in many reactors?',
      options: ['Moderator (like water or graphite)', 'Vacuum chamber', 'Solar panels', 'Concrete walls only'],
      correctAnswer: 0,
      explanation: 'Moderators slow neutrons to sustain a thermal fission chain reaction.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q4',
      type: 'true_false',
      question: 'Commercial power reactors use weapons-grade highly enriched uranium.',
      options: ['True', 'False'],
      correctAnswer: 1,
      explanation: 'Power reactors use low-enriched fuel (around 3–5% U-235), far below weapons levels.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'What starts the turbines to generate electricity?',
      options: ['Direct radiation', 'Steam produced from reactor heat', 'Magnetic fields alone', 'Battery banks'],
      correctAnswer: 1,
      explanation: 'Heat from fission boils water to steam, which spins turbines connected to generators.',
      difficulty: 'easy',
      points: 12
    }
  ]
};

export default reactorMechanicsQuiz;
