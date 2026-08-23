import { Icon } from "@/components/ui/icon";
import type {
    AtomMazeChallenge,
    AtomMazeRoom,
    QuizQuestion as AtomMazeQuizQuestion,
} from "@/content/explorer";
import { getMazeById } from "@/content/explorer";
import {
    getAllMythBusterQuizQuestions,
    type MythBusterQuizDifficulty,
} from "@/content/quizzes";
import type { QuizQuestion as RepositoryQuizQuestion } from "@/content/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { startMaze } from "@/services/explorer-storage";
import { saveGameScore } from "@/services/database";
import { playGameSfx, preloadGameSfx } from "@/services/game-sfx";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    BackHandler,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    Vibration,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    runOnJS,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Modern Theme
import { useTheme } from "@/theme";
import { EASE_OUT } from "@/theme/motion";
import { HowToPlayCard } from "@/components/games/HowToPlayCard";
import { MAZE_BATTLE_ART, MonsterIcon, PlayerIcon } from "@/components/atom-maze/icons";
import { styles } from "@/components/atom-maze/styles";

// Boss shifts to low-health art at 35% HP.
const BOSS_LOW_HP_THRESHOLD = 0.35;

const BATTLE_TIMING = {
  impactMs: 90,
  resultMs: 900,
  monsterFadeMs: 320,
  roomExitDelayMs: 260,
  walkOutMs: 850,
  walkInMs: 620,
};

// Endless mode skips the walking theatrics — waves should come fast.
const ENDLESS_TIMING = {
  ...BATTLE_TIMING,
  resultMs: 420,
  monsterFadeMs: 120,
  roomExitDelayMs: 0,
  walkOutMs: 0,
  walkInMs: 90,
};

// Shared instructions-page backdrop (same for every maze) — copies the
// autumn cream → white gradient used across the home + games tabs.
const INTRO_SKY_LIGHT: [string, string] = ["#FFF3E0", "#FFFFFF"];

/* Maze stage colors (mirrors the DifficultyPanel on the games tab). */
const MAZE_COLORS: Record<string, string> = {
  safety: "#FFB300",
  radiation: "#FFA000",
  history: "#FF8F00",
  reactor: "#FFD54F",
  default: "#FFB300",
};

const getMazeColor = (themeName: string | undefined): string => {
  if (!themeName) return MAZE_COLORS.default;
  const lowerTheme = themeName.toLowerCase();
  if (lowerTheme.includes("safety")) return MAZE_COLORS.safety;
  if (lowerTheme.includes("radiation")) return MAZE_COLORS.radiation;
  if (lowerTheme.includes("history")) return MAZE_COLORS.history;
  if (lowerTheme.includes("reactor")) return MAZE_COLORS.reactor;
  return MAZE_COLORS.default;
};

/* Darken a hex color for the badge's 3D lip. */
const darkenHex = (hex: string, amount: number): string => {
  const mix = (v: number) =>
    Math.max(0, Math.round(v * (1 - amount)))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(parseInt(hex.slice(1, 3), 16))}${mix(
    parseInt(hex.slice(3, 5), 16),
  )}${mix(parseInt(hex.slice(5, 7), 16))}`;
};

type AtomMazeStageDifficulty = "easy" | "average" | "difficult";

const STAGE_DIFFICULTY_META: Record<
  AtomMazeStageDifficulty,
  {
    label: string;
    chipBackgroundColor: string;
    chipTextColor: string;
  }
> = {
  easy: {
    label: "EASY",
    chipBackgroundColor: "rgba(34, 197, 94, 0.22)",
    chipTextColor: "#BBF7D0",
  },
  average: {
    label: "AVERAGE",
    chipBackgroundColor: "rgba(251, 191, 36, 0.25)",
    chipTextColor: "#FDE68A",
  },
  difficult: {
    label: "DIFFICULT",
    chipBackgroundColor: "rgba(239, 68, 68, 0.24)",
    chipTextColor: "#FCA5A5",
  },
};

const STAGE_TO_REPOSITORY_DIFFICULTY: Record<
  AtomMazeStageDifficulty,
  MythBusterQuizDifficulty
> = {
  easy: "easy",
  average: "medium",
  difficult: "hard",
};

interface IntroHowToPlayStep {
  id: string;
  icon: string;
  title: string;
  hint: string;
}

const INTRO_HOW_TO_PLAY_STEPS: IntroHowToPlayStep[] = [
  {
    id: "quiz",
    icon: "MessageQuestion",
    title: "Answer Quiz",
    hint: "Choose the best answer to keep advancing.",
  },
  {
    id: "combo",
    icon: "Activity",
    title: "Build Combo",
    hint: "Consecutive correct picks keep your momentum high.",
  },
  {
    id: "focus",
    icon: "Eye",
    title: "Keep Focus",
    hint: "Wrong answers reset your combo streak.",
  },
  {
    id: "stage",
    icon: "Map",
    title: "Clear Stage",
    hint: "Complete each stage to move to the next one.",
  },
];

const normalizeQuestionText = (questionText: string): string =>
  questionText.trim().toLowerCase().replace(/\s+/g, " ");

const getRoomStageDifficulty = (
  roomIndex: number,
  totalRooms: number,
): AtomMazeStageDifficulty => {
  if (totalRooms <= 1) {
    return "easy";
  }

  const maxRoomIndex = Math.max(totalRooms - 1, 1);
  const normalizedRoomProgress = roomIndex / maxRoomIndex;

  if (normalizedRoomProgress < 1 / 3) {
    return "easy";
  }

  if (normalizedRoomProgress < 2 / 3) {
    return "average";
  }

  return "difficult";
};

const shuffleArray = <T,>(values: T[]): T[] => {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
};

const shuffleQuizQuestionOptions = (
  question: AtomMazeQuizQuestion,
): AtomMazeQuizQuestion => {
  const optionsWithOriginalIndex = question.options.map((option, index) => ({
    option,
    index,
  }));

  const shuffledOptions = shuffleArray(optionsWithOriginalIndex);
  const shuffledCorrectAnswer = shuffledOptions.findIndex(
    (entry) => entry.index === question.correctAnswer,
  );

  return {
    ...question,
    options: shuffledOptions.map((entry) => entry.option),
    correctAnswer:
      shuffledCorrectAnswer >= 0
        ? shuffledCorrectAnswer
        : question.correctAnswer,
  };
};

const toAtomMazeBossQuizQuestion = (
  question: RepositoryQuizQuestion,
): AtomMazeQuizQuestion | null => {  if (!question.options || question.options.length < 2) {
    return null;
  }

  const correctAnswerIndex = Number(question.correctAnswer);
  if (
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex >= question.options.length
  ) {
    return null;
  }

  return {
    type: "quiz",
    question: question.question,
    options: [...question.options],
    correctAnswer: correctAnswerIndex,
  };
};

const HP_BAR_SEGMENTS = 10;

/* ------------------------------------------------------------------ */
/* Endless Maze — procedural room generation                           */
/* ------------------------------------------------------------------ */

type MythBusterQuestionPool = Partial<
  Record<MythBusterQuizDifficulty, AtomMazeQuizQuestion[]>
>;

const ENDLESS_MONSTER_ROSTER = [
  { name: "Radon Wisp", element: "radiation", sprite: "👻", color: "#9C6ADE" },
  { name: "Neutron Pup", element: "nuclear", sprite: "🐕", color: "#F59E0B" },
  { name: "Gamma Moth", element: "radiation", sprite: "🦋", color: "#10B981" },
  { name: "Fission Frog", element: "fission", sprite: "🐸", color: "#22C55E" },
  { name: "Plasma Jelly", element: "plasma", sprite: "🪼", color: "#3B82F6" },
  { name: "Atom Ant", element: "atomic", sprite: "🐜", color: "#EF4444" },
  { name: "Fusion Drake", element: "fusion", sprite: "🐉", color: "#F97316" },
  { name: "Isotope Bat", element: "atomic", sprite: "🦇", color: "#8B5CF6" },
] as const;

/** Difficulty weights ramp with the wave count but never hit zero. */
const pickEndlessDifficulty = (wave: number): MythBusterQuizDifficulty => {
  if (wave < 5) return "easy";
  const t = Math.min((wave - 5) / 25, 1); // ramps across waves 6–30
  const wEasy = 0.55 - 0.4 * t; // .55 → .15
  const wMedium = 0.3 + 0.15 * t; // .30 → .45
  const wHard = 0.5 * t * t; // 0 → .50
  const roll = Math.random() * (wEasy + wMedium + wHard);
  if (roll < wEasy) return "easy";
  if (roll < wEasy + wMedium) return "medium";
  return "hard";
};

/**
 * Build one endless room from an unused mythbuster question at the ramped
 * difficulty, falling back to any unused question so a run only ends when
 * the whole bank is exhausted. Mutates `usedIds`. Returns null when dry.
 */
const generateEndlessRoom = (
  wave: number,
  pools: MythBusterQuestionPool,
  usedIds: Set<string>,
): AtomMazeRoom | null => {
  const takeQuestion = (
    difficulty: MythBusterQuizDifficulty,
  ): AtomMazeQuizQuestion | null => {
    for (const question of pools[difficulty] ?? []) {
      if (!usedIds.has(question.question)) return question;
    }
    return null;
  };

  let difficulty = pickEndlessDifficulty(wave);
  let picked = takeQuestion(difficulty);
  if (!picked) {
    for (const alt of ["easy", "medium", "hard"] as const) {
      picked = takeQuestion(alt);
      if (picked) {
        difficulty = alt;
        break;
      }
    }
  }
  if (!picked) return null; // bank exhausted — end the run

  usedIds.add(picked.question);

  const roster = ENDLESS_MONSTER_ROSTER[wave % ENDLESS_MONSTER_ROSTER.length];
  const maxHp = 50 + wave * 10;
  const attackPower = Math.min(18 + Math.floor(wave * 1.5), 45);

  return {
    id: `endless-wave-${wave}`,
    title: `Wave ${wave + 1}`,
    description: "",
    monster: {
      id: `endless-monster-${wave}`,
      name: roster.name,
      element: roster.element,
      maxHp,
      attackPower,
      sprite: roster.sprite,
      color: roster.color,
      defeatMessage: `${roster.name} is down!`,
    },
    questions: [picked],
    damagePerCorrect: maxHp,
    explanation: "",
  };
};

const buildEndlessBaseMaze = (pools: MythBusterQuestionPool): AtomMazeChallenge => {
  const usedIds = new Set<string>();
  const rooms = [generateEndlessRoom(0, pools, usedIds), generateEndlessRoom(1, pools, usedIds)]
    .filter((room): room is AtomMazeRoom => room !== null);
  return {
    id: "endless",
    title: "Endless Maze",
    description:
      "Survive as many waves as you can. Questions start easy and get tougher the deeper you go — one wrong answer costs HP, so stay sharp!",
    theme: "Endless Challenge",
    rooms,
    xpReward: 0,
    playerMaxHp: 100,
    boss: {
      id: "endless-gauntlet",
      name: "The Gauntlet",
      element: "fusion",
      maxHp: 9999,
      attackPower: 45,
      sprite: "♾️",
      color: "#7C3AED",
      defeatMessage: "You conquered The Gauntlet!",
      isBoss: true,
    },
  };
};

const HP_FILL_DURATION_MS = 380;

const getHpBarColor = (ratio: number): string => {
  if (ratio > 0.5) return "#4ADE80";
  if (ratio > 0.25) return "#FCD34D";
  return "#F87171";
};

// Pokemon-style segmented HP bar. The filled width drains on the UI thread
// when HP changes; static divider lines keep the segmented look while the
// fill slides underneath (no per-frame sibling layout).
const SegmentedHpBar = ({
  current,
  max,
}: {
  current: number;
  max: number;
}) => {
  const reducedMotion = useReducedMotion();
  const ratio = max > 0 ? Math.max(0, current) / max : 0;
  const fillColor = getHpBarColor(ratio);
  const progress = useSharedValue(ratio);

  useEffect(() => {
    if (reducedMotion) {
      progress.set(ratio);
    } else {
      progress.set(
        withTiming(ratio, {
          duration: HP_FILL_DURATION_MS,
          easing: EASE_OUT,
        }),
      );
    }
  }, [ratio, reducedMotion, progress]);

  const fillWidth = useAnimatedStyle(() => ({
    width: `${progress.get() * 100}%`,
  }));

  return (
    <View style={styles.hpSegmentTrack}>
      <Animated.View
        style={[
          styles.hpSegmentFill,
          { backgroundColor: fillColor },
          fillWidth,
        ]}
      />
      {Array.from({ length: HP_BAR_SEGMENTS - 1 }, (_, index) => (
        <View
          key={index}
          style={[styles.hpSegmentDivider, { left: `${index * 10}%` }]}
        />
      ))}
    </View>
  );
};

// Pokemon-style HP card pinned below the header.
const PokemonHpBox = ({
  name,
  sub,
  current,
  max,
  cardStyle,
  textColor,
  subColor,
  valueColor,
}: {
  name: string;
  sub: string;
  current: number;
  max: number;
  cardStyle: object;
  textColor: string;
  subColor: string;
  valueColor: string;
}) => {
  return (
    <View style={[styles.hpBox, cardStyle]}>
      <View style={styles.hpBoxBody}>
        <View style={styles.hpBoxTopRow}>
          <Text style={[styles.hpBoxName, { color: textColor }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.hpBoxLevel, { color: subColor }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <View style={styles.hpBoxBottomRow}>
          <SegmentedHpBar current={current} max={max} />
          <Text style={[styles.hpBoxValue, { color: valueColor }]}>
            {Math.max(0, current)}/{max}
          </Text>
        </View>
      </View>
    </View>
  );
};

interface GameState {
  phase:
    | "intro"
    | "battle"
    | "victory"
    | "defeat"
    | "boss_intro"
    | "boss"
    | "complete";
  currentRoomIndex: number;
  currentQuestionIndex: number;
  playerHp: number;
  playerMaxHp: number;
  monsterHp: number;
  monsterMaxHp: number;
  score: number;
  defeatedMonsters: number;
}

export default function AtomMazeBattleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Endless Maze — synthetic mode: no fixed rooms/boss; questions are drawn
  // from the mythbuster bank with a difficulty ramp and zero repeats.
  const isEndlessMode = id === "endless";
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [maze, setMaze] = useState<AtomMazeChallenge | null>(null);
  const [mazeLoaded, setMazeLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // Endless mode has no DB maze — the synthetic one arrives with the
    // mythbuster question pool below.
    if (isEndlessMode) {
      setMazeLoaded(true);
      return;
    }
    if (!id) {
      setMaze(null);
      setMazeLoaded(true);
      return;
    }
    void getMazeById(id).then((found) => {
      if (!cancelled) {
        setMaze(found ?? null);
        setMazeLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    phase: "intro",
    currentRoomIndex: 0,
    currentQuestionIndex: 0,
    playerHp: 100,
    playerMaxHp: 100,
    monsterHp: 100,
    monsterMaxHp: 100,
    score: 0,
    defeatedMonsters: 0,
  });

  // Mirror the live score so async run-complete handlers read the latest value
  const scoreRef = useRef(0);
  useEffect(() => {
    scoreRef.current = gameState.score;
  }, [gameState.score]);

  // UI state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<"correct" | "wrong" | null>(
    null,
  );
  const [isAnswering, setIsAnswering] = useState(false);
  const [xpAwardedThisRun, setXpAwardedThisRun] = useState<boolean | null>(
    null,
  );
  const [comboStreak, setComboStreak] = useState(0);
  const [lastDamage, setLastDamage] = useState<{
    target: "player" | "monster";
    amount: number;
  } | null>(null);
  const [isPlayerHurt, setIsPlayerHurt] = useState(false);
  const [isMonsterHurt, setIsMonsterHurt] = useState(false);
  const [isPlayerAttacking, setIsPlayerAttacking] = useState(false);
  const [isMonsterAttacking, setIsMonsterAttacking] = useState(false);
  const [isMonsterFaint, setIsMonsterFaint] = useState(false);
  const [isStageTransitioning, setIsStageTransitioning] = useState(false);
  const [showBossNotice, setShowBossNotice] = useState(false);

  const colorScheme = useColorScheme();
  const { theme: appTheme } = useTheme();
  const theme = appTheme.palettes.mazeGame;
  const introPalette = useMemo(() => {
    if (colorScheme === "dark") {
      return {
        background: "#0B1220",
        cardBg: "rgba(15, 23, 42, 0.88)",
        cardBorder: "rgba(148, 163, 184, 0.34)",
        primaryText: "#F8FAFC",
        mutedText: "#CBD5E1",
        subtleBg: "rgba(30, 41, 59, 0.86)",
        subtleBorder: "rgba(148, 163, 184, 0.28)",
        iconWrapBg: "rgba(255, 255, 255, 0.08)",
        backBtnBg: "rgba(15, 23, 42, 0.85)",
        backBtnBorder: "rgba(148, 163, 184, 0.4)",
      };
    }

    return {
      background: "#FFFDE7",
      cardBg: "#FFFFFF",
      cardBorder: "#E5E7EB",
      primaryText: "#1F2937",
      mutedText: "#6B7280",
      subtleBg: "#F9FAFB",
      subtleBorder: "#E5E7EB",
      iconWrapBg: "#FFF3D9",
      backBtnBg: "#FFFFFF",
      backBtnBorder: "#E5E7EB",
    };
  }, [colorScheme]);
  const resultPalette = useMemo(() => {
    if (colorScheme === "dark") {
      return {
        defeatGradient: ["#2C0E16", "#111827", "#0B1220"] as const,
        victoryGradient: ["#052E2B", "#0F172A", "#111827"] as const,
        completeGradient: ["#1C1917", "#0F172A", "#052E2B"] as const,
        cardBg: "rgba(15, 23, 42, 0.9)",
        cardBorder: "rgba(148, 163, 184, 0.34)",
        cardShadow: "rgba(2, 6, 23, 0.65)",
        statsBg: "rgba(30, 41, 59, 0.86)",
        statsBorder: "rgba(148, 163, 184, 0.3)",
        statDivider: "rgba(148, 163, 184, 0.24)",
        primaryText: "#F8FAFC",
        mutedText: "#CBD5E1",
        chipBg: "rgba(15, 23, 42, 0.82)",
        chipBorder: "rgba(148, 163, 184, 0.45)",
        chipText: "#E2E8F0",
        defeatAccent: "#F87171",
        victoryAccent: "#34D399",
        completeAccent: "#FACC15",
        rewardCardBg: "rgba(250, 204, 21, 0.14)",
        rewardCardBorder: "rgba(250, 204, 21, 0.5)",
        rewardText: "#FDE68A",
        retryButton: "#DC2626",
        retryButtonDepth: "#991B1B",
        nextButton: "#22C55E",
        nextButtonDepth: "#15803D",
        completeButton: "#D97706",
        completeButtonDepth: "#B45309",
      };
    }

    return {
      defeatGradient: ["#FFF7ED", "#FEE2E2", "#FECACA"] as const,
      victoryGradient: ["#ECFDF5", "#DCFCE7", "#BBF7D0"] as const,
      completeGradient: ["#FEFCE8", "#FEF3C7", "#FDE68A"] as const,
      cardBg: "#FFFFFF",
      cardBorder: "#E5E7EB",
      cardShadow: "rgba(15, 23, 42, 0.16)",
      statsBg: "#FFF8E1",
      statsBorder: "#FFE082",
      statDivider: "#FFE082",
      primaryText: "#111827",
      mutedText: "#6B7280",
      chipBg: "#FFFFFF",
      chipBorder: "#E5E7EB",
      chipText: "#374151",
      defeatAccent: "#DC2626",
      victoryAccent: "#059669",
      completeAccent: "#CA8A04",
      rewardCardBg: "#FEF9C3",
      rewardCardBorder: "#FACC15",
      rewardText: "#B45309",
      retryButton: "#EF4444",
      retryButtonDepth: "#B91C1C",
      nextButton: "#10B981",
      nextButtonDepth: "#047857",
      completeButton: "#F59E0B",
      completeButtonDepth: "#B45309",
    };
  }, [colorScheme]);
  // Quiz colors — amber maze theme, adapted per color scheme.
  const quizPalette = useMemo(() => {
    const dark = colorScheme === "dark";
    const tintAmber = dark
      ? "rgba(255, 179, 0, 0.18)"
      : "#FFF8E1";
    const tintGreen = dark
      ? "rgba(46, 204, 113, 0.18)"
      : "#E8F5E9";
    const tintRed = dark ? "rgba(239, 68, 68, 0.16)" : "#FEE2E2";
    return {
      option: {
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderBottomColor: dark ? "#26334A" : "#D1D5DB",
      },
      selected: {
        borderColor: theme.primary,
        borderBottomColor: theme.primaryDark,
        backgroundColor: tintAmber,
      },
      correct: {
        backgroundColor: tintGreen,
        borderColor: "#2ECC71",
        borderBottomColor: "#229954",
      },
      wrong: {
        backgroundColor: tintRed,
        borderColor: "#EF4444",
        borderBottomColor: "#DC2626",
      },
      textCorrect: dark ? "#4ADE80" : "#15803D",
      textWrong: dark ? "#FCA5A5" : "#991B1B",
      feedbackCorrect: {
        backgroundColor: tintGreen,
        borderColor: "rgba(46, 204, 113, 0.55)",
      },
      feedbackWrong: {
        backgroundColor: tintRed,
        borderColor: "rgba(239, 68, 68, 0.55)",
      },
    };
  }, [colorScheme, theme]);
  // HP card surface + text colors, mode-aware.
  const hpCard = useMemo(() => {
    const dark = colorScheme === "dark";
    return {
      cardStyle: {
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderBottomColor: dark ? "#26334A" : "#D1D5DB",
        shadowColor: dark ? "#000000" : "#0F172A",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: dark ? 0.45 : 0.12,
        shadowRadius: 6,
        elevation: 3,
      },
      textColor: dark ? "#F8FAFC" : "#111827",
      subColor: dark ? "#FFCA28" : "#B45309",
      valueColor: dark ? "#94A3B8" : "#6B7280",
    };
  }, [colorScheme, theme]);
  const arenaHeight = Math.min(Math.max(height * 0.42, 270), 360);
  const sceneTopPadding = Math.max(insets.top + 4, 10);
  const questionBottomPadding = Math.max(insets.bottom + 12, 18);
  const introBottomPadding = Math.max(insets.bottom + 28, 36);
  const shouldConfirmExit =
    gameState.phase === "battle" ||
    gameState.phase === "victory" ||
    gameState.phase === "boss_intro" ||
    gameState.phase === "boss";

  useEffect(() => {
    void preloadGameSfx();
  }, []);

  useEffect(() => {
    if (gameState.phase === "defeat") {
      void playGameSfx("gameover");
    }
  }, [gameState.phase]);

  useEffect(() => {
    if (gameState.phase !== "boss") {
      setShowBossNotice(false);
      return;
    }

    setShowBossNotice(true);
    const timeout = setTimeout(() => {
      setShowBossNotice(false);
    }, 2200);

    return () => clearTimeout(timeout);
  }, [gameState.phase]);

  useEffect(() => {
    if (!lastDamage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setLastDamage(null);
    }, (isEndlessMode ? ENDLESS_TIMING.resultMs : BATTLE_TIMING.resultMs) - 120);

    return () => clearTimeout(timeoutId);
  }, [isEndlessMode, lastDamage]);

  // Animation values
  const playerShake = useSharedValue(0);
  const monsterShake = useSharedValue(0);
  const playerScale = useSharedValue(1);
  const monsterScale = useSharedValue(1);
  const playerX = useSharedValue(0);
  const playerLunge = useSharedValue(0);
  const monsterLunge = useSharedValue(0);
  const arenaPulse = useSharedValue(0);
  const monsterOpacity = useSharedValue(1);

  // Initialize game
  const didInitMazeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!maze) return;
    // Endless regenerates the maze object as waves are appended; initialize
    // only once so appending rooms never resets an in-progress run.
    if (isEndlessMode && didInitMazeRef.current === maze.id) return;
    didInitMazeRef.current = maze.id;
    {
      const playerMaxHp = maze.playerMaxHp || 100;
      const firstRoom = maze.rooms[0];
      const monsterMaxHp = firstRoom?.monster?.maxHp || 50;

      setGameState({
        phase: "intro",
        currentRoomIndex: 0,
        currentQuestionIndex: 0,
        playerHp: playerMaxHp,
        playerMaxHp: playerMaxHp,
        monsterHp: monsterMaxHp,
        monsterMaxHp: monsterMaxHp,
        score: 0,
        defeatedMonsters: 0,
      });

      // Reset animations
      playerX.value = 0;
      playerLunge.value = 0;
      monsterLunge.value = 0;
      arenaPulse.value = 0;
      monsterOpacity.value = 1;
      setXpAwardedThisRun(null);
      setComboStreak(0);
      setLastDamage(null);
      setIsPlayerHurt(false);
      setIsMonsterHurt(false);
      setIsPlayerAttacking(false);
      setIsMonsterAttacking(false);
      setIsMonsterFaint(false);
      setIsStageTransitioning(false);
    }
  }, [maze]);

  // Get current room and question
  const currentRoom = maze?.rooms[gameState.currentRoomIndex];
  const isBossBattle = gameState.phase === "boss";
  const totalRoomCount = maze?.rooms.length || 0;
  const currentRoomStageDifficulty = getRoomStageDifficulty(
    gameState.currentRoomIndex,
    totalRoomCount,
  );
  const currentStageDifficulty: AtomMazeStageDifficulty = isBossBattle
    ? "difficult"
    : currentRoomStageDifficulty;
  const currentStageDifficultyMeta =
    STAGE_DIFFICULTY_META[currentStageDifficulty];
  const currentMonster = isBossBattle ? maze?.boss : currentRoom?.monster;
  const isBossLowHp =
    isBossBattle &&
    gameState.monsterMaxHp > 0 &&
    gameState.monsterHp / gameState.monsterMaxHp <= BOSS_LOW_HP_THRESHOLD;

  // Boss battle question pool, loaded once from the DB-backed mythbuster bank.
  const [mythBusterBossQuestions, setMythBusterBossQuestions] = useState<
    Partial<Record<MythBusterQuizDifficulty, AtomMazeQuizQuestion[]>>
  >({});

  useEffect(() => {
    let active = true;
    void getAllMythBusterQuizQuestions()
      .then((questions) => {
        const pool: Partial<
          Record<MythBusterQuizDifficulty, AtomMazeQuizQuestion[]>
        > = {};
        for (const difficulty of ["easy", "medium", "hard"] as const) {
          pool[difficulty] = questions
            .filter((question) => question.difficulty === difficulty)
            .map(toAtomMazeBossQuizQuestion)
            .filter(
              (question): question is AtomMazeQuizQuestion => question !== null,
            );
        }
        if (!active) return;
        setMythBusterBossQuestions(pool);
        if (isEndlessMode) {
          setMaze(buildEndlessBaseMaze(pool));
        }
      })
      .catch(() => {
        // Non-fatal: boss battle simply has no extra questions to draw from.
      });
    return () => {
      active = false;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Endless Maze — procedural room generation from the mythbuster bank.
  // Waves start easy; medium/hard mix in as waves progress, but lower
  // difficulties keep appearing. No question ever repeats within a run;
  // exhausting the whole bank ends the run gracefully.
  // -----------------------------------------------------------------------

  const endlessUsedIdsRef = useRef<Set<string>>(new Set());

  /** Make sure generated rooms exist through `upToIndex` (inclusive). */
  const ensureEndlessRooms = useCallback(
    (upToIndex: number) => {
      if (!isEndlessMode) return;
      setMaze((prev) => {
        if (!prev) return prev;
        if (prev.rooms.length > upToIndex && prev.rooms[upToIndex]) return prev;
        const rooms = [...prev.rooms];
        while (rooms.length <= upToIndex) {
          const room = generateEndlessRoom(
            rooms.length,
            mythBusterBossQuestions,
            endlessUsedIdsRef.current,
          );
          if (!room) break; // out of questions — leave rooms short
          rooms.push(room);
        }
        return { ...prev, rooms };
      });
    },
    [isEndlessMode, mythBusterBossQuestions],
  );

  // Keep one spare room generated ahead of the player.
  useEffect(() => {
    if (isEndlessMode && gameState.phase === "battle") {
      ensureEndlessRooms(gameState.currentRoomIndex + 2);
    }
  }, [ensureEndlessRooms, gameState.currentRoomIndex, gameState.phase, isEndlessMode]);

  // Filter to only quiz questions
  const currentQuestions = useMemo(() => {
    const mazeQuizQuestions = (
      maze?.rooms.flatMap((room) => room.questions) || []
    ).filter(
      (question): question is AtomMazeQuizQuestion => question.type === "quiz",
    );

    if (isBossBattle) {
      const usedStageQuestionKeys = new Set(
        mazeQuizQuestions.map((question) =>
          normalizeQuestionText(question.question),
        ),
      );
      const seenBossQuestionKeys = new Set<string>();
      const nonRepeatingBossQuestionPool: AtomMazeQuizQuestion[] = [];
      const orderedBossDifficulties: AtomMazeStageDifficulty[] = [
        "difficult",
        "average",
        "easy",
      ];

      orderedBossDifficulties.forEach((difficulty) => {
        (mythBusterBossQuestions[STAGE_TO_REPOSITORY_DIFFICULTY[difficulty]] ??
          [])
          .forEach((question) => {
            const normalizedQuestion = normalizeQuestionText(question.question);

            if (
              usedStageQuestionKeys.has(normalizedQuestion) ||
              seenBossQuestionKeys.has(normalizedQuestion)
            ) {
              return;
            }

            seenBossQuestionKeys.add(normalizedQuestion);
            nonRepeatingBossQuestionPool.push(question);
          });
      });

      if (nonRepeatingBossQuestionPool.length === 0) {
        return [];
      }

      const targetBossQuestionCount = Math.min(
        Math.max(mazeQuizQuestions.length, 1),
        nonRepeatingBossQuestionPool.length,
      );

      return shuffleArray(nonRepeatingBossQuestionPool)
        .slice(0, targetBossQuestionCount)
        .map((question) => shuffleQuizQuestionOptions(question));
    }

    return (currentRoom?.questions || [])
      .filter(
        (question): question is AtomMazeQuizQuestion =>
          question.type === "quiz",
      )
      .map((question) => shuffleQuizQuestionOptions(question));
  }, [isBossBattle, maze, currentRoom, mythBusterBossQuestions]);

  const currentQuestion = currentQuestions[gameState.currentQuestionIndex];

  // Reset selection when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(null);
  }, [currentQuestion]);

  // Shake animation for damage
  const triggerPlayerShake = useCallback(() => {
    playerShake.value = withSequence(
      withTiming(-10, { duration: 40 }),
      withTiming(10, { duration: 40 }),
      withTiming(-8, { duration: 40 }),
      withTiming(8, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
    if (Platform.OS !== "web") {
      Vibration.vibrate(70);
    }
  }, []);

  const triggerMonsterShake = useCallback(() => {
    monsterShake.value = withSequence(
      withTiming(-10, { duration: 40 }),
      withTiming(10, { duration: 40 }),
      withTiming(-8, { duration: 40 }),
      withTiming(8, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
  }, []);

  const triggerPlayerHurtPose = useCallback(() => {
    setIsPlayerHurt(true);
    setTimeout(() => setIsPlayerHurt(false), 450);
  }, []);

  const triggerMonsterHurtPose = useCallback(() => {
    setIsMonsterHurt(true);
    setTimeout(() => setIsMonsterHurt(false), 450);
  }, []);

  const triggerAttackAnimation = useCallback((isPlayer: boolean) => {
    arenaPulse.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 180 }),
    );

    if (isPlayer) {
      setIsPlayerAttacking(true);
      setTimeout(() => setIsPlayerAttacking(false), 280);
      playerLunge.value = withSequence(
        withTiming(26, { duration: 90 }),
        withTiming(0, { duration: 130 }),
      );
      playerScale.value = withSequence(
        withTiming(1.16, { duration: 90 }),
        withTiming(1, { duration: 130 }),
      );
    } else {
      setIsMonsterAttacking(true);
      setTimeout(() => setIsMonsterAttacking(false), 280);
      monsterLunge.value = withSequence(
        withTiming(-26, { duration: 90 }),
        withTiming(0, { duration: 130 }),
      );
      monsterScale.value = withSequence(
        withTiming(1.16, { duration: 90 }),
        withTiming(1, { duration: 130 }),
      );
    }
  }, []);

  // Animated styles
  const playerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: playerShake.value + playerX.value + playerLunge.value },
      { scale: playerScale.value },
    ],
  }));

  const monsterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: monsterOpacity.value,
    transform: [
      { translateX: monsterShake.value + monsterLunge.value },
      { scale: monsterScale.value },
    ],
  }));

  const arenaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + arenaPulse.value * 0.015 }],
  }));

  // Handle quiz answer selection
  const handleQuizAnswer = (index: number) => {
    if (isAnswering || showResult || isStageTransitioning) return;

    if (selectedAnswer === index) {
      handleSubmit();
      return;
    }

    setSelectedAnswer(index);
  };

  // Submit answer
  const handleSubmit = () => {
    if (isAnswering || !currentQuestion || selectedAnswer === null || isStageTransitioning) return;
    // Endless rolls at a quicker pace: shorter pause between answer and result.
    const resultMs = isEndlessMode ? ENDLESS_TIMING.resultMs : BATTLE_TIMING.resultMs;

    setIsAnswering(true);
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    void playGameSfx(isCorrect ? "correct" : "wrong");

    setShowResult(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      const nextComboStreak = comboStreak + 1;
      setComboStreak(nextComboStreak);

      // Player attacks monster
      triggerAttackAnimation(true);
      setTimeout(() => {
        void playGameSfx("punch");
        triggerMonsterShake();
        triggerMonsterHurtPose();
      }, BATTLE_TIMING.impactMs);

      if (isBossBattle) {
        // Boss battle: deal damage per correct answer
        const damagePerHit = Math.ceil(
          (maze?.boss?.maxHp || 100) / currentQuestions.length,
        );
        const newBossHp = Math.max(0, gameState.monsterHp - damagePerHit);
        setLastDamage({ target: "monster", amount: damagePerHit });

        setGameState((prev) => ({
          ...prev,
          monsterHp: newBossHp,
          score: prev.score + 15,
        }));

        // Check if boss is defeated
        if (newBossHp <= 0) {
          setTimeout(() => {
            handleMonsterDefeated();
          }, resultMs);
        } else {
          // Move to the next boss question without repeating previous ones.
          setTimeout(() => {
            const nextQuestionIndex = gameState.currentQuestionIndex + 1;

            if (nextQuestionIndex >= currentQuestions.length) {
              setShowResult(null);
              setSelectedAnswer(null);
              setIsAnswering(false);
              setGameState((prev) => ({ ...prev, phase: "defeat" }));
              return;
            }

            setShowResult(null);
            setSelectedAnswer(null);
            setIsAnswering(false);
            setGameState((prev) => ({
              ...prev,
              currentQuestionIndex: nextQuestionIndex,
            }));
          }, resultMs);
        }
      } else {
        // Regular room: correct answer defeats the monster instantly!
        setLastDamage({ target: "monster", amount: gameState.monsterHp });
        setGameState((prev) => ({
          ...prev,
          monsterHp: 0,
          score: prev.score + 10,
        }));

        // Monster defeated - proceed to next room after delay
        setTimeout(() => {
          handleMonsterDefeated();
        }, resultMs);
      }
    } else {
      setComboStreak(0);

      // Monster attacks player - wrong answer deals damage but stays on same question
      triggerAttackAnimation(false);
      setTimeout(() => {
        void playGameSfx("punch");
        triggerPlayerShake();
        triggerPlayerHurtPose();
      }, BATTLE_TIMING.impactMs);

      const damage = currentMonster?.attackPower || 20;
      const newPlayerHp = Math.max(0, gameState.playerHp - damage);
      setLastDamage({ target: "player", amount: damage });

      setGameState((prev) => ({
        ...prev,
        playerHp: newPlayerHp,
      }));

      // Check for game over
      if (newPlayerHp <= 0) {
        // Endless runs record their score even on defeat.
        if (isEndlessMode) {
          void (async () => {
            try {
              await saveGameScore("atom-maze", scoreRef.current);
              setXpAwardedThisRun(true);
            } catch (error) {
              console.error("Failed to save game score:", error);
              setXpAwardedThisRun(false);
            }
          })();
        }
        setTimeout(() => {
          setGameState((prev) => ({ ...prev, phase: "defeat" }));
        }, resultMs);
        return;
      }

      // Boss battle never repeats a question; regular rooms still retry on wrong answer.
      setTimeout(() => {
        if (isBossBattle) {
          const nextQuestionIndex = gameState.currentQuestionIndex + 1;

          if (nextQuestionIndex >= currentQuestions.length) {
            setShowResult(null);
            setSelectedAnswer(null);
            setIsAnswering(false);
            setGameState((prev) => ({ ...prev, phase: "defeat" }));
            return;
          }

          setShowResult(null);
          setSelectedAnswer(null);
          setIsAnswering(false);
          setGameState((prev) => ({
            ...prev,
            currentQuestionIndex: nextQuestionIndex,
          }));
          return;
        }

        setShowResult(null);
        setSelectedAnswer(null);
        setIsAnswering(false);
      }, resultMs);
    }
  };

  // Handle next room transition
  const handleNextRoomTransition = () => {
    // Check if there are more rooms
    const nextRoomIndex = gameState.currentRoomIndex + 1;
    if (nextRoomIndex < (maze?.rooms.length || 0)) {
      // Update state for next room
      const nextRoom = maze?.rooms[nextRoomIndex];
      const nextMonsterHp = nextRoom?.monster?.maxHp || 50;

      setGameState((prev) => ({
        ...prev,
        phase: "battle",
        currentRoomIndex: nextRoomIndex,
        currentQuestionIndex: 0,
        monsterHp: nextMonsterHp,
        monsterMaxHp: nextMonsterHp,
      }));

      if (isEndlessMode) {
        // Fast waves: no walk-in, unlock the quiz right away.
        playerX.value = 0;
        monsterOpacity.value = 1;
        setIsMonsterHurt(false);
        setIsMonsterFaint(false);
        setIsPlayerAttacking(false);
        setIsMonsterAttacking(false);
        setIsStageTransitioning(false);
        return;
      }

      // Reset positions off-screen left
      playerX.value = -width;
      monsterOpacity.value = 1;
      setIsMonsterHurt(false);
      setIsMonsterFaint(false);
      setIsPlayerAttacking(false);
      setIsMonsterAttacking(false);

      // Walk in to center, then unlock the quiz
      playerX.value = withTiming(0, { duration: BATTLE_TIMING.walkInMs });
      setTimeout(() => {
        setIsStageTransitioning(false);
      }, BATTLE_TIMING.walkInMs);
    } else if (isEndlessMode) {
      // Endless: no more questions in the bank — finish the run gracefully.
      void (async () => {
        try {
          await saveGameScore("atom-maze", scoreRef.current);
          setXpAwardedThisRun(true);
        } catch (error) {
          console.error("Failed to save game score:", error);
          setXpAwardedThisRun(false);
        }
      })();
      playerX.value = 0;
      monsterOpacity.value = 1;
      setGameState((prev) => ({ ...prev, phase: "complete" }));
    } else {
      // All rooms cleared, face the boss!
      setGameState((prev) => ({ ...prev, phase: "boss_intro" }));
      playerX.value = 0;
      monsterOpacity.value = 1;
    }
  };

  // Handle monster defeated
  const handleMonsterDefeated = () => {
    setShowResult(null);
    setSelectedAnswer(null);
    setIsAnswering(false);
    setIsStageTransitioning(true);

    setGameState((prev) => ({
      ...prev,
      defeatedMonsters: prev.defeatedMonsters + 1,
    }));
    setIsMonsterHurt(false);
    setLastDamage(null);

    // Check if this was the boss
    if (isBossBattle) {
      setGameState((prev) => ({ ...prev, phase: "complete" }));

      // Endless mode: save the run's score to the personal game leaderboard
      // instead of awarding XP.
      if (maze) {
        void (async () => {
          try {
            await saveGameScore("atom-maze", scoreRef.current);
            setXpAwardedThisRun(true);
          } catch (error) {
            console.error("Failed to save game score:", error);
            setXpAwardedThisRun(false);
          }
        })();
      }
      return;
    }

    // Animate monster death and player walk
    setIsMonsterFaint(true);

    if (isEndlessMode) {
      // No walking theatrics — roll straight into the next wave.
      runOnJS(handleNextRoomTransition)();
      return;
    }

    monsterOpacity.value = withTiming(0, {
      duration: BATTLE_TIMING.monsterFadeMs,
    });

    // Walk to next room
    setTimeout(() => {
      playerX.value = withTiming(
        width,
        { duration: BATTLE_TIMING.walkOutMs },
        (finished) => {
          if (finished) {
            runOnJS(handleNextRoomTransition)();
          }
        },
      );
    }, BATTLE_TIMING.roomExitDelayMs);
  };

  // Proceed to next room (legacy/fallback)
  const handleNextRoom = () => {
    handleNextRoomTransition();
  };

  // Start boss battle
  const handleStartBossBattle = () => {
    const bossHp = maze?.boss?.maxHp || 100;
    setGameState((prev) => ({
      ...prev,
      phase: "boss",
      currentQuestionIndex: 0,
      monsterHp: bossHp,
      monsterMaxHp: bossHp,
    }));
    setIsMonsterHurt(false);
    setIsMonsterFaint(false);
    setIsPlayerAttacking(false);
    setIsMonsterAttacking(false);
    setIsStageTransitioning(false);
  };

  // Start the game
  const handleStartGame = () => {
    const firstRoomId = maze?.rooms[0]?.id;
    if (maze && firstRoomId && !isEndlessMode) {
      void startMaze(maze.id, firstRoomId);
    }

    setXpAwardedThisRun(null);
    setComboStreak(0);
    setLastDamage(null);
    setIsPlayerHurt(false);
    setIsMonsterHurt(false);
    setIsMonsterFaint(false);
    setIsStageTransitioning(false);
    setGameState((prev) => ({ ...prev, phase: "battle" }));
  };

  const showExitConfirmation = useCallback(() => {
    Alert.alert(
      "Leave AtomMaze?",
      "If you leave now, your current progress in this run will be lost.",
      [
        {
          text: "Stay",
          style: "cancel",
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            router.back();
          },
        },
      ],
    );
  }, [router]);

  // Exit game
  const handleExit = useCallback(() => {
    if (!shouldConfirmExit) {
      router.back();
      return;
    }

    showExitConfirmation();
  }, [router, shouldConfirmExit, showExitConfirmation]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!shouldConfirmExit) {
          return false;
        }

        showExitConfirmation();
        return true;
      },
    );

    return () => subscription.remove();
  }, [shouldConfirmExit, showExitConfirmation]);

  if (!mazeLoaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading maze…</Text>
      </View>
    );
  }

  if (!maze) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Maze not found</Text>
        <TouchableOpacity style={styles.nextButton} onPress={handleExit}>
          <Text style={styles.nextButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render intro screen
  if (gameState.phase === "intro") {
    const mazeColor = getMazeColor(maze.theme);
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? [introPalette.background, introPalette.background]
              : INTRO_SKY_LIGHT
          }
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.introHeader}>
          <TouchableOpacity
            onPress={handleExit}
            style={[
              styles.introBackBtn,
              {
                backgroundColor: introPalette.backBtnBg,
                borderColor: introPalette.backBtnBorder,
              },
            ]}
          >
            <Icon name="ArrowLeft2" size={20} color={introPalette.primaryText} />
          </TouchableOpacity>
          <View
            style={[
              styles.introBadge,
              {
                backgroundColor: mazeColor,
                borderBottomColor: darkenHex(mazeColor, 0.18),
              },
            ]}
          >
            <Icon name="Game" size={18} color="#FFF" variant="Bold" />
            <Text style={styles.introBadgeText}>AtomMaze</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.introScrollView}
          contentContainerStyle={[
            styles.introScrollContent,
            { paddingBottom: introBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={styles.introContainer}
          >
            {/* Title Card */}
            <View
              style={[
                styles.introCard,
                {
                  backgroundColor: introPalette.cardBg,
                  borderColor: introPalette.cardBorder,
                },
              ]}
            >
              <View style={styles.introModeRow}>
                <View
                  style={[
                    styles.introModeIcon,
                    { backgroundColor: `${mazeColor}1A` },
                  ]}
                >
                  <Icon name="Grid9" size={22} color={mazeColor} variant="Bold" />
                </View>
                <Text style={[styles.introTagline, { color: mazeColor }]}>
                  {maze.theme}
                </Text>
              </View>
              <Text
                style={[styles.introTitle, { color: introPalette.primaryText }]}
              >
                {maze.title}
              </Text>
              <Text
                style={[
                  styles.introSubtitle,
                  { color: introPalette.mutedText },
                ]}
              >
                {isEndlessMode
                  ? "Endless waves · No boss"
                  : `${maze.rooms.length} rooms · Boss: ${maze.boss.name}`}
              </Text>
              <Text
                style={[
                  styles.introDescription,
                  { color: introPalette.mutedText },
                ]}
              >
                {maze.description}
              </Text>
            </View>

            {/* How to Play */}
            <HowToPlayCard
                steps={INTRO_HOW_TO_PLAY_STEPS}
                palette={introPalette}
                accentColor={mazeColor}
            />

            {/* Start Button */}
            <TouchableOpacity
              style={[
                styles.startButtonCard,
                {
                  backgroundColor: introPalette.cardBg,
                  borderColor: introPalette.cardBorder,
                },
              ]}
              onPress={handleStartGame}
              activeOpacity={0.9}
            >
              <Icon name="Play" size={26} color={mazeColor} variant="Bold" />
              <Text style={[styles.startButtonCardText, { color: mazeColor }]}>
                START BATTLE
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Render defeat screen
  if (gameState.phase === "defeat") {
    return (
      <LinearGradient
        colors={resultPalette.defeatGradient}
        style={styles.container}
      >
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
          <View
            style={[
              styles.resultStatusChip,
              {
                backgroundColor: resultPalette.chipBg,
                borderColor: resultPalette.chipBorder,
              },
            ]}
          >
            <Icon
              name="Danger"
              size={16}
              color={resultPalette.defeatAccent}
              variant="Bold"
            />
            <Text
              style={[
                styles.resultStatusChipText,
                { color: resultPalette.chipText },
              ]}
            >
              RUN ENDED
            </Text>
          </View>

          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: resultPalette.cardBg,
                borderColor: resultPalette.cardBorder,
                shadowColor: resultPalette.cardShadow,
              },
            ]}
          >
            <View style={styles.resultSpriteRow}>
              <ExpoImage
                source={MAZE_BATTLE_ART.battlerFaint}
                contentFit="contain"
                style={styles.resultSpriteSmall}
              />
              <ExpoImage
                source={MAZE_BATTLE_ART.enemyWin}
                contentFit="contain"
                style={styles.resultSprite}
              />
            </View>
            <Text
              style={[
                styles.defeatTitle,
                { color: resultPalette.defeatAccent },
              ]}
            >
              DEFEATED!
            </Text>
            <Text
              style={[
                styles.defeatSubtitle,
                { color: resultPalette.mutedText },
              ]}
            >
              Your HP reached zero, but your run still counts.
            </Text>

            <View
              style={[
                styles.resultStatsCard,
                {
                  backgroundColor: resultPalette.statsBg,
                  borderColor: resultPalette.statsBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.resultStatRow,
                  { borderBottomColor: resultPalette.statDivider },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  Monsters Defeated
                </Text>
                <Text
                  style={[
                    styles.resultStatValue,
                    { color: resultPalette.primaryText },
                  ]}
                >
                  {gameState.defeatedMonsters}
                </Text>
              </View>
              <View
                style={[
                  styles.resultStatRow,
                  { borderBottomColor: resultPalette.statDivider },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  Final Score
                </Text>
                <Text
                  style={[
                    styles.resultStatValue,
                    { color: resultPalette.primaryText },
                  ]}
                >
                  {gameState.score}
                </Text>
              </View>
              <View
                style={[
                  styles.resultStatRow,
                  {
                    borderBottomColor: resultPalette.statDivider,
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  Room Reached
                </Text>
                <Text
                  style={[
                    styles.resultStatValue,
                    { color: resultPalette.primaryText },
                  ]}
                >
                  {Math.min(gameState.currentRoomIndex + 1, maze.rooms.length)}/
                  {maze.rooms.length}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleExit}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.retryButton3D,
                { backgroundColor: resultPalette.retryButtonDepth },
              ]}
            />
            <View
              style={[
                styles.retryButtonInner,
                { backgroundColor: resultPalette.retryButton },
              ]}
            >
              <Icon name="Refresh" size={22} color="#FFF" variant="Bold" />
              <Text style={styles.retryButtonText}>TRY AGAIN</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Render victory screen (between rooms)
  if (gameState.phase === "victory") {
    return (
      <LinearGradient
        colors={resultPalette.victoryGradient}
        style={styles.container}
      >
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
          <View
            style={[
              styles.resultStatusChip,
              {
                backgroundColor: resultPalette.chipBg,
                borderColor: resultPalette.chipBorder,
              },
            ]}
          >
            <Icon
              name="Cup"
              size={16}
              color={resultPalette.victoryAccent}
              variant="Bold"
            />
            <Text
              style={[
                styles.resultStatusChipText,
                { color: resultPalette.chipText },
              ]}
            >
              ROOM CLEARED
            </Text>
          </View>

          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: resultPalette.cardBg,
                borderColor: resultPalette.cardBorder,
                shadowColor: resultPalette.cardShadow,
              },
            ]}
          >
            <View style={styles.resultSpriteRow}>
              <ExpoImage
                source={MAZE_BATTLE_ART.battlerWin}
                contentFit="contain"
                style={styles.resultSpriteSmall}
              />
              <ExpoImage
                source={MAZE_BATTLE_ART.enemyFaint}
                contentFit="contain"
                style={styles.resultSprite}
              />
            </View>
            <Text
              style={[
                styles.victoryTitle,
                { color: resultPalette.victoryAccent },
              ]}
            >
              MONSTER DEFEATED!
            </Text>
            <Text
              style={[
                styles.victorySubtitle,
                { color: resultPalette.mutedText },
              ]}
            >
              {currentMonster?.defeatMessage || "Well done!"}
            </Text>

            <View
              style={[
                styles.resultStatsCard,
                {
                  backgroundColor: resultPalette.statsBg,
                  borderColor: resultPalette.statsBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.resultStatRow,
                  { borderBottomColor: resultPalette.statDivider },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  Progress
                </Text>
                <Text
                  style={[
                    styles.resultStatValue,
                    { color: resultPalette.primaryText },
                  ]}
                >
                  Room {gameState.currentRoomIndex + 1}/{maze.rooms.length}
                </Text>
              </View>
              <View
                style={[
                  styles.resultStatRow,
                  { borderBottomColor: resultPalette.statDivider },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  Stage Difficulty
                </Text>
                <Text
                  style={[
                    styles.resultStatValue,
                    { color: currentStageDifficultyMeta.chipTextColor },
                  ]}
                >
                  {currentStageDifficultyMeta.label}
                </Text>
              </View>
              <View
                style={[
                  styles.resultStatRow,
                  { borderBottomColor: resultPalette.statDivider },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  Combo Streak
                </Text>
                <Text
                  style={[
                    styles.resultStatValue,
                    { color: resultPalette.primaryText },
                  ]}
                >
                  {comboStreak}x
                </Text>
              </View>
              <View
                style={[
                  styles.resultStatRow,
                  {
                    borderBottomColor: resultPalette.statDivider,
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  HP Remaining
                </Text>
                <Text
                  style={[styles.resultStatValue, { color: theme.success }]}
                >
                  {gameState.playerHp}/{gameState.playerMaxHp}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextRoom}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.nextButton3D,
                { backgroundColor: resultPalette.nextButtonDepth },
              ]}
            />
            <View
              style={[
                styles.nextButtonInner,
                { backgroundColor: resultPalette.nextButton },
              ]}
            >
              <Text style={styles.nextButtonText}>NEXT ROOM</Text>
              <Icon name="ArrowRight2" size={22} color="#FFF" variant="Bold" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Render boss intro screen
  if (gameState.phase === "boss_intro") {
    return (
      <LinearGradient
        colors={["#0B1020", "#1E1B4B", "#7F1D1D"] as const}
        style={styles.container}
      >
        <View style={styles.bossIntroAtmosphere} pointerEvents="none">
          <View style={styles.bossIntroGlowPrimary} />
          <View style={styles.bossIntroGlowSecondary} />
        </View>

        <Animated.View
          entering={FadeInDown.duration(350)}
          style={styles.resultContainer}
        >
          <View style={styles.bossAlertChip}>
            <Icon name="Danger" size={16} color="#FACC15" variant="Bold" />
            <Text style={styles.bossAlertChipText}>FINAL ENCOUNTER</Text>
          </View>

          <View style={styles.bossIntroCard}>
            <View style={styles.bossIntroArtShell}>
              <View style={styles.bossIntroArtRing} />
              <View style={styles.bossIntroArtWrap}>
                <ExpoImage
                  source={MAZE_BATTLE_ART.boss}
                  contentFit="contain"
                  style={styles.bossIntroArt}
                />
              </View>
            </View>
            <Text style={styles.bossIntroTitle}>BOSS BATTLE</Text>
            <Text style={styles.bossIntroName}>
              {maze.boss?.name || "Final Boss"}
            </Text>
            <Text style={styles.bossIntroSubtitle}>
              You cleared every room. One final duel decides the maze.
            </Text>

            <View style={styles.bossStatsRow}>
              <View style={styles.bossStatCard}>
                <Icon name="Heart" size={24} color="#F87171" variant="Bold" />
                <Text style={styles.bossStatValue}>
                  {maze.boss?.maxHp || 100}
                </Text>
                <Text style={styles.bossStatLabel}>BOSS HP</Text>
              </View>
              <View style={styles.bossStatCard}>
                <Icon name="Danger" size={24} color="#FB923C" variant="Bold" />
                <Text style={styles.bossStatValue}>
                  {maze.boss?.attackPower || 30}
                </Text>
                <Text style={styles.bossStatLabel}>BOSS ATK</Text>
              </View>
            </View>

            <View style={styles.bossIntroHintRow}>
              <Icon name="Flash" size={16} color="#FACC15" variant="Bold" />
              <Text style={styles.bossIntroHintText}>
                Correct answers deal direct damage to the boss.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bossButton}
            onPress={handleStartBossBattle}
            activeOpacity={0.9}
          >
            <View style={styles.bossButton3D} />
            <LinearGradient
              colors={["#DC2626", "#F97316"] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bossButtonInner}
            >
              <Icon name="Sword" size={24} color="#FFF" variant="Bold" />
              <Text style={styles.bossButtonText}>ENTER FINAL BATTLE</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Render completion screen
  if (gameState.phase === "complete") {
    return (
      <LinearGradient
        colors={resultPalette.completeGradient}
        style={styles.container}
      >
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
          <View
            style={[
              styles.resultStatusChip,
              {
                backgroundColor: resultPalette.chipBg,
                borderColor: resultPalette.chipBorder,
              },
            ]}
          >
            <Icon
              name="Gift"
              size={16}
              color={resultPalette.completeAccent}
              variant="Bold"
            />
            <Text
              style={[
                styles.resultStatusChipText,
                { color: resultPalette.chipText },
              ]}
            >
              BOSS DEFEATED
            </Text>
          </View>

          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: resultPalette.cardBg,
                borderColor: resultPalette.cardBorder,
                shadowColor: resultPalette.cardShadow,
              },
            ]}
          >
            <View style={styles.resultSpriteRow}>
              <ExpoImage
                source={MAZE_BATTLE_ART.battlerWin}
                contentFit="contain"
                style={styles.resultSprite}
              />
            </View>
            <Text
              style={[
                styles.completeTitle,
                { color: resultPalette.completeAccent },
              ]}
            >
              VICTORY!
            </Text>
            <Text
              style={[
                styles.completeSubtitle,
                { color: resultPalette.mutedText },
              ]}
            >
              You defeated the boss and cleared this run.
            </Text>

            <View
              style={[
                styles.rewardCard,
                {
                  backgroundColor: resultPalette.rewardCardBg,
                  borderColor: resultPalette.rewardCardBorder,
                },
              ]}
            >
              <Icon
                name="Flash"
                size={36}
                color={resultPalette.completeAccent}
                variant="Bold"
              />
              <Text
                style={[styles.rewardText, { color: resultPalette.rewardText }]}
              >
                {xpAwardedThisRun === null
                  ? "Finalizing..."
                  : xpAwardedThisRun
                    ? `${scoreRef.current} points saved!`
                    : "Could not save score"}
              </Text>
            </View>

            <View
              style={[
                styles.resultStatsCard,
                {
                  backgroundColor: resultPalette.statsBg,
                  borderColor: resultPalette.statsBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.resultStatRow,
                  { borderBottomColor: resultPalette.statDivider },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  Monsters Defeated
                </Text>
                <Text
                  style={[
                    styles.resultStatValue,
                    { color: resultPalette.primaryText },
                  ]}
                >
                  {gameState.defeatedMonsters}
                </Text>
              </View>
              <View
                style={[
                  styles.resultStatRow,
                  { borderBottomColor: resultPalette.statDivider },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  Final Score
                </Text>
                <Text
                  style={[
                    styles.resultStatValue,
                    { color: resultPalette.primaryText },
                  ]}
                >
                  {gameState.score}
                </Text>
              </View>
              <View
                style={[
                  styles.resultStatRow,
                  {
                    borderBottomColor: resultPalette.statDivider,
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resultStatLabel,
                    { color: resultPalette.mutedText },
                  ]}
                >
                  HP Remaining
                </Text>
                <Text
                  style={[styles.resultStatValue, { color: theme.success }]}
                >
                  {gameState.playerHp}/{gameState.playerMaxHp}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleExit}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.completeButton3D,
                { backgroundColor: resultPalette.completeButtonDepth },
              ]}
            />
            <View
              style={[
                styles.completeButtonInner,
                { backgroundColor: resultPalette.completeButton },
              ]}
            >
              <Icon name="Gift" size={24} color="#FFF" variant="Bold" />
              <Text style={styles.completeButtonText}>CLAIM REWARD</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Main battle screen
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg, paddingTop: sceneTopPadding },
      ]}
    >
      {/* Modern Battle Arena */}
      <Animated.View
        style={[
          styles.modernBattleArena,
          { height: arenaHeight },
          { backgroundColor: theme.card },
          arenaAnimatedStyle,
        ]}
      >
        <ExpoImage
          source={MAZE_BATTLE_ART.backdrop}
          contentFit="cover"
          style={styles.battleBackdropImage}
        />
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? (["rgba(2,6,23,0.85)", "rgba(2,6,23,0.45)"] as const)
              : (["rgba(255,255,255,0.18)", "rgba(15,23,42,0.5)"] as const)
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.battleBackdropOverlay}
        />

        {/* Header: HUD bar (in flow) */}
        <View style={styles.arenaHeader}>
          <View style={styles.arenaHudContainer}>
            <View style={styles.arenaHudGlass}>
              <TouchableOpacity
                onPress={handleExit}
                style={styles.arenaHudBackBtn}
              >
                <Icon name="ArrowLeft2" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.arenaHudCenter}>
                <Text style={styles.arenaHudTitle}>
                  {isBossBattle
                    ? "⚔️ BOSS BATTLE"
                    : `Room ${gameState.currentRoomIndex + 1}/${maze.rooms.length}`}
                </Text>
                <View style={styles.arenaHudMetaRow}>
                  <View style={styles.arenaHudScoreBadge}>
                    <Icon name="Cup" size={13} color="#FCD34D" variant="Bold" />
                    <Text style={styles.arenaHudScoreText}>
                      {gameState.score}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.arenaHudDifficultyChip,
                      {
                        backgroundColor:
                          currentStageDifficultyMeta.chipBackgroundColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.arenaHudDifficultyText,
                        { color: currentStageDifficultyMeta.chipTextColor },
                      ]}
                    >
                      {currentStageDifficultyMeta.label}
                    </Text>
                  </View>
                  <View style={styles.arenaHudChip}>
                    <Icon name="MessageQuestion" size={12} color="#E2E8F0" />
                    <Text style={styles.arenaHudChipText}>
                      Q
                      {Math.min(
                        gameState.currentQuestionIndex + 1,
                        Math.max(currentQuestions.length, 1),
                      )}
                      /{Math.max(currentQuestions.length, 1)}
                    </Text>
                  </View>
                  {comboStreak > 1 && (
                    <View style={styles.arenaHudComboChip}>
                      <Icon
                        name="Flash"
                        size={12}
                        color="#FFFFFF"
                        variant="Bold"
                      />
                      <Text style={styles.arenaHudComboText}>x{comboStreak}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.arenaHudPlaceholder} />
            </View>
          </View>

          {/* HP cards below the header — never overlaps it */}
          <View style={styles.arenaHpRow}>
            <PokemonHpBox
              name="You"
              sub={`Room ${Math.min(gameState.currentRoomIndex + 1, totalRoomCount)}/${totalRoomCount}`}
              current={gameState.playerHp}
              max={gameState.playerMaxHp}
              cardStyle={hpCard.cardStyle}
              textColor={hpCard.textColor}
              subColor={hpCard.subColor}
              valueColor={hpCard.valueColor}
            />
            <PokemonHpBox
              name={currentMonster?.name || "Monster"}
              sub={isBossBattle ? "BOSS" : currentStageDifficultyMeta.label}
              current={gameState.monsterHp}
              max={gameState.monsterMaxHp}
              cardStyle={hpCard.cardStyle}
              textColor={hpCard.textColor}
              subColor={hpCard.subColor}
              valueColor={hpCard.valueColor}
            />
          </View>
        </View>

        {/* Fighters + transient boss notice */}
        <View style={styles.arenaFighters}>
          {isBossBattle && showBossNotice && (
            <Animated.View
              entering={FadeInDown.duration(220)}
              exiting={FadeOut.duration(180)}
              style={styles.bossBattleNotice}
            >
              <Icon name="Danger" size={16} color="#FDE68A" variant="Bold" />
              <Text style={styles.bossBattleNoticeText}>
                Boss battle started. Correct answers deal direct damage.
              </Text>
            </Animated.View>
          )}

          {/* Player Side */}
        <Animated.View style={[styles.modernFighter, playerAnimatedStyle]}>
          <View style={styles.fighterSpriteWrap}>
            <PlayerIcon
              isAttacking={isPlayerAttacking}
              isHurt={isPlayerHurt}
            />
            {lastDamage?.target === "player" && (
              <Animated.View
                entering={FadeInDown.duration(120)}
                exiting={FadeOut.duration(180)}
                style={styles.damagePopupPlayer}
              >
                <Text style={styles.damagePopupText}>
                  -{lastDamage.amount}
                </Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Monster Side */}
        <Animated.View style={[styles.modernFighter, monsterAnimatedStyle]}>
          <View style={styles.fighterSpriteWrap}>
            <MonsterIcon
              isBoss={isBossBattle}
              isHurt={isMonsterHurt}
              isAttacking={isMonsterAttacking}
              isFaint={isMonsterFaint}
              isLowBoss={isBossLowHp}
            />
            {lastDamage?.target === "monster" && (
              <Animated.View
                entering={FadeInDown.duration(120)}
                exiting={FadeOut.duration(180)}
                style={styles.damagePopupMonster}
              >
                <Text style={styles.damagePopupText}>
                  -{lastDamage.amount}
                </Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>
        </View>
      </Animated.View>

      {/* Question Area */}
      <ScrollView
        style={styles.questionArea}
        contentContainerStyle={[
          styles.questionAreaContent,
          { paddingBottom: questionBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {currentQuestion && (
          <View style={styles.quizCard}>
            <Text style={[styles.lessonQuestionText, { color: theme.text }]}>
              {currentQuestion.question}
            </Text>
          </View>
        )}

        {/* Answer Options — same design as the lesson-screen quiz */}
        {currentQuestion && (
          <View style={styles.quizOptions}>
            {currentQuestion.options.map((option: string, index: number) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrectness = showResult !== null;
              const isWrongAnswer = showCorrectness && isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.lessonOption,
                    quizPalette.option,
                    showCorrectness &&
                      isCorrect &&
                      quizPalette.correct,
                    isWrongAnswer && quizPalette.wrong,
                    !showCorrectness &&
                      isSelected &&
                      quizPalette.selected,
                  ]}
                  onPress={() => handleQuizAnswer(index)}
                  disabled={showResult !== null || isStageTransitioning}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.lessonOptionText,
                      { color: theme.text },
                      showCorrectness &&
                        isCorrect &&
                        { color: quizPalette.textCorrect },
                      isWrongAnswer && { color: quizPalette.textWrong },
                      (showCorrectness || isSelected) &&
                        styles.lessonOptionTextEmphasis,
                    ]}
                  >
                    {option}
                  </Text>
                  {showCorrectness && isCorrect && (
                    <Icon
                      name="TickCircle"
                      size={22}
                      color="#2ECC71"
                      variant="Bold"
                    />
                  )}
                  {isWrongAnswer && (
                    <Icon
                      name="CloseCircle"
                      size={22}
                      color="#EF4444"
                      variant="Bold"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Result feedback — Lab-style tinted box, mode-aware */}
        {showResult && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={[
              styles.quizResultBox,
              showResult === "correct"
                ? quizPalette.feedbackCorrect
                : quizPalette.feedbackWrong,
            ]}
          >
            <Icon
              name={showResult === "correct" ? "TickCircle" : "CloseCircle"}
              size={30}
              color={showResult === "correct" ? "#2ECC71" : "#EF4444"}
              variant="Bold"
            />
            <View style={styles.quizResultContent}>
              <Text
                style={[
                  styles.quizResultTitle,
                  {
                    color:
                      showResult === "correct"
                        ? quizPalette.textCorrect
                        : quizPalette.textWrong,
                  },
                ]}
              >
                {showResult === "correct"
                  ? comboStreak > 1
                    ? `COMBO x${comboStreak}!`
                    : "DIRECT HIT!"
                  : "MONSTER STRIKES!"}
              </Text>
              <Text
                style={[styles.quizResultSubtitle, { color: theme.text }]}
              >
                {showResult === "correct"
                  ? comboStreak > 1
                    ? "Direct hit on the monster!"
                    : isBossBattle
                      ? "The boss takes damage."
                      : "The monster is defeated."
                  : "Ouch! The monster strikes back."}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Submit button */}
        {!showResult && (
          <View style={styles.attackActionWrap}>
            <TouchableOpacity
              style={[
                styles.modernSubmitButton,
                (selectedAnswer === null || isStageTransitioning) &&
                  styles.modernSubmitButtonDisabled,
                { backgroundColor: theme.primary, borderBottomColor: theme.primaryDark },
              ]}
              onPress={handleSubmit}
              disabled={selectedAnswer === null || isStageTransitioning}
            >
              <View style={styles.modernSubmitGradient}>
                <Icon name="Sword" size={22} color="#FFF" variant="Bold" />
                <Text style={styles.modernSubmitText}>
                  {selectedAnswer === null ? "PICK AN ANSWER" : "ATTACK NOW"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
