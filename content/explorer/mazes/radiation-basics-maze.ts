import { AtomMazeChallenge, Monster } from '../types';

// Define monsters for this maze
const protonProwler: Monster = {
  id: 'proton-prowler',
  name: 'Proton Prowler',
  element: 'atomic',
  maxHp: 45,
  attackPower: 12,
  sprite: '⚛️',
  color: '#3b82f6',
  defeatMessage: 'The Proton Prowler has been atomized!',
};

const isotopeImp: Monster = {
  id: 'isotope-imp',
  name: 'Isotope Imp',
  element: 'nuclear',
  maxHp: 50,
  attackPower: 15,
  sprite: '🔵',
  color: '#8b5cf6',
  defeatMessage: 'The Isotope Imp has decayed away!',
};

const cosmicCrawler: Monster = {
  id: 'cosmic-crawler',
  name: 'Cosmic Crawler',
  element: 'radiation',
  maxHp: 55,
  attackPower: 18,
  sprite: '🌌',
  color: '#9b59b6',
  defeatMessage: 'The Cosmic Crawler returns to space!',
};

const alphaAssassin: Monster = {
  id: 'alpha-assassin',
  name: 'Alpha Assassin',
  element: 'fission',
  maxHp: 50,
  attackPower: 16,
  sprite: 'α',
  color: '#10b981',
  defeatMessage: 'The Alpha Assassin has been blocked!',
};

const halfLifeHunter: Monster = {
  id: 'half-life-hunter',
  name: 'Half-Life Hunter',
  element: 'nuclear',
  maxHp: 60,
  attackPower: 20,
  sprite: '⏳',
  color: '#f59e0b',
  defeatMessage: 'The Half-Life Hunter has finally decayed!',
};

// Boss monster
const radiationLord: Monster = {
  id: 'radiation-lord',
  name: 'Radiation Lord',
  element: 'radiation',
  maxHp: 90,
  attackPower: 22,
  sprite: '☢️',
  color: '#e94560',
  defeatMessage: 'The Radiation Lord bows to your atomic knowledge!',
  isBoss: true,
};

export const radiationBasicsMaze: AtomMazeChallenge = {
  id: 'radiation-basics-maze',
  title: 'Radiation Discovery Maze',
  description: 'Battle through radiation fundamentals! Defeat monsters by mastering the basics of atoms, isotopes, and radiation types.',
  theme: 'Radiation Fundamentals Adventure',
  xpReward: 200,
  playerMaxHp: 100,
  boss: radiationLord,
  rooms: [
    {
      id: 'room-1',
      title: 'Entrance: What is Radiation?',
      description: 'A Proton Prowler guards the entrance!',
      monster: protonProwler,
      damagePerCorrect: 23,
      explanation: 'The number of protons (atomic number) determines the element. Carbon always has 6 protons, oxygen has 8, uranium has 92.',
      questions: [
        {
          type: 'quiz',
          question: 'What particle in an atom determines which element it is?',
          options: [
            'Neutrons',
            'Protons',
            'Electrons',
            'Quarks',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Positively charged particles in the nucleus:',
          answer: 'PROTONS',
          hint: 'Determines the atomic number',
        },
      ],
      nextRoomId: 'room-2',
    },
    {
      id: 'room-2',
      title: 'Corridor: Isotopes',
      description: 'The Isotope Imp blocks your path!',
      monster: isotopeImp,
      damagePerCorrect: 25,
      explanation: 'Isotopes are atoms of the same element (same protons) with different numbers of neutrons. Carbon-12 and Carbon-14 are both carbon but have different neutron counts.',
      questions: [
        {
          type: 'quiz',
          question: 'What are isotopes?',
          options: [
            'Atoms with different numbers of protons',
            'Atoms with different numbers of neutrons',
            'Atoms with different numbers of electrons',
            'Atoms from different elements',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Same element, different mass versions:',
          answer: 'ISOTOPES',
          hint: 'Carbon-12 and Carbon-14 are examples',
        },
      ],
      nextRoomId: 'room-3',
    },
    {
      id: 'room-3',
      title: 'Chamber: Natural Radiation',
      description: 'A Cosmic Crawler descends from above!',
      monster: cosmicCrawler,
      damagePerCorrect: 28,
      explanation: 'Natural radiation comes from cosmic rays, radon gas, radioactive materials in the Earth\'s crust, and even from food (like bananas containing potassium-40).',
      questions: [
        {
          type: 'quiz',
          question: 'Which of these is a natural source of radiation?',
          options: [
            'Only nuclear power plants',
            'Only medical X-rays',
            'Cosmic rays from space and radon gas',
            'Only man-made sources',
          ],
          correctAnswer: 2,
        },
        {
          type: 'scramble',
          question: 'Radioactive gas found in some homes:',
          answer: 'RADON',
          hint: 'Colorless and odorless',
        },
      ],
      nextRoomId: 'room-4',
    },
    {
      id: 'room-4',
      title: 'Hallway: Radiation Types',
      description: 'The Alpha Assassin attacks!',
      monster: alphaAssassin,
      damagePerCorrect: 25,
      explanation: 'Alpha particles are the least penetrating form of radiation and can be stopped by a sheet of paper or even the outer layer of skin.',
      questions: [
        {
          type: 'quiz',
          question: 'Which type of radiation can be stopped by a sheet of paper?',
          options: [
            'Alpha particles',
            'Beta particles',
            'Gamma rays',
            'X-rays',
          ],
          correctAnswer: 0,
        },
        {
          type: 'scramble',
          question: 'Most penetrating type of radiation:',
          answer: 'GAMMA',
          hint: 'Requires thick lead or concrete to block',
        },
      ],
      nextRoomId: 'room-5',
    },
    {
      id: 'room-5',
      title: 'Final Chamber: Half-Life',
      description: 'The Half-Life Hunter stands in your way!',
      monster: halfLifeHunter,
      damagePerCorrect: 30,
      explanation: 'Carbon-14 is radioactive and decays at a predictable rate (half-life of 5,730 years). By measuring how much C-14 remains, we can determine how long ago an organism died.',
      questions: [
        {
          type: 'quiz',
          question: 'Carbon-14 is used in carbon dating. Why does it work?',
          options: [
            'C-14 is stable forever',
            'C-14 decays at a predictable rate (half-life)',
            'C-14 glows in the dark',
            'C-14 is magnetic',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Time for half of radioactive atoms to decay:',
          answer: 'HALFLIFE',
          hint: 'Different for each isotope',
        },
      ],
    },
  ],
};

export default radiationBasicsMaze;

