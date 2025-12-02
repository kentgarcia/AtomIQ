import { AtomMazeChallenge, Monster } from '../types';

// Define monsters for this maze
const uraniumUrchin: Monster = {
  id: 'uranium-urchin',
  name: 'Uranium Urchin',
  element: 'nuclear',
  maxHp: 55,
  attackPower: 16,
  sprite: '🌕',
  color: '#22c55e',
  defeatMessage: 'The Uranium Urchin goes subcritical!',
};

const chainChomper: Monster = {
  id: 'chain-chomper',
  name: 'Chain Chomper',
  element: 'fission',
  maxHp: 60,
  attackPower: 18,
  sprite: '⛓️',
  color: '#ef4444',
  defeatMessage: 'The Chain Chomper\'s reaction is controlled!',
};

const pressurePython: Monster = {
  id: 'pressure-python',
  name: 'Pressure Python',
  element: 'plasma',
  maxHp: 65,
  attackPower: 20,
  sprite: '🐍',
  color: '#8b5cf6',
  defeatMessage: 'The Pressure Python releases its steam!',
};

const coolantCrawler: Monster = {
  id: 'coolant-crawler',
  name: 'Coolant Crawler',
  element: 'atomic',
  maxHp: 60,
  attackPower: 18,
  sprite: '💧',
  color: '#3b82f6',
  defeatMessage: 'The Coolant Crawler evaporates!',
};

const fuelFiend: Monster = {
  id: 'fuel-fiend',
  name: 'Fuel Fiend',
  element: 'nuclear',
  maxHp: 70,
  attackPower: 22,
  sprite: '🔋',
  color: '#f59e0b',
  defeatMessage: 'The Fuel Fiend is spent!',
};

const safetySergeant: Monster = {
  id: 'safety-sergeant',
  name: 'Safety Sergeant',
  element: 'radiation',
  maxHp: 75,
  attackPower: 24,
  sprite: '🚨',
  color: '#10b981',
  defeatMessage: 'The Safety Sergeant stands down!',
};

// Boss monster
const reactorOverlord: Monster = {
  id: 'reactor-overlord',
  name: 'Reactor Overlord',
  element: 'fusion',
  maxHp: 120,
  attackPower: 28,
  sprite: '⚡',
  color: '#e94560',
  defeatMessage: 'The Reactor Overlord powers down! You are a true nuclear engineer!',
  isBoss: true,
};

export const reactorTechMaze: AtomMazeChallenge = {
  id: 'reactor-tech-maze',
  title: 'Reactor Technology Challenge',
  description: 'Battle through reactor technology! Defeat monsters by mastering how nuclear reactors work, from fuel to safety systems.',
  theme: 'Reactor Technology Adventure',
  xpReward: 350,
  playerMaxHp: 100,
  boss: reactorOverlord,
  rooms: [
    {
      id: 'room-1',
      title: 'Entrance: Reactor Basics',
      description: 'A Uranium Urchin emerges from the fuel rods!',
      monster: uraniumUrchin,
      damagePerCorrect: 28,
      explanation: 'Uranium-235 is the primary fissile isotope used in most nuclear reactors. It can sustain a nuclear chain reaction.',
      questions: [
        {
          type: 'quiz',
          question: 'What is the primary fuel used in most nuclear reactors?',
          options: [
            'Plutonium',
            'Uranium-235',
            'Thorium',
            'Deuterium',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Main element used as reactor fuel:',
          answer: 'URANIUM',
          hint: 'Element number 92',
        },
      ],
      nextRoomId: 'room-2',
    },
    {
      id: 'room-2',
      title: 'Corridor: Chain Reaction',
      description: 'The Chain Chomper attacks!',
      monster: chainChomper,
      damagePerCorrect: 30,
      explanation: 'When U-235 splits (fission), it releases energy and 2-3 neutrons. These neutrons can then cause other U-235 nuclei to split, creating a chain reaction.',
      questions: [
        {
          type: 'quiz',
          question: 'What happens when a uranium-235 nucleus splits?',
          options: [
            'It releases only energy',
            'It releases energy and neutrons',
            'It releases only neutrons',
            'It releases gamma rays only',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Self-sustaining nuclear process:',
          answer: 'CHAIN',
          hint: 'One reaction triggers another',
        },
      ],
      nextRoomId: 'room-3',
    },
    {
      id: 'room-3',
      title: 'Chamber: Reactor Types',
      description: 'The Pressure Python coils around the room!',
      monster: pressurePython,
      damagePerCorrect: 33,
      explanation: 'Pressurized Water Reactors (PWRs) are the most common type, accounting for about two-thirds of all nuclear reactors worldwide.',
      questions: [
        {
          type: 'quiz',
          question: 'What is the most common type of nuclear reactor worldwide?',
          options: [
            'Boiling Water Reactor (BWR)',
            'Pressurized Water Reactor (PWR)',
            'Fast Breeder Reactor',
            'Molten Salt Reactor',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Most common reactor type (abbreviation):',
          answer: 'PWR',
          hint: 'Uses pressurized water',
        },
      ],
      nextRoomId: 'room-4',
    },
    {
      id: 'room-4',
      title: 'Hallway: Cooling Systems',
      description: 'A Coolant Crawler emerges from the pipes!',
      monster: coolantCrawler,
      damagePerCorrect: 30,
      explanation: 'Cooling systems remove the immense heat generated by nuclear fission and transfer it to create steam that drives turbines to generate electricity.',
      questions: [
        {
          type: 'quiz',
          question: 'Why do nuclear reactors need cooling systems?',
          options: [
            'To prevent the fuel from freezing',
            'To remove heat generated by fission',
            'To create steam for electricity',
            'Both B and C',
          ],
          correctAnswer: 3,
        },
        {
          type: 'scramble',
          question: 'Liquid used to remove heat from reactor:',
          answer: 'COOLANT',
          hint: 'Usually water',
        },
      ],
      nextRoomId: 'room-5',
    },
    {
      id: 'room-5',
      title: 'Chamber: Fuel Cycle',
      description: 'The Fuel Fiend blocks your path!',
      monster: fuelFiend,
      damagePerCorrect: 35,
      explanation: 'Reactor fuel is typically enriched to 3-5% U-235. Natural uranium contains only 0.7% U-235, while weapons-grade requires 90%+ enrichment.',
      questions: [
        {
          type: 'quiz',
          question: 'What percentage of uranium-235 is typically found in reactor fuel?',
          options: [
            '0.7% (natural)',
            '3-5% (enriched)',
            '20% (highly enriched)',
            '90%+ (weapons-grade)',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Process of increasing U-235 concentration:',
          answer: 'ENRICHMENT',
          hint: 'Makes uranium more reactive',
        },
      ],
      nextRoomId: 'room-6',
    },
    {
      id: 'room-6',
      title: 'Final Chamber: Reactor Safety',
      description: 'The Safety Sergeant stands guard!',
      monster: safetySergeant,
      damagePerCorrect: 38,
      explanation: 'Emergency core cooling systems are designed to inject cooling water into the reactor core if normal cooling is lost, preventing core damage.',
      questions: [
        {
          type: 'quiz',
          question: 'What is the purpose of a reactor\'s emergency core cooling system?',
          options: [
            'To speed up the reaction',
            'To cool the reactor core in emergency situations',
            'To generate extra power',
            'To store spent fuel',
          ],
          correctAnswer: 1,
        },
        {
          type: 'scramble',
          question: 'Abbreviation for Emergency Core Cooling System:',
          answer: 'ECCS',
          hint: 'Four letters',
        },
      ],
    },
  ],
};

export default reactorTechMaze;

