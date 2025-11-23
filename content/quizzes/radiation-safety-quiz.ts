import { Quiz } from '../types';

export const radiationSafetyQuiz: Quiz = {
  id: 'radiation-safety-quiz',
  title: 'Radiation Safety Basics',
  description: 'Test your knowledge of radiation safety and protection measures',
  category: 'safety',
  difficulty: 'easy',
  passingScore: 70,
  xpReward: 30,
  timeLimit: 300, // 5 minutes
  tags: ['safety', 'radiation', 'protection'],
  
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Which type of radiation can be stopped by a sheet of paper?',
      options: ['Alpha particles', 'Beta particles', 'Gamma rays', 'X-rays'],
      correctAnswer: 0,
      explanation: 'Alpha particles are the least penetrating form of radiation and can be stopped by a sheet of paper or even the outer layer of skin.',
      difficulty: 'easy',
      points: 10
    },
    
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'What is the primary purpose of control rods in a nuclear reactor?',
      options: [
        'To generate electricity',
        'To absorb neutrons and control the reaction rate',
        'To cool the reactor',
        'To produce more fuel'
      ],
      correctAnswer: 1,
      explanation: 'Control rods are made of neutron-absorbing materials like boron or cadmium. They regulate the nuclear chain reaction by absorbing neutrons.',
      difficulty: 'medium',
      points: 15
    },
    
    {
      id: 'q3',
      type: 'true_false',
      question: 'Nuclear power plants can explode like nuclear bombs.',
      options: ['True', 'False'],
      correctAnswer: 1,
      explanation: 'False. Nuclear power plants cannot explode like nuclear bombs. The fuel is not enriched enough, and the physics of the reactor design prevents such an explosion.',
      difficulty: 'easy',
      points: 10
    },
    
    {
      id: 'q4',
      type: 'multiple_choice',
      question: 'What is the half-life of a radioactive substance?',
      options: [
        'The time it takes to become completely safe',
        'The time it takes for half of the atoms to decay',
        'The time it takes to reach maximum radiation',
        'The time it takes to double in size'
      ],
      correctAnswer: 1,
      explanation: 'Half-life is the time required for half of the radioactive atoms in a sample to decay. After each half-life, the radioactivity is reduced by 50%.',
      difficulty: 'medium',
      points: 15,
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
    },
    
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'Which material is most commonly used for gamma radiation shielding?',
      options: ['Wood', 'Plastic', 'Lead', 'Aluminum'],
      correctAnswer: 2,
      explanation: 'Lead is the most common material for gamma radiation shielding due to its high density and atomic number, which effectively absorbs gamma rays.',
      difficulty: 'easy',
      points: 10
    },
    
    {
      id: 'q6',
      type: 'multiple_choice',
      question: 'What does ALARA stand for in radiation safety?',
      options: [
        'Always Leave After Radiation Alert',
        'As Low As Reasonably Achievable',
        'Automatic Level Adjustment for Radiation Activity',
        'Advanced Laboratory for Atomic Research Applications'
      ],
      correctAnswer: 1,
      explanation: 'ALARA (As Low As Reasonably Achievable) is a radiation safety principle that aims to minimize radiation exposure to the lowest practical level.',
      difficulty: 'hard',
      points: 20
    }
  ]
};

export default radiationSafetyQuiz;

