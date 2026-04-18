import { AtomMazeChallenge, Monster } from "../types";

// Define monsters for this maze
const curieGhost: Monster = {
  id: "curie-ghost",
  name: "Curie's Ghost",
  element: "radiation",
  maxHp: 50,
  attackPower: 14,
  sprite: "👻",
  color: "#9b59b6",
  defeatMessage: "The Ghost honors your knowledge of radioactivity!",
};

const rutherfordRobot: Monster = {
  id: "rutherford-robot",
  name: "Rutherford's Robot",
  element: "atomic",
  maxHp: 55,
  attackPower: 16,
  sprite: "🤖",
  color: "#3b82f6",
  defeatMessage: "The Robot acknowledges your atomic wisdom!",
};

const fissionFiend: Monster = {
  id: "fission-fiend",
  name: "Fission Fiend",
  element: "fission",
  maxHp: 60,
  attackPower: 18,
  sprite: "💥",
  color: "#ef4444",
  defeatMessage: "The Fission Fiend splits apart in defeat!",
};

const reactorRex: Monster = {
  id: "reactor-rex",
  name: "Reactor Rex",
  element: "nuclear",
  maxHp: 65,
  attackPower: 20,
  sprite: "🦖",
  color: "#10b981",
  defeatMessage: "Reactor Rex powers down!",
};

const modernMenace: Monster = {
  id: "modern-menace",
  name: "Modern Menace",
  element: "plasma",
  maxHp: 70,
  attackPower: 22,
  sprite: "⚡",
  color: "#f59e0b",
  defeatMessage: "The Modern Menace fades into history!",
};

// Boss monster
const historyKing: Monster = {
  id: "history-king",
  name: "Nuclear History King",
  element: "nuclear",
  maxHp: 110,
  attackPower: 25,
  sprite: "👑",
  color: "#e94560",
  defeatMessage: "The History King crowns you as a nuclear scholar!",
  isBoss: true,
};

export const nuclearHistoryMaze: AtomMazeChallenge = {
  id: "nuclear-history-maze",
  title: "Nuclear History Quest",
  description:
    "Battle through the history of nuclear science! Defeat monsters by answering questions about key discoveries and milestones.",
  theme: "Historical Nuclear Adventure",
  xpReward: 300,
  playerMaxHp: 100,
  boss: historyKing,
  rooms: [
    {
      id: "room-1",
      title: "Entrance: Early Discoveries",
      description: "Curie's Ghost appears from the past!",
      monster: curieGhost,
      damagePerCorrect: 25,
      explanation:
        "He found it accidentally while studying uranium salts. Becquerel noticed that these materials could expose photographic plates even without sunlight, which led him to realize that the energy was coming from the uranium itself—this phenomenon is what we now call radioactivity.",
      questions: [
        {
          type: "quiz",
          question: "Who discovered radioactivity?",
          options: [
            "Albert Einstein",
            "Henri Becquerel",
            "Ernest Rutherford",
            "Niels Bohr",
          ],
          correctAnswer: 1,
        },
        {
          type: "scramble",
          question: "The scientist who discovered radioactivity (last name):",
          answer: "BECQUEREL",
          hint: "French physicist",
        },
      ],
      nextRoomId: "room-2",
    },
    {
      id: "room-2",
      title: "Corridor: Atomic Structure",
      description: "Rutherford's Robot guards this path!",
      monster: rutherfordRobot,
      damagePerCorrect: 28,
      explanation:
        "Rutherford's experiment showed that atoms have a small, dense, positively charged nucleus, with most of the atom being empty space.",
      questions: [
        {
          type: "quiz",
          question:
            "What did Ernest Rutherford's gold foil experiment discover?",
          options: [
            "Atoms are solid spheres",
            "Atoms have a dense nucleus",
            "Electrons orbit in perfect circles",
            "Atoms don't exist",
          ],
          correctAnswer: 1,
        },
        {
          type: "scramble",
          question: "The center of an atom:",
          answer: "NUCLEUS",
          hint: "Contains protons and neutrons",
        },
      ],
      nextRoomId: "room-3",
    },
    {
      id: "room-3",
      title: "Chamber: Nuclear Fission",
      description: "The Fission Fiend blocks your way!",
      monster: fissionFiend,
      damagePerCorrect: 30,
      explanation:
        "Nuclear fission was discovered in 1938 by Otto Hahn and Fritz Strassmann, with theoretical explanation by Lise Meitner and Otto Frisch.",
      questions: [
        {
          type: "quiz",
          question: "When was nuclear fission first discovered?",
          options: ["1898", "1938", "1945", "1954"],
          correctAnswer: 1,
        },
        {
          type: "scramble",
          question: "Splitting of an atomic nucleus:",
          answer: "FISSION",
          hint: "Releases enormous energy",
        },
      ],
      nextRoomId: "room-4",
    },
    {
      id: "room-4",
      title: "Hallway: First Reactor",
      description: "Reactor Rex roars with power!",
      monster: reactorRex,
      damagePerCorrect: 33,
      explanation:
        "The first controlled nuclear chain reaction was achieved on December 2, 1942, at the University of Chicago under the direction of Enrico Fermi.",
      questions: [
        {
          type: "quiz",
          question:
            "Where was the first controlled nuclear chain reaction achieved?",
          options: [
            "Los Alamos, New Mexico",
            "Chicago, Illinois",
            "Oak Ridge, Tennessee",
            "Hanford, Washington",
          ],
          correctAnswer: 1,
        },
        {
          type: "scramble",
          question: "Italian physicist who led the first reactor (last name):",
          answer: "FERMI",
          hint: "Won Nobel Prize in 1938",
        },
      ],
      nextRoomId: "room-5",
    },
    {
      id: "room-5",
      title: "Final Chamber: Modern Era",
      description: "The Modern Menace challenges you!",
      monster: modernMenace,
      damagePerCorrect: 35,
      explanation:
        "The International Atomic Energy Agency (IAEA) promotes the peaceful use of nuclear energy and works to prevent nuclear weapons proliferation.",
      questions: [
        {
          type: "quiz",
          question:
            "What organization promotes the peaceful use of nuclear energy?",
          options: ["UNSCEAR", "IAEA", "NEA", "WHO"],
          correctAnswer: 1,
        },
        {
          type: "scramble",
          question: "UN agency for atomic energy (abbreviation):",
          answer: "IAEA",
          hint: "Based in Vienna",
        },
      ],
    },
  ],
};

export default nuclearHistoryMaze;
