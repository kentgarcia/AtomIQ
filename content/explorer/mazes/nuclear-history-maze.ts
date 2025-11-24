import { AtomMazeChallenge } from '../types';

export const nuclearHistoryMaze: AtomMazeChallenge = {
  id: 'nuclear-history-maze',
  title: 'Nuclear History Quest',
  description: 'Journey through the history of nuclear science. Answer questions about key discoveries and milestones!',
  theme: 'Historical Nuclear Adventure',
  xpReward: 300,
  timeLimit: 600, // 10 minutes
  rooms: [
    {
      id: 'room-1',
      title: 'Entrance: Early Discoveries',
      description: 'Start your historical journey through nuclear science!',
      question: {
        id: 'q1',
        question: 'Who discovered radioactivity?',
        options: [
          'Albert Einstein',
          'Marie Curie',
          'Ernest Rutherford',
          'Niels Bohr',
        ],
        correctAnswer: 1,
        explanation: 'Marie Curie, along with her husband Pierre, discovered radioactivity in 1898. She won Nobel Prizes in both Physics and Chemistry for her work.',
        points: 15,
      },
      nextRoomId: 'room-2',
    },
    {
      id: 'room-2',
      title: 'Corridor: Atomic Structure',
      description: 'Explore the development of atomic theory.',
      question: {
        id: 'q2',
        question: 'What did Ernest Rutherford\'s gold foil experiment discover?',
        options: [
          'Atoms are solid spheres',
          'Atoms have a dense nucleus',
          'Electrons orbit in perfect circles',
          'Atoms don\'t exist',
        ],
        correctAnswer: 1,
        explanation: 'Rutherford\'s experiment showed that atoms have a small, dense, positively charged nucleus, with most of the atom being empty space.',
        points: 20,
      },
      nextRoomId: 'room-3',
      alternativePathId: 'room-2b',
    },
    {
      id: 'room-2b',
      title: 'Alternative Path: Nuclear Fission',
      description: 'Take a different route through nuclear history.',
      question: {
        id: 'q2b',
        question: 'When was nuclear fission first discovered?',
        options: [
          '1898',
          '1938',
          '1945',
          '1954',
        ],
        correctAnswer: 1,
        explanation: 'Nuclear fission was discovered in 1938 by Otto Hahn and Fritz Strassmann, with theoretical explanation by Lise Meitner and Otto Frisch.',
        points: 20,
      },
      nextRoomId: 'room-3',
    },
    {
      id: 'room-3',
      title: 'Chamber: First Reactor',
      description: 'Learn about the first controlled nuclear chain reaction.',
      question: {
        id: 'q3',
        question: 'Where was the first controlled nuclear chain reaction achieved?',
        options: [
          'Los Alamos, New Mexico',
          'Chicago, Illinois',
          'Oak Ridge, Tennessee',
          'Hanford, Washington',
        ],
        correctAnswer: 1,
        explanation: 'The first controlled nuclear chain reaction was achieved on December 2, 1942, at the University of Chicago under the direction of Enrico Fermi.',
        points: 25,
      },
      nextRoomId: 'room-4',
    },
    {
      id: 'room-4',
      title: 'Hallway: Nuclear Power',
      description: 'Discover the birth of nuclear power generation.',
      question: {
        id: 'q4',
        question: 'When did the first commercial nuclear power plant begin operation?',
        options: [
          '1951',
          '1954',
          '1957',
          '1960',
        ],
        correctAnswer: 2,
        explanation: 'The first commercial nuclear power plant began operation in 1957 at Shippingport, Pennsylvania, USA.',
        points: 20,
      },
      nextRoomId: 'room-5',
    },
    {
      id: 'room-5',
      title: 'Final Chamber: Modern Era',
      description: 'Complete your historical journey!',
      question: {
        id: 'q5',
        question: 'What organization promotes the peaceful use of nuclear energy?',
        options: [
          'UNSCEAR',
          'IAEA',
          'NEA',
          'WHO',
        ],
        correctAnswer: 1,
        explanation: 'The International Atomic Energy Agency (IAEA) promotes the peaceful use of nuclear energy and works to prevent nuclear weapons proliferation.',
        points: 30,
      },
    },
  ],
};

export default nuclearHistoryMaze;

