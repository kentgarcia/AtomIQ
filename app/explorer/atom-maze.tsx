import { Icon } from "@/components/ui/icon";
import type { QuizQuestion as AtomMazeQuizQuestion } from "@/content/explorer";
import { getMazeById } from "@/content/explorer";
import {
    getMythBusterQuizQuestionsByDifficulty,
    type MythBusterQuizDifficulty,
} from "@/content/quizzes";
import type { QuizQuestion as RepositoryQuizQuestion } from "@/content/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { startMaze } from "@/services/explorer-storage";
import { playGameSfx, preloadGameSfx } from "@/services/game-sfx";
import { useStorage } from "@/services/StorageContext";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    BackHandler,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

// Modern Theme
const THEME = {
  light: {
    bg: "#FFFFFF",
    card: "#F9FAFB",
    text: "#111827",
    textMuted: "#6B7280",
    primary: "#FFB300",
    primaryDark: "#FFA000",
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    playerColor: "#3B82F6",
    monsterColor: "#EF4444",
    border: "#E5E7EB",
    shadow: "rgba(0, 0, 0, 0.1)",
  },
  dark: {
    bg: "#0F172A",
    card: "#1E293B",
    text: "#F1F5F9",
    textMuted: "#94A3B8",
    primary: "#FFB300",
    primaryDark: "#FFA000",
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    playerColor: "#3B82F6",
    monsterColor: "#EF4444",
    border: "#334155",
    shadow: "rgba(0, 0, 0, 0.3)",
  },
};

const MAZE_BATTLE_ART = {
  backdrop: require("@/assets/images/maze/backdrop.png"),
  battler: require("@/assets/images/maze/battler.png"),
  battlerHurt: require("@/assets/images/maze/battler_hurt.png"),
  enemy: require("@/assets/images/maze/enemy.png"),
  enemyHurt: require("@/assets/images/maze/enemy_hurt.png"),
  boss: require("@/assets/images/maze/boss.png"),
  bossLow: require("@/assets/images/maze/boss_low.png"),
};

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

const getEndlessRunXpReward = (baseXpReward: number): number => {
  if (baseXpReward <= 0) {
    return 0;
  }

  return Math.max(20, Math.round(baseXpReward * 0.35));
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
  emoji: string;
  title: string;
  hint: string;
  accentColor: string;
}

const INTRO_HOW_TO_PLAY_STEPS: IntroHowToPlayStep[] = [
  {
    id: "quiz",
    emoji: "❓",
    title: "Answer Quiz",
    hint: "Choose the best answer to keep advancing.",
    accentColor: "#F59E0B",
  },
  {
    id: "combo",
    emoji: "🔥",
    title: "Build Combo",
    hint: "Consecutive correct picks keep your momentum high.",
    accentColor: "#F97316",
  },
  {
    id: "focus",
    emoji: "🎯",
    title: "Keep Focus",
    hint: "Wrong answers reset your combo streak.",
    accentColor: "#3B82F6",
  },
  {
    id: "stage",
    emoji: "🧭",
    title: "Clear Stage",
    hint: "Complete each stage to move to the next one.",
    accentColor: "#EF4444",
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
): AtomMazeQuizQuestion | null => {
  if (!question.options || question.options.length < 2) {
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

const PlayerIcon = ({ isHurt }: { isHurt?: boolean }) => (
  <View
    style={{
      width: 112,
      height: 112,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <ExpoImage
      source={isHurt ? MAZE_BATTLE_ART.battlerHurt : MAZE_BATTLE_ART.battler}
      contentFit="contain"
      transition={120}
      style={{ width: "100%", height: "100%" }}
    />
  </View>
);

const MonsterIcon = ({
  isBoss,
  isHurt,
  isLowBoss,
}: {
  isBoss?: boolean;
  isHurt?: boolean;
  isLowBoss?: boolean;
}) => {
  const source = isBoss
    ? isLowBoss
      ? MAZE_BATTLE_ART.bossLow
      : MAZE_BATTLE_ART.boss
    : isHurt
      ? MAZE_BATTLE_ART.enemyHurt
      : MAZE_BATTLE_ART.enemy;

  return (
    <View
      style={{
        width: isBoss ? 148 : 112,
        height: isBoss ? 148 : 112,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ExpoImage
        source={source}
        contentFit="contain"
        transition={120}
        style={{ width: "100%", height: "100%" }}
      />
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
  const { addXP } = useStorage();
  const insets = useSafeAreaInsets();

  const maze = useMemo(() => {
    if (!id) return null;
    return getMazeById(id);
  }, [id]);
  const endlessRunXpReward = useMemo(
    () => getEndlessRunXpReward(maze?.xpReward || 0),
    [maze?.xpReward],
  );

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
  const [showBossNotice, setShowBossNotice] = useState(false);

  const colorScheme = useColorScheme();
  const theme = THEME[colorScheme ?? "light"];
  const introPalette = useMemo(() => {
    if (colorScheme === "dark") {
      return {
        gradientColors: ["#0B1220", "#1E293B", "#0F172A"] as const,
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
      gradientColors: ["#FFFDE7", "#FFF9C4", "#FFEE58"] as const,
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
  const arenaHeight = Math.min(Math.max(height * 0.42, 270), 360);
  const sceneTopPadding = Math.max(insets.top + 4, 10);
  const questionBottomPadding = Math.max(insets.bottom + 12, 18);
  const introBottomPadding = Math.max(insets.bottom + 28, 36);
  const arenaTextColor = "#F8FAFC";
  const arenaMutedTextColor = "#CBD5E1";
  const arenaTrackColor = "rgba(148, 163, 184, 0.4)";
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
    }, BATTLE_TIMING.resultMs - 120);

    return () => clearTimeout(timeoutId);
  }, [lastDamage]);

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
  useEffect(() => {
    if (maze) {
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
        getMythBusterQuizQuestionsByDifficulty(
          STAGE_TO_REPOSITORY_DIFFICULTY[difficulty],
        )
          .map((question) => toAtomMazeBossQuizQuestion(question))
          .filter(
            (question): question is AtomMazeQuizQuestion => question !== null,
          )
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
  }, [isBossBattle, maze, currentRoom]);

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
      playerLunge.value = withSequence(
        withTiming(26, { duration: 90 }),
        withTiming(0, { duration: 130 }),
      );
      playerScale.value = withSequence(
        withTiming(1.16, { duration: 90 }),
        withTiming(1, { duration: 130 }),
      );
    } else {
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
    if (isAnswering || showResult) return;

    if (selectedAnswer === index) {
      handleSubmit();
      return;
    }

    setSelectedAnswer(index);
  };

  // Submit answer
  const handleSubmit = () => {
    if (isAnswering || !currentQuestion || selectedAnswer === null) return;

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
          }, BATTLE_TIMING.resultMs);
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
          }, BATTLE_TIMING.resultMs);
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
        }, BATTLE_TIMING.resultMs);
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
        setTimeout(() => {
          setGameState((prev) => ({ ...prev, phase: "defeat" }));
        }, BATTLE_TIMING.resultMs);
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
      }, BATTLE_TIMING.resultMs);
    }
  };

  // Handle next room transition
  const handleNextRoomTransition = () => {
    // Check if there are more rooms
    const nextRoomIndex = gameState.currentRoomIndex + 1;
    if (nextRoomIndex < (maze?.rooms.length || 0)) {
      // Reset positions off-screen left
      playerX.value = -width;
      monsterOpacity.value = 1;
      setIsMonsterHurt(false);

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

      // Walk in to center
      playerX.value = withTiming(0, { duration: BATTLE_TIMING.walkInMs });
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

    setGameState((prev) => ({
      ...prev,
      defeatedMonsters: prev.defeatedMonsters + 1,
    }));
    setIsMonsterHurt(false);
    setLastDamage(null);

    // Check if this was the boss
    if (isBossBattle) {
      setGameState((prev) => ({ ...prev, phase: "complete" }));

      // Endless mode: no persistent completion mark, grant lower XP each clear.
      if (maze) {
        void (async () => {
          try {
            if (endlessRunXpReward > 0) {
              await addXP(endlessRunXpReward);
              setXpAwardedThisRun(true);
            } else {
              setXpAwardedThisRun(false);
            }
          } catch (error) {
            console.error("Failed to grant endless run XP:", error);
            setXpAwardedThisRun(false);
          }
        })();
      }
      return;
    }

    // Animate monster death and player walk
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
  };

  // Start the game
  const handleStartGame = () => {
    const firstRoomId = maze?.rooms[0]?.id;
    if (maze && firstRoomId) {
      void startMaze(maze.id, firstRoomId);
    }

    setXpAwardedThisRun(null);
    setComboStreak(0);
    setLastDamage(null);
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

  if (!maze) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Maze not found</Text>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render intro screen
  if (gameState.phase === "intro") {
    return (
      <LinearGradient
        colors={introPalette.gradientColors}
        style={styles.container}
      >
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
            <Icon name="ArrowLeft2" size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.introBadge}>
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
                {maze.theme}
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
            <View
              style={[
                styles.introHowToPlay,
                {
                  backgroundColor: introPalette.cardBg,
                  borderColor: introPalette.cardBorder,
                },
              ]}
            >
              <View style={styles.introHowToPlayHeaderRow}>
                <View
                  style={[
                    styles.introHowToPlayHeaderIcon,
                    { backgroundColor: introPalette.iconWrapBg },
                  ]}
                >
                  <Icon
                    name="MessageQuestion"
                    size={16}
                    color={theme.primary}
                    variant="Bold"
                  />
                </View>
                <Text
                  style={[
                    styles.introHowToPlayTitle,
                    { color: introPalette.primaryText },
                  ]}
                >
                  How to Play
                </Text>
              </View>
              <View style={styles.introSwipeRow}>
                {INTRO_HOW_TO_PLAY_STEPS.map((step, index) => (
                  <View
                    key={step.id}
                    style={[
                      styles.introSwipeItem,
                      {
                        backgroundColor: introPalette.subtleBg,
                        borderColor: introPalette.subtleBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.introStepNumber,
                        { backgroundColor: step.accentColor },
                      ]}
                    >
                      <Text style={styles.introStepNumberText}>
                        {index + 1}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.introSwipeIconWrap,
                        { backgroundColor: introPalette.iconWrapBg },
                      ]}
                    >
                      <Text style={styles.introSwipeEmoji}>{step.emoji}</Text>
                    </View>
                    <View style={styles.introSwipeCopy}>
                      <Text
                        style={[
                          styles.introSwipeLabel,
                          { color: introPalette.primaryText },
                        ]}
                      >
                        {step.title}
                      </Text>
                      <Text
                        style={[
                          styles.introSwipeHint,
                          { color: introPalette.mutedText },
                        ]}
                      >
                        {step.hint}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartGame}
              activeOpacity={0.9}
            >
              <View style={styles.startButton3DBottom} />
              <LinearGradient
                colors={["#FFB300", "#FFA000"] as const}
                style={styles.startButtonGradient}
              >
                <Icon name="Play" size={28} color="#FFF" variant="Bold" />
                <Text style={styles.startButtonText}>START BATTLE</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
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
            <Text style={styles.defeatEmoji}>💀</Text>
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
            <Text style={styles.victoryEmoji}>⚔️</Text>
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
            <Text style={styles.completeEmoji}>🏆</Text>
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
                    ? `+${endlessRunXpReward} XP`
                    : "XP reward unavailable"}
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
          <PlayerIcon isHurt={isPlayerHurt} />
          {lastDamage?.target === "player" && (
            <Animated.View
              entering={FadeInDown.duration(120)}
              exiting={FadeOut.duration(180)}
              style={styles.damagePopupPlayer}
            >
              <Text style={styles.damagePopupText}>-{lastDamage.amount}</Text>
            </Animated.View>
          )}
          <View style={styles.modernHpContainer}>
            <Text style={[styles.modernFighterName, { color: arenaTextColor }]}>
              You
            </Text>
            <View
              style={[
                styles.modernHpBarBg,
                { backgroundColor: arenaTrackColor },
              ]}
            >
              <Animated.View
                style={[
                  styles.modernHpBarFill,
                  {
                    width: `${(gameState.playerHp / gameState.playerMaxHp) * 100}%`,
                    backgroundColor:
                      gameState.playerHp > gameState.playerMaxHp * 0.5
                        ? theme.success
                        : gameState.playerHp > gameState.playerMaxHp * 0.25
                          ? theme.warning
                          : theme.error,
                  },
                ]}
              />
            </View>
            <Text style={[styles.modernHpText, { color: arenaMutedTextColor }]}>
              {gameState.playerHp}/{gameState.playerMaxHp} HP
            </Text>
          </View>
        </Animated.View>

        {/* VS Badge */}
        <View style={[styles.vsBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Monster Side */}
        <Animated.View style={[styles.modernFighter, monsterAnimatedStyle]}>
          <MonsterIcon
            isBoss={isBossBattle}
            isHurt={isMonsterHurt}
            isLowBoss={isBossLowHp}
          />
          {lastDamage?.target === "monster" && (
            <Animated.View
              entering={FadeInDown.duration(120)}
              exiting={FadeOut.duration(180)}
              style={styles.damagePopupMonster}
            >
              <Text style={styles.damagePopupText}>-{lastDamage.amount}</Text>
            </Animated.View>
          )}
          <View style={styles.modernHpContainer}>
            <Text style={[styles.modernFighterName, { color: arenaTextColor }]}>
              {currentMonster?.name || "Monster"}
            </Text>
            <View
              style={[
                styles.modernHpBarBg,
                { backgroundColor: arenaTrackColor },
              ]}
            >
              <Animated.View
                style={[
                  styles.modernHpBarFill,
                  {
                    width: `${(gameState.monsterHp / gameState.monsterMaxHp) * 100}%`,
                    backgroundColor: theme.error,
                  },
                ]}
              />
            </View>
            <Text style={[styles.modernHpText, { color: arenaMutedTextColor }]}>
              {gameState.monsterHp}/{gameState.monsterMaxHp} HP
            </Text>
          </View>
        </Animated.View>
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
          <View
            style={[
              styles.modernQuestionCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View
              style={[
                styles.modernQuestionBadge,
                { backgroundColor: theme.primary },
              ]}
            >
              <Icon
                name="MessageQuestion"
                size={18}
                color="#FFF"
                variant="Bold"
              />
            </View>
            <Text style={[styles.modernQuestionText, { color: theme.text }]}>
              {currentQuestion.question}
            </Text>
          </View>
        )}

        {/* Answer Options */}
        {currentQuestion && (
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option: string, index: number) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrectness = showResult !== null;
              const isWrongAnswer = showCorrectness && isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modernOptionButton,
                    styles.modernOptionButtonHalf,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      shadowColor: theme.shadow,
                    },
                    showCorrectness &&
                      isCorrect &&
                      isSelected &&
                      styles.modernOptionCorrect,
                    isWrongAnswer && styles.modernOptionWrong,
                    !showCorrectness &&
                      isSelected && [
                        styles.modernOptionSelected,
                        { borderColor: theme.primary },
                      ],
                  ]}
                  onPress={() => handleQuizAnswer(index)}
                  disabled={showResult !== null}
                >
                  <View
                    style={[
                      styles.modernOptionBadge,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <Text style={styles.modernOptionBadgeText}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.modernOptionText,
                      { color: theme.text },
                      showCorrectness &&
                        isCorrect &&
                        isSelected &&
                        styles.modernOptionTextCorrect,
                      isWrongAnswer && styles.modernOptionTextWrong,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Result feedback */}
        {showResult && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={[
              styles.modernResultFeedback,
              showResult === "correct"
                ? styles.modernResultCorrect
                : styles.modernResultWrong,
            ]}
          >
            <Icon
              name={showResult === "correct" ? "TickCircle" : "CloseCircle"}
              size={24}
              color="#FFF"
              variant="Bold"
            />
            <Text style={styles.modernResultText}>
              {showResult === "correct"
                ? comboStreak > 1
                  ? `Combo x${comboStreak}! Direct hit!`
                  : isBossBattle
                    ? "Boss takes damage!"
                    : "Monster defeated!"
                : "Ouch! The monster strikes back"}
            </Text>
          </Animated.View>
        )}

        {/* Submit button */}
        {!showResult && (
          <View style={styles.attackActionWrap}>
            {selectedAnswer !== null && (
              <Text style={styles.quickTapHint}>
                Tap the same answer again for instant attack
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.modernSubmitButton,
                selectedAnswer === null && styles.modernSubmitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={selectedAnswer === null}
            >
              <LinearGradient
                colors={
                  selectedAnswer === null
                    ? ["#9CA3AF", "#6B7280"]
                    : ["#FFB300", "#FF8F00"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernSubmitGradient}
              >
                <Icon name="Sword" size={24} color="#FFF" variant="Bold" />
                <Text style={styles.modernSubmitText}>
                  {selectedAnswer === null ? "PICK AN ANSWER" : "ATTACK NOW"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
  },

  // Modern Header
  modernHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modernBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modernHeaderCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  modernHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modernScoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modernHudRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modernHudChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modernHudChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modernComboChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F97316",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  modernComboChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // Modern Battle Arena
  modernBattleArena: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 92,
    paddingBottom: 22,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 22,
    overflow: "hidden",
    minHeight: 270,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  arenaHudContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 3,
  },
  arenaHudGlass: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  arenaHudBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  arenaHudCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  arenaHudTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  arenaHudMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  arenaHudScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
  },
  arenaHudScoreText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  arenaHudDifficultyChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  arenaHudDifficultyText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  arenaHudChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  arenaHudChipText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  arenaHudComboChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F97316",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arenaHudComboText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  arenaHudPlaceholder: {
    width: 34,
  },
  bossBattleNotice: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 70,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(153, 27, 27, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.65)",
  },
  bossBattleNoticeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  battleBackdropImage: {
    ...StyleSheet.absoluteFillObject,
  },
  battleBackdropOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modernFighter: {
    alignItems: "center",
    gap: 12,
    flex: 1,
    zIndex: 1,
  },
  modernHpContainer: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  modernFighterName: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernHpBarBg: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  modernHpBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  modernHpText: {
    fontSize: 11,
    fontWeight: "600",
  },
  damagePopupPlayer: {
    backgroundColor: "rgba(239, 68, 68, 0.92)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  damagePopupMonster: {
    backgroundColor: "rgba(16, 185, 129, 0.92)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  damagePopupText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  vsBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  vsText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  gbContainer: {
    backgroundColor: "#1a1a1a",
    padding: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginHorizontal: 16,
    marginTop: 50,
    marginBottom: 12,
  },
  gbBezel: {
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 8,
  },
  gbScreen: {
    backgroundColor: "#C4CFA1",
    borderRadius: 4,
    overflow: "hidden",
    height: 200,
    borderWidth: 4,
    borderColor: "#4D533C",
  },
  gbScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#8B956D",
    borderBottomWidth: 2,
    borderBottomColor: "#4D533C",
    gap: 8,
  },
  gbBackBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C4CFA1",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4D533C",
    flexShrink: 0,
  },
  gbScreenTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    color: "#1F1F1F",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    textTransform: "uppercase",
    marginHorizontal: 4,
  },
  gbScoreBadge: {
    backgroundColor: "#4D533C",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: "center",
    flexShrink: 0,
  },
  gbScoreText: {
    color: "#C4CFA1",
    fontWeight: "800",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  gbFooter: {
    alignItems: "center",
    marginTop: 12,
  },
  gbLogo: {
    color: "#CCC",
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  gbLogoItalic: {
    fontWeight: "400",
    fontSize: 14,
  },
  floorLine: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#4D533C",
    zIndex: 0,
  },
  fighterContainer: {
    alignItems: "center",
    gap: 8,
    width: 100,
  },
  hpBarContainer: {
    width: "100%",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  fighterName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1F1F1F",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    textTransform: "uppercase",
  },
  hpBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: "#8B956D",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    overflow: "hidden",
  },
  hpBarFill: {
    height: "100%",
    borderRadius: 0,
    backgroundColor: "#1F1F1F",
  },
  hpText: {
    fontSize: 8,
    color: "#1F1F1F",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  svgContainer: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },

  // Question Area
  questionArea: {
    flex: 1,
    marginTop: 10,
  },
  questionAreaContent: {
    paddingHorizontal: 14,
    paddingBottom: 18,
    gap: 10,
  },
  modernQuestionCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  modernQuestionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  modernQuestionText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },

  // Modern Options
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  modernOptionButton: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 2,
    minHeight: 78,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernOptionButtonHalf: {
    width: "48.4%",
  },
  modernOptionSelected: {
    borderWidth: 3,
    shadowOpacity: 0.15,
  },
  modernOptionCorrect: {
    borderColor: "#10B981",
    backgroundColor: "#D1FAE5",
  },
  modernOptionWrong: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
  modernOptionBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  modernOptionBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  modernOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  modernOptionTextCorrect: {
    color: "#065F46",
    fontWeight: "700",
  },
  modernOptionTextWrong: {
    color: "#991B1B",
    fontWeight: "700",
  },

  // Scramble
  scrambleContainer: {
    alignItems: "center",
    gap: 14,
  },
  scrambleAnswer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  scrambleAnswerSingleLine: {
    flexWrap: "nowrap",
  },
  scrambleSlot: {
    width: 40,
    height: 48,
    backgroundColor: "#FFF8E1",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFE082",
    borderStyle: "dashed",
  },
  scrambleSlotFilled: {
    backgroundColor: "#FFFFFF",
    borderStyle: "solid",
    borderColor: "#FFB300",
    borderBottomWidth: 3,
  },
  scrambleSlotRevealed: {
    backgroundColor: "#DCFCE7",
    borderStyle: "solid",
    borderColor: "#22C55E",
    borderBottomWidth: 3,
  },
  scrambleSlotCorrect: {
    borderColor: "#22C55E",
    backgroundColor: "#DCFCE7",
  },
  scrambleSlotWrong: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
  scrambleSlotText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },
  scrambleSlotTextRevealed: {
    color: "#166534",
  },
  scrambleLetters: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    maxWidth: width - 40,
  },
  scrambleLetter: {
    width: 40,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: "#E5E7EB",
  },
  scrambleLetterText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },
  scrambleActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },
  shuffleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#6B7280",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#4B5563",
  },
  shuffleButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  hintTimerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  hintTimerText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "600",
  },
  revealedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  revealedBadgeText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
  },

  // Modern Result Feedback
  modernResultFeedback: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modernResultCorrect: {
    backgroundColor: "#10B981",
  },
  modernResultWrong: {
    backgroundColor: "#EF4444",
  },
  modernResultText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  attackActionWrap: {
    gap: 8,
  },
  quickTapHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A3412",
    textAlign: "center",
  },

  // Modern Submit Button
  modernSubmitButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modernSubmitButtonDisabled: {
    opacity: 0.6,
  },
  modernSubmitGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  modernSubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  // Intro Screen
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  introBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  introBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFB300",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderBottomWidth: 4,
    borderBottomColor: "#FFA000",
  },
  introBadgeText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
  },
  introScrollView: {
    flex: 1,
  },
  introScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  introContainer: {
    gap: 20,
  },
  introCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1F2937",
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  introDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
  },
  introHowToPlay: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  introHowToPlayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  introHowToPlayHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  introHowToPlayTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  introSwipeRow: {
    flexDirection: "column",
    gap: 10,
  },
  introSwipeItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F9FAFB",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  introStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  introStepNumberText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  introSwipeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF3D9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  introSwipeEmoji: {
    fontSize: 16,
  },
  introSwipeCopy: {
    flex: 1,
    gap: 2,
  },
  introSwipeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  introSwipeHint: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    lineHeight: 16,
  },
  startButton: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  startButton3DBottom: {
    position: "absolute",
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#FFA000",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  startButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 40,
    gap: 12,
  },
  startButtonText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: "#6B7280",
    fontSize: 14,
  },

  // Result Screens
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  resultStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  resultStatusChipText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: "100%",
    maxWidth: 340,
  },
  resultStatsCard: {
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 2,
    borderColor: "#FFE082",
  },
  resultStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE082",
  },
  resultStatLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  resultStatValue: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "800",
  },
  defeatEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  defeatTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#EF4444",
    marginBottom: 8,
  },
  defeatSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
  },
  victoryEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#10B981",
    marginBottom: 8,
  },
  victorySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  bossIntroEmoji: {
    fontSize: 100,
    marginBottom: 16,
  },
  bossIntroTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FACC15",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  bossIntroName: {
    fontSize: 25,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 10,
    textAlign: "center",
  },
  bossIntroSubtitle: {
    fontSize: 15,
    color: "#CBD5E1",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  bossIntroAtmosphere: {
    ...StyleSheet.absoluteFillObject,
  },
  bossIntroGlowPrimary: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -70,
    right: -90,
    backgroundColor: "rgba(239, 68, 68, 0.22)",
  },
  bossIntroGlowSecondary: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 135,
    bottom: -80,
    left: -70,
    backgroundColor: "rgba(79, 70, 229, 0.2)",
  },
  bossAlertChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(127, 29, 29, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.7)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 12,
  },
  bossAlertChipText: {
    color: "#FEF3C7",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  bossIntroCard: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "rgba(2, 6, 23, 0.68)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.5)",
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#7F1D1D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  bossIntroArtShell: {
    width: 176,
    height: 176,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  bossIntroArtRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 88,
    borderWidth: 2,
    borderColor: "rgba(248, 113, 113, 0.75)",
    backgroundColor: "rgba(153, 27, 27, 0.18)",
  },
  bossStatsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 2,
  },
  bossStatCard: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.66)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
  },
  bossStatValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
    marginTop: 6,
  },
  bossStatLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    marginTop: 2,
  },
  bossIntroArtWrap: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
  },
  bossIntroArt: {
    width: "100%",
    height: "100%",
  },
  bossIntroHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(30, 41, 59, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.4)",
  },
  bossIntroHintText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  completeEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#F59E0B",
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
  },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: "#FACC15",
  },
  rewardText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#B45309",
  },
  retryButton: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  retryButton3D: {
    position: "absolute",
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#B91C1C",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  retryButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#EF4444",
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  nextButton: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  nextButton3D: {
    position: "absolute",
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#047857",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  nextButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#10B981",
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
  },
  nextButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  bossButton: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  bossButton3D: {
    position: "absolute",
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#991B1B",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  bossButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
  },
  bossButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  completeButton: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  completeButton3D: {
    position: "absolute",
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#B45309",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  completeButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F59E0B",
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  completeButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
});
