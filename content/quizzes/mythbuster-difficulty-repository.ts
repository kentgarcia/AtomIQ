import { Myth, QuizQuestion } from "../types";

export type MythBusterQuizDifficulty = "easy" | "medium" | "hard";

export type MythBusterQuizRepository = Record<
  MythBusterQuizDifficulty,
  QuizQuestion[]
>;

export type MythBusterStatementSeed = Pick<
  Myth,
  "id" | "mythStatement" | "reality" | "explanation" | "category" | "difficulty"
>;

const easyMythBusterQuestions: QuizQuestion[] = [
  {
    id: "mb-easy-q1",
    type: "multiple_choice",
    question: "What is the smallest unit of matter?",
    options: ["Molecule", "Atom", "Cell", "Proton"],
    correctAnswer: 1,
    explanation:
      "An atom is the smallest unit of matter that retains chemical properties.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q2",
    type: "multiple_choice",
    question: "What is found at the center of an atom?",
    options: ["Electron", "Nucleus", "Shell", "Orbit"],
    correctAnswer: 1,
    explanation:
      "The nucleus is at the center of the atom and contains protons and neutrons.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q3",
    type: "multiple_choice",
    question: "Which particles are positively charged?",
    options: ["Electrons", "Neutrons", "Protons", "Photons"],
    correctAnswer: 2,
    explanation: "Protons carry a positive electric charge.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q4",
    type: "multiple_choice",
    question: "Which particles have no charge?",
    options: ["Electrons", "Protons", "Neutrons", "Ions"],
    correctAnswer: 2,
    explanation: "Neutrons are electrically neutral particles.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q5",
    type: "multiple_choice",
    question: "What do electrons do in an atom?",
    options: [
      "Stay in the nucleus",
      "Orbit the nucleus",
      "Combine with neutrons",
      "Form protons",
    ],
    correctAnswer: 1,
    explanation:
      "Electrons move around the nucleus in electron clouds/energy levels.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q6",
    type: "multiple_choice",
    question: "What determines the identity of an element?",
    options: [
      "Number of neutrons",
      "Number of protons",
      "Number of electrons",
      "Size of atom",
    ],
    correctAnswer: 1,
    explanation: "An element is defined by its number of protons.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q7",
    type: "multiple_choice",
    question: "What is the atomic number?",
    options: [
      "Number of neutrons",
      "Number of protons",
      "Number of electrons",
      "Total particles",
    ],
    correctAnswer: 1,
    explanation: "Atomic number equals the number of protons in the nucleus.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q8",
    type: "multiple_choice",
    question: "What is an isotope?",
    options: [
      "Atoms containing same number of protons, different number of neutrons",
      "Atoms containing same number of neutrons, different number of protons",
      "Atoms containing same number of electrons, different atoms",
      "Different atoms entirely",
    ],
    correctAnswer: 0,
    explanation:
      "Isotopes are atoms of the same element with different neutron counts.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q9",
    type: "multiple_choice",
    question: "What is radiation?",
    options: [
      "Solid matter",
      "Energy in motion",
      "Liquid substance",
      "Gas particle",
    ],
    correctAnswer: 1,
    explanation: "Radiation is energy traveling through space or a medium.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q10",
    type: "multiple_choice",
    question: "Which is a source of natural radiation?",
    options: ["Television", "Sun", "Refrigerator", "Phone"],
    correctAnswer: 1,
    explanation: "The sun is a natural source of radiation.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q11",
    type: "multiple_choice",
    question: "What type of radiation is a helium nucleus?",
    options: ["Beta", "Gamma", "Alpha", "X-ray"],
    correctAnswer: 2,
    explanation: "Alpha radiation consists of helium nuclei.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q12",
    type: "multiple_choice",
    question: "Which radiation can penetrate deeply?",
    options: ["Alpha", "Beta", "Gamma", "None"],
    correctAnswer: 2,
    explanation: "Gamma rays are highly penetrating electromagnetic radiation.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q13",
    type: "multiple_choice",
    question: "Which radiation is stopped by paper?",
    options: ["Alpha", "Beta", "Gamma", "X-ray"],
    correctAnswer: 0,
    explanation: "Alpha particles are easily stopped by paper or skin.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q14",
    type: "multiple_choice",
    question: "What is half-life?",
    options: [
      "Time to double energy",
      "Time for half to decay",
      "Time to disappear",
      "Time to grow",
    ],
    correctAnswer: 1,
    explanation:
      "Half-life is the time required for half of a radioactive sample to decay.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q15",
    type: "multiple_choice",
    question: "What is radioactive decay?",
    options: [
      "Growth of atoms",
      "Breaking of nucleus",
      "Formation of molecules",
      "Movement of electrons",
    ],
    correctAnswer: 1,
    explanation:
      "Radioactive decay is when an unstable nucleus changes and emits radiation.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q16",
    type: "multiple_choice",
    question: "What happens during nuclear fission?",
    options: [
      "Nucleus splits",
      "Nucleus combines",
      "Electrons move",
      "Atoms disappear",
    ],
    correctAnswer: 0,
    explanation:
      "Fission is the splitting of a heavy nucleus into smaller nuclei.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q17",
    type: "multiple_choice",
    question: "What happens during nuclear fusion?",
    options: [
      "Atoms break apart",
      "Nuclei combine",
      "Electrons merge",
      "Protons vanish",
    ],
    correctAnswer: 1,
    explanation: "Fusion combines light nuclei to form a heavier nucleus.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q18",
    type: "multiple_choice",
    question: "What is used as fuel in many nuclear reactors?",
    options: ["Coal", "Uranium", "Oil", "Wood"],
    correctAnswer: 1,
    explanation: "Many reactors use uranium as fuel.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q19",
    type: "multiple_choice",
    question: "Which process powers the Sun?",
    options: ["Fission", "Combustion", "Fusion", "Radiation"],
    correctAnswer: 2,
    explanation: "The Sun is powered by nuclear fusion.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q20",
    type: "multiple_choice",
    question: "What is a nuclear reactor used for?",
    options: [
      "Cooking food",
      "Producing electricity",
      "Storing water",
      "Making plastic",
    ],
    correctAnswer: 1,
    explanation: "Nuclear reactors are commonly used to generate electricity.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q21",
    type: "multiple_choice",
    question: "What controls the reaction in a nuclear reactor?",
    options: ["Fuel rods", "Control rods", "Water", "Turbines"],
    correctAnswer: 1,
    explanation:
      "Control rods absorb neutrons and regulate the chain reaction.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q22",
    type: "multiple_choice",
    question: "What is a common radiation detector?",
    options: ["Thermometer", "Geiger counter", "Barometer", "Microscope"],
    correctAnswer: 1,
    explanation: "A Geiger counter detects and measures ionizing radiation.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q23",
    type: "multiple_choice",
    question: "Which is a medical use of radiation?",
    options: [
      "Cooking",
      "Cancer treatment",
      "Cleaning water",
      "Making clothes",
    ],
    correctAnswer: 1,
    explanation:
      "Radiation is used in medicine for cancer treatment (radiotherapy).",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q24",
    type: "multiple_choice",
    question: "What is shielding?",
    options: [
      "Producing radiation",
      "Blocking radiation",
      "Measuring radiation",
      "Creating atoms",
    ],
    correctAnswer: 1,
    explanation: "Shielding means using material to reduce radiation exposure.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q25",
    type: "multiple_choice",
    question: "Which material can block gamma rays?",
    options: ["Paper", "Plastic", "Lead", "Cloth"],
    correctAnswer: 2,
    explanation: "Dense materials like lead are used to shield gamma rays.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q26",
    type: "multiple_choice",
    question: "What is nuclear waste?",
    options: [
      "Food waste",
      "Radioactive material",
      "Plastic waste",
      "Water waste",
    ],
    correctAnswer: 1,
    explanation:
      "Nuclear waste contains radioactive material from nuclear processes.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q27",
    type: "multiple_choice",
    question: "What is the unit of radioactivity?",
    options: ["Meter", "Becquerel", "Liter", "Volt"],
    correctAnswer: 1,
    explanation: "The becquerel (Bq) is the SI unit of radioactivity.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q28",
    type: "multiple_choice",
    question: "What is ionizing radiation?",
    options: [
      "Weak radiation",
      "Radiation that removes electrons",
      "Radiation that cools",
      "Radiation that heats",
    ],
    correctAnswer: 1,
    explanation:
      "Ionizing radiation has enough energy to remove electrons from atoms.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q29",
    type: "multiple_choice",
    question: "What is contamination?",
    options: [
      "Clean surface",
      "Presence of radioactive material",
      "Absence of radiation",
      "Heat exposure",
    ],
    correctAnswer: 1,
    explanation:
      "Contamination means radioactive material is present where it should not be.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q30",
    type: "multiple_choice",
    question: "What is exposure?",
    options: [
      "Contact with radiation",
      "Eating food",
      "Drinking water",
      "Sleeping",
    ],
    correctAnswer: 0,
    explanation: "Exposure means being subjected to radiation.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q31",
    type: "multiple_choice",
    question: "What is ALARA principle?",
    options: [
      "Use more radiation",
      "Avoid all energy",
      "As low as reasonably achievable",
      "Always large radiation",
    ],
    correctAnswer: 2,
    explanation:
      "ALARA means keeping radiation doses As Low As Reasonably Achievable.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q32",
    type: "multiple_choice",
    question: "What protects workers from radiation?",
    options: ["Distance", "Shielding", "Time", "All of the above"],
    correctAnswer: 3,
    explanation:
      "Time, distance, and shielding are all core radiation protection principles.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q33",
    type: "multiple_choice",
    question: "What is a radioactive source?",
    options: ["Light bulb", "Material emitting radiation", "Plastic", "Wood"],
    correctAnswer: 1,
    explanation: "A radioactive source is material that emits radiation.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q34",
    type: "multiple_choice",
    question: "What is background radiation?",
    options: [
      "Artificial radiation",
      "Natural radiation in environment",
      "Dangerous radiation",
      "Controlled radiation",
    ],
    correctAnswer: 1,
    explanation:
      "Background radiation is naturally present in our environment.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q35",
    type: "multiple_choice",
    question: "Which industry uses radiation gauges?",
    options: ["Agriculture", "Mining", "Medicine", "All of the above"],
    correctAnswer: 3,
    explanation:
      "Radiation gauges are used across many industries, including all listed options.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q36",
    type: "multiple_choice",
    question: "What is radiotherapy used for?",
    options: ["Cooking", "Treating cancer", "Lighting", "Cooling"],
    correctAnswer: 1,
    explanation: "Radiotherapy uses radiation to treat cancer.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q37",
    type: "multiple_choice",
    question: "What is radiography used for?",
    options: [
      "Imaging inside objects",
      "Cooking food",
      "Cleaning air",
      "Making metals",
    ],
    correctAnswer: 0,
    explanation: "Radiography is used to image internal structures.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q38",
    type: "multiple_choice",
    question: "What is sterilization using radiation?",
    options: [
      "Making food dirty",
      "Killing bacteria",
      "Heating food",
      "Cooling food",
    ],
    correctAnswer: 1,
    explanation: "Radiation sterilization is used to kill microorganisms.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q39",
    type: "multiple_choice",
    question: "What is a gamma ray?",
    options: ["Particle", "Wave of energy", "Solid", "Liquid"],
    correctAnswer: 1,
    explanation: "Gamma rays are high-energy electromagnetic waves.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q40",
    type: "multiple_choice",
    question: "What happens to unstable nuclei?",
    options: ["Stay same", "Decay", "Grow", "Multiply"],
    correctAnswer: 1,
    explanation: "Unstable nuclei decay over time and emit radiation.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q41",
    type: "multiple_choice",
    question: "What is nuclear energy?",
    options: [
      "Energy from electrons",
      "Energy from nucleus",
      "Energy from heat",
      "Energy from wind",
    ],
    correctAnswer: 1,
    explanation: "Nuclear energy comes from processes in the atomic nucleus.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q42",
    type: "multiple_choice",
    question: "Which element is commonly used in smoke detectors?",
    options: ["Oxygen", "Carbon", "Americium", "Iron"],
    correctAnswer: 2,
    explanation:
      "Americium-241 is commonly used in ionization smoke detectors.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q43",
    type: "multiple_choice",
    question: "What is a chain reaction?",
    options: [
      "Single reaction",
      "Series of reactions",
      "No reaction",
      "Slow reaction",
    ],
    correctAnswer: 1,
    explanation: "A chain reaction is a self-sustaining series of reactions.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q44",
    type: "multiple_choice",
    question: "What is a controlled chain reaction?",
    options: [
      "Dangerous reaction",
      "Managed reaction",
      "Explosive reaction",
      "No reaction",
    ],
    correctAnswer: 1,
    explanation:
      "A controlled chain reaction is carefully regulated, such as in a reactor.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q45",
    type: "multiple_choice",
    question: "What is an uncontrolled chain reaction?",
    options: ["Safe reaction", "Explosion", "Slow reaction", "Cold reaction"],
    correctAnswer: 1,
    explanation:
      "An uncontrolled chain reaction can release energy explosively.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q46",
    type: "multiple_choice",
    question: "What is nuclear technology?",
    options: [
      "Study of plants",
      "Use of nuclear science",
      "Study of animals",
      "Use of electricity only",
    ],
    correctAnswer: 1,
    explanation: "Nuclear technology is the practical use of nuclear science.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q47",
    type: "multiple_choice",
    question: "What is a benefit of nuclear energy?",
    options: ["High pollution", "Low carbon emission", "No energy", "No cost"],
    correctAnswer: 1,
    explanation:
      "Nuclear power produces low carbon emissions during operation.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q48",
    type: "multiple_choice",
    question: "What is a risk of radiation?",
    options: [
      "Improves health always",
      "Can damage cells",
      "Makes water",
      "Creates oxygen",
    ],
    correctAnswer: 1,
    explanation:
      "High or prolonged radiation exposure can damage living cells.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q49",
    type: "multiple_choice",
    question: "What is a dosimeter?",
    options: [
      "Measures weight",
      "Measures radiation dose",
      "Measures speed",
      "Measures temperature",
    ],
    correctAnswer: 1,
    explanation: "A dosimeter measures accumulated radiation dose.",
    difficulty: "easy",
    points: 5,
  },
  {
    id: "mb-easy-q50",
    type: "multiple_choice",
    question: "What is nuclear safety?",
    options: [
      "Ignoring radiation",
      "Protecting people from radiation",
      "Increasing exposure",
      "Avoiding electricity",
    ],
    correctAnswer: 1,
    explanation:
      "Nuclear safety means protecting people and the environment from radiation risks.",
    difficulty: "easy",
    points: 5,
  },
];

export const mythBusterQuizRepository: MythBusterQuizRepository = {
  easy: easyMythBusterQuestions,
  medium: [],
  hard: [],
};

export const getMythBusterQuizQuestionsByDifficulty = (
  difficulty: MythBusterQuizDifficulty,
): QuizQuestion[] => {
  return mythBusterQuizRepository[difficulty];
};

export const getAllMythBusterQuizQuestions = (): QuizQuestion[] => {
  return Object.values(mythBusterQuizRepository).flat();
};

const getOptionText = (question: QuizQuestion, optionIndex: number): string => {
  if (!question.options || !question.options[optionIndex]) {
    return "";
  }

  return question.options[optionIndex];
};

const getFirstWrongOption = (question: QuizQuestion): string => {
  if (!question.options || question.options.length === 0) {
    return "";
  }

  const correctAnswerIndex = Number(question.correctAnswer);

  const wrongOption = question.options.find(
    (_, index) => index !== correctAnswerIndex,
  );

  return wrongOption ?? "";
};

const buildStatementText = (
  questionText: string,
  optionText: string,
): string => {
  if (!optionText) {
    return questionText;
  }

  return `${questionText} ${optionText}`;
};

export const getMythBusterStatementsByDifficulty = (
  difficulty: MythBusterQuizDifficulty,
): MythBusterStatementSeed[] => {
  return getMythBusterQuizQuestionsByDifficulty(difficulty).map((question) => {
    const correctOption = getOptionText(
      question,
      Number(question.correctAnswer),
    );
    const wrongOption = getFirstWrongOption(question);

    return {
      id: question.id,
      mythStatement: buildStatementText(question.question, wrongOption),
      reality: buildStatementText(question.question, correctOption),
      explanation: question.explanation,
      category: "mythbuster",
      difficulty,
    };
  });
};

export default mythBusterQuizRepository;
