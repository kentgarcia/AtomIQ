import { AtomMazeChallenge } from '../types';

export const radiationBasicsMaze: AtomMazeChallenge = {
  id: 'radiation-basics-maze',
  title: 'Radiation Discovery Maze',
  description: 'Explore the fundamentals of radiation through challenging questions. Master the basics to unlock new paths!',
  theme: 'Radiation Fundamentals Adventure',
  xpReward: 200,
  timeLimit: 480, // 8 minutes
  rooms: [
    {
      id: 'room-1',
      title: 'Entrance: What is Radiation?',
      description: 'Begin your journey into the world of radiation!',
      question: {
        id: 'q1',
        question: 'What particle in an atom determines which element it is?',
        options: [
          'Neutrons',
          'Protons',
          'Electrons',
          'Quarks',
        ],
        correctAnswer: 1,
        explanation: 'The number of protons (atomic number) determines the element. Carbon always has 6 protons, oxygen has 8, uranium has 92.',
        points: 10,
      },
      nextRoomId: 'room-2',
    },
    {
      id: 'room-2',
      title: 'Corridor: Isotopes',
      description: 'Learn about isotopes and their properties.',
      question: {
        id: 'q2',
        question: 'What are isotopes?',
        options: [
          'Atoms with different numbers of protons',
          'Atoms with different numbers of neutrons',
          'Atoms with different numbers of electrons',
          'Atoms from different elements',
        ],
        correctAnswer: 1,
        explanation: 'Isotopes are atoms of the same element (same protons) with different numbers of neutrons. Carbon-12 and Carbon-14 are both carbon but have different neutron counts.',
        points: 15,
      },
      nextRoomId: 'room-3',
    },
    {
      id: 'room-3',
      title: 'Chamber: Natural Radiation',
      description: 'Discover where radiation comes from naturally.',
      question: {
        id: 'q3',
        question: 'Which of these is a natural source of radiation?',
        options: [
          'Only nuclear power plants',
          'Only medical X-rays',
          'Cosmic rays from space and radon gas',
          'Only man-made sources',
        ],
        correctAnswer: 2,
        explanation: 'Natural radiation comes from cosmic rays, radon gas, radioactive materials in the Earth\'s crust, and even from food (like bananas containing potassium-40).',
        points: 20,
      },
      nextRoomId: 'room-4',
    },
    {
      id: 'room-4',
      title: 'Hallway: Radiation Types',
      description: 'Understand different types of radiation.',
      question: {
        id: 'q4',
        question: 'Which type of radiation can be stopped by a sheet of paper?',
        options: [
          'Alpha particles',
          'Beta particles',
          'Gamma rays',
          'X-rays',
        ],
        correctAnswer: 0,
        explanation: 'Alpha particles are the least penetrating form of radiation and can be stopped by a sheet of paper or even the outer layer of skin.',
        points: 15,
      },
      nextRoomId: 'room-5',
    },
    {
      id: 'room-5',
      title: 'Final Chamber: Half-Life',
      description: 'Master the concept of half-life to complete the maze!',
      question: {
        id: 'q5',
        question: 'Carbon-14 is used in carbon dating. Why does it work?',
        options: [
          'C-14 is stable forever',
          'C-14 decays at a predictable rate (half-life)',
          'C-14 glows in the dark',
          'C-14 is magnetic',
        ],
        correctAnswer: 1,
        explanation: 'Carbon-14 is radioactive and decays at a predictable rate (half-life of 5,730 years). By measuring how much C-14 remains, we can determine how long ago an organism died.',
        points: 25,
      },
    },
  ],
};

export default radiationBasicsMaze;

