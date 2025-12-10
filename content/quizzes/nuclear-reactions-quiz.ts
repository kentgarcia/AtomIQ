import { Quiz } from '../types';

export const nuclearReactionsQuiz: Quiz = {
  id: 'nuclear-reactions-quiz',
  title: 'Nuclear Reactions Checkpoint',
  description: 'Review fission, fusion, and radioactive decay before wrapping up Unit 2.',
  category: 'nuclear-reactions',
  difficulty: 'medium',
  passingScore: 70,
  xpReward: 90,
  timeLimit: 420,
  tags: ['fission', 'fusion', 'decay', 'unit2'],

  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'What is the key difference between fission and fusion?',
      options: [
        'Fission splits heavy nuclei; fusion joins light nuclei',
        'Fission joins light nuclei; fusion splits heavy nuclei',
        'Both split heavy nuclei',
        'Both join light nuclei'
      ],
      correctAnswer: 0,
      explanation: 'Fission splits heavy nuclei like U-235, releasing energy and neutrons. Fusion joins light nuclei like hydrogen isotopes, releasing even more energy per reaction.',
      difficulty: 'easy',
      points: 12
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'Why can a power reactor not explode like a nuclear bomb?',
      options: [
        'Reactor fuel is not enriched enough and the design keeps the chain reaction controlled',
        'Reactors have no neutrons',
        'Reactors do not use uranium',
        'Reactors operate in a vacuum'
      ],
      correctAnswer: 0,
      explanation: 'Reactor fuel is only a few percent enriched and is moderated and controlled by control rods and coolant. Bombs need very high enrichment and a rapid, uncontrolled supercritical assembly.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      question: 'What do control rods do in a fission reactor?',
      options: [
        'Create more fuel',
        'Absorb neutrons to regulate the chain reaction',
        'Increase coolant flow',
        'Speed up fission with heat'
      ],
      correctAnswer: 1,
      explanation: 'Control rods made from materials like boron or cadmium absorb excess neutrons, keeping the reactor at a steady, critical state.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q4',
      type: 'multiple_choice',
      question: 'Which challenge makes fusion hard to achieve on Earth?',
      options: [
        'Lack of hydrogen fuel',
        'Need to overcome the repulsion between positively charged nuclei',
        'Fusion produces no energy',
        'Fusion requires enriched uranium'
      ],
      correctAnswer: 1,
      explanation: 'Positively charged nuclei repel each other. Fusion needs extremely high temperatures and/or pressures plus good confinement to push them close enough to fuse.',
      difficulty: 'medium',
      points: 14
    },
    {
      id: 'q5',
      type: 'true_false',
      question: 'Gamma decay changes an element into a different element.',
      options: ['True', 'False'],
      correctAnswer: 1,
      explanation: 'Gamma decay only releases energy as photons. It leaves the proton and neutron counts unchanged, so the element stays the same.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q6',
      type: 'multiple_choice',
      question: 'What does a half-life describe?',
      options: [
        'Time for all radioactive atoms to decay',
        'Time for half of a radioactive sample to decay',
        'Time for radiation to become dangerous',
        'Time for a reactor to reach full power'
      ],
      correctAnswer: 1,
      explanation: 'Half-life is the predictable time it takes for half of the radioactive nuclei in a sample to decay.',
      difficulty: 'easy',
      points: 10
    },
    {
      id: 'q7',
      type: 'multiple_choice',
      question: 'Which reaction powers the Sun?',
      options: [
        'Uranium-235 fission',
        'Hydrogen fusion',
        'Plutonium fission',
        'Alpha decay'
      ],
      correctAnswer: 1,
      explanation: 'The Sun and all stars shine because of hydrogen fusion—mainly the fusion of hydrogen nuclei into helium.',
      difficulty: 'easy',
      points: 10
    }
  ]
};

export default nuclearReactionsQuiz;
