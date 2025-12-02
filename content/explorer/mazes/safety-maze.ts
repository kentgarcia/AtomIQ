import { AtomMazeChallenge, Monster } from '../types';

// Define monsters for this maze
const controlRodCreature: Monster = {
  id: 'control-rod-creature',
  name: 'Control Creeper',
  element: 'nuclear',
  maxHp: 50,
  attackPower: 15,
  sprite: '🔴',
  color: '#e94560',
  defeatMessage: 'The Control Creeper\'s chain reaction has been stopped!',
};

const containmentBeast: Monster = {
  id: 'containment-beast',
  name: 'Containment Beast',
  element: 'atomic',
  maxHp: 60,
  attackPower: 18,
  sprite: '🏗️',
  color: '#3b82f6',
  defeatMessage: 'The Containment Beast has been safely contained!',
};

const radiationPhantom: Monster = {
  id: 'radiation-phantom',
  name: 'Radiation Phantom',
  element: 'radiation',
  maxHp: 55,
  attackPower: 20,
  sprite: '☢️',
  color: '#9b59b6',
  defeatMessage: 'The Radiation Phantom fades away harmlessly!',
};

const emergencyGolem: Monster = {
  id: 'emergency-golem',
  name: 'Emergency Golem',
  element: 'fission',
  maxHp: 65,
  attackPower: 22,
  sprite: '🚨',
  color: '#10b981',
  defeatMessage: 'The Emergency Golem has been neutralized!',
};

// Boss monster
const safetyGuardian: Monster = {
  id: 'safety-guardian',
  name: 'Safety Guardian',
  element: 'nuclear',
  maxHp: 100,
  attackPower: 25,
  sprite: '🛡️',
  color: '#f59e0b',
  defeatMessage: 'The Safety Guardian bows to your nuclear knowledge!',
  isBoss: true,
};

export const safetyMaze: AtomMazeChallenge = {
  id: 'safety-maze',
  title: 'The Safety Labyrinth',
  description: 'Battle through nuclear safety challenges! Defeat monsters by answering questions about reactor safety, containment, and emergency procedures.',
  theme: 'Nuclear Safety Adventure',
  xpReward: 250,
  playerMaxHp: 100,
  boss: safetyGuardian,
  rooms: [
    {
      id: 'room-1',
      title: 'Entrance: Reactor Basics',
      description: 'A Control Creeper blocks your path!',
      monster: controlRodCreature,
      damagePerCorrect: 25,
      explanation: 'Control rods are made of materials that absorb neutrons. By inserting or withdrawing them, operators can control the rate of the nuclear chain reaction.',
      questions: [
        {
          type: 'quiz',
          question: 'What is the primary purpose of control rods in a nuclear reactor?',
          options: [
            'To generate electricity',
            'To absorb neutrons and control the reaction rate',
            'To cool the reactor core',
            'To store nuclear waste',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Control rods absorb these particles to slow reactions:',
          answer: 'NEUTRONS',
          hint: 'Subatomic particles with no charge',
        },
      ],
      nextRoomId: 'room-2',
    },
    {
      id: 'room-2',
      title: 'Corridor: Emergency Systems',
      description: 'The Containment Beast guards this passage!',
      monster: containmentBeast,
      damagePerCorrect: 30,
      explanation: 'Containment buildings are massive structures designed to prevent the release of radioactive materials even in the event of a severe accident.',
      questions: [
        {
          type: 'quiz',
          question: 'What is the purpose of a containment building?',
          options: [
            'To generate more power',
            'To contain radioactive materials in case of an accident',
            'To store fuel rods',
            'To cool the reactor',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'The thick concrete structure around a reactor:',
          answer: 'CONTAINMENT',
          hint: 'It keeps things inside',
        },
      ],
      nextRoomId: 'room-3',
    },
    {
      id: 'room-3',
      title: 'Chamber: Radiation Protection',
      description: 'A Radiation Phantom haunts this chamber!',
      monster: radiationPhantom,
      damagePerCorrect: 28,
      explanation: 'The three principles of radiation protection are: minimize time exposed, maximize distance from source, and use shielding materials.',
      questions: [
        {
          type: 'quiz',
          question: 'What are the three principles of radiation protection?',
          options: [
            'Time, distance, shielding',
            'Speed, power, control',
            'Heat, pressure, containment',
            'Fuel, rods, cooling',
          ],
          correctAnswer: 0,
        },
        {
          type: 'scramble',
          question: 'Material that blocks radiation:',
          answer: 'SHIELDING',
          hint: 'Lead is a common type',
        },
        {
          type: 'quiz',
          question: 'Which material is commonly used for radiation shielding?',
          options: [
            'Wood',
            'Plastic',
            'Lead',
            'Glass',
          ],
          correctAnswer: 2,
        },
      ],
      nextRoomId: 'room-4',
    },
    {
      id: 'room-4',
      title: 'Final Chamber: Emergency Response',
      description: 'The Emergency Golem awaits your challenge!',
      monster: emergencyGolem,
      damagePerCorrect: 33,
      explanation: 'Emergency response prioritizes protecting public health and safety through coordinated, measured responses based on the situation.',
      questions: [
        {
          type: 'quiz',
          question: 'What is the primary goal of emergency response at a nuclear facility?',
          options: [
            'To generate more power',
            'To protect public health and safety',
            'To shut down the reactor permanently',
            'To evacuate everyone immediately',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'International agency that sets nuclear safety standards:',
          answer: 'IAEA',
          hint: 'Based in Vienna, Austria',
        },
      ],
    },
  ],
};

export default safetyMaze;

