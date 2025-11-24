import { AtomMazeChallenge } from '../types';

export const safetyMaze: AtomMazeChallenge = {
  id: 'safety-maze',
  title: 'The Safety Labyrinth',
  description: 'Navigate through a maze of nuclear safety questions. Each correct answer opens a new path forward!',
  theme: 'Nuclear Safety Adventure',
  xpReward: 250,
  timeLimit: 600, // 10 minutes
  rooms: [
    {
      id: 'room-1',
      title: 'Entrance: Reactor Basics',
      description: 'Welcome to the Safety Labyrinth! Your first challenge awaits.',
      question: {
        id: 'q1',
        question: 'What is the primary purpose of control rods in a nuclear reactor?',
        options: [
          'To generate electricity',
          'To absorb neutrons and control the reaction rate',
          'To cool the reactor core',
          'To store nuclear waste',
        ],
        correctAnswer: 1,
        explanation: 'Control rods are made of materials that absorb neutrons. By inserting or withdrawing them, operators can control the rate of the nuclear chain reaction.',
        points: 10,
      },
      nextRoomId: 'room-2',
    },
    {
      id: 'room-2',
      title: 'Corridor: Emergency Systems',
      description: 'You\'ve entered the emergency systems corridor. Choose wisely!',
      question: {
        id: 'q2',
        question: 'What is the purpose of a containment building?',
        options: [
          'To generate more power',
          'To contain radioactive materials in case of an accident',
          'To store fuel rods',
          'To cool the reactor',
        ],
        correctAnswer: 1,
        explanation: 'Containment buildings are massive structures designed to prevent the release of radioactive materials even in the event of a severe accident.',
        points: 15,
      },
      nextRoomId: 'room-3',
      alternativePathId: 'room-2b',
    },
    {
      id: 'room-2b',
      title: 'Alternative Path: Safety Culture',
      description: 'You took a different route. Learn about safety culture!',
      question: {
        id: 'q2b',
        question: 'What is defense-in-depth?',
        options: [
          'A single safety system',
          'Multiple layers of safety systems and procedures',
          'A type of reactor design',
          'An emergency protocol',
        ],
        correctAnswer: 1,
        explanation: 'Defense-in-depth uses multiple independent safety systems, so if one fails, others can still prevent accidents.',
        points: 15,
      },
      nextRoomId: 'room-3',
    },
    {
      id: 'room-3',
      title: 'Chamber: Radiation Protection',
      description: 'You\'ve reached the radiation protection chamber.',
      question: {
        id: 'q3',
        question: 'What are the three principles of radiation protection?',
        options: [
          'Time, distance, shielding',
          'Speed, power, control',
          'Heat, pressure, containment',
          'Fuel, rods, cooling',
        ],
        correctAnswer: 0,
        explanation: 'The three principles are: minimize time exposed, maximize distance from source, and use shielding materials.',
        points: 20,
      },
      nextRoomId: 'room-4',
    },
    {
      id: 'room-4',
      title: 'Final Chamber: Emergency Response',
      description: 'The final challenge! Prove your safety knowledge.',
      question: {
        id: 'q4',
        question: 'What is the primary goal of emergency response at a nuclear facility?',
        options: [
          'To generate more power',
          'To protect public health and safety',
          'To shut down the reactor permanently',
          'To evacuate everyone immediately',
        ],
        correctAnswer: 1,
        explanation: 'Emergency response prioritizes protecting public health and safety through coordinated, measured responses based on the situation.',
        points: 25,
      },
    },
  ],
};

export default safetyMaze;

