import {fontFamilies} from "@/theme";
import { MarkdownText } from "@/components/markdown-text";
import { Icon } from "@/components/ui/icon";
import { HowToPlayCard } from "@/components/games/HowToPlayCard";
import { getAllMyths } from "@/content/myths";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useStorage } from "@/services/StorageContext";
import { logDailyActivity, saveGameScore } from "@/services/database";
import { toLocalIsoDate } from "@/services/utils";
import { recordMissionEvent } from "@/services/missions";
import { playGameSfx, preloadGameSfx } from "@/services/game-sfx";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextProps,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, EASE_OUT, PRESS_EASING } from "@/theme/motion";

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.3;
const LOSE_EXPLOSION_DURATION_MS = 700;
const RESULT_CARD_W = width - 96;
const RESULTS_CARD_GAP = 12;
const RESULTS_STEP = RESULT_CARD_W + RESULTS_CARD_GAP;
const RESULTS_CARD_OFFSET = (width - 48 - RESULT_CARD_W) / 2;

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

// Fabric-safe count-up label: animatedProps `text` does not render on the New
// Architecture, so the count-up runs in JS requestAnimationFrame instead.
const CountUpText = ({
  value,
  suffix = "",
  style,
}: {
  value: number;
  suffix?: string;
  style?: TextProps["style"];
}) => {
  const [display, setDisplay] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    const from = currentRef.current;
    const to = value;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      currentRef.current = current;
      setDisplay(t >= 1 ? to : current);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <Text style={style}>
      {Math.round(display)}
      {suffix}
    </Text>
  );
};

// Theme
const THEME = {
  bg: "#F7F7F7",
  card: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#9CA3AF",
  primary: "#EA580C",
  primaryDark: "#C2410C",
  primaryLight: "#FB923C",
  success: "#2ECC71",
  successDark: "#10B981",
  error: "#EF4444",
  dangerDark: "#DC2626",
  gold: "#FFC107",
  border: "#E5E7EB",
};

// Shared screen backdrop (same for every mode) — copies the autumn
// cream → white gradient used across the home + games tabs.
const APP_SKY_LIGHT: [string, string] = ["#FFF3E0", "#FFE4C4"];



type GameState = "intro" | "playing" | "results";
type GameMode = "quick" | "challenge" | "endless";

interface ModeConfig {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  colorSecondary: string;
  rounds: number;
  timeLimit?: number;
  pointsMultiplier: number;
  difficulty: number; // 1-3 stars
  tagline: string;
  mascotMood: "happy" | "excited" | "determined";
}

const GAME_MODES: ModeConfig[] = [
  {
    id: "quick",
    title: "Quick Play",
    description: "5 myths at your own pace",
    icon: "Flash",
    color: "#FF9500",
    colorSecondary: "#FFB84D",
    rounds: 5,
    pointsMultiplier: 1,
    difficulty: 1,
    tagline: "Perfect for beginners!",
    mascotMood: "happy",
  },
  {
    id: "challenge",
    title: "Challenge",
    description: "10 myths with time pressure",
    icon: "Timer",
    color: "#FF3B5C",
    colorSecondary: "#FF6B88",
    rounds: 10,
    timeLimit: 10,
    pointsMultiplier: 1.5,
    difficulty: 2,
    tagline: "Race against the clock!",
    mascotMood: "excited",
  },
  {
    id: "endless",
    title: "Endless",
    description: "Survive as long as you can",
    icon: "Unlimited",
    color: "#8B5CF6",
    colorSecondary: "#A78BFA",
    rounds: 999,
    pointsMultiplier: 2,
    difficulty: 3,
    tagline: "For true MythBusters!",
    mascotMood: "determined",
  },
];

export default function MythBusterScreen() {
  const router = useRouter();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const { updateUserProfile, userProfile } = useStorage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeText = useThemeColor({}, "text");
  const themeBackground = useThemeColor({}, "background");
  const isDark = colorScheme === "dark";
  const appSky: [string, string] = isDark
    ? [themeBackground, themeBackground]
    : APP_SKY_LIGHT;
  const textColor = isDark ? "#EAEAEA" : themeText;
  const cardColor = isDark ? "#213356" : "#FCFCF9";
  const borderColor = isDark ? "#2D3A56" : "#E5E7EB";
  const subtleBg = isDark ? "#1A2D4A" : "#F4F5F7";
  const mutedText = isDark ? "#8898AA" : "#6B7280";

  const [gameState, setGameState] = useState<GameState>("intro");
  const [selectedMode, setSelectedMode] = useState<ModeConfig>(() => {
    const param = Array.isArray(modeParam) ? modeParam[0] : modeParam;
    return GAME_MODES.find((m) => m.id === param) ?? GAME_MODES[0];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [streak, setStreak] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [myths, setMyths] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [lives, setLives] = useState(3); // For endless mode
  const [reviewTab, setReviewTab] = useState<"all" | "wrong">("all");
  const [resultsIndex, setResultsIndex] = useState(0);
  const [shownMythIds, setShownMythIds] = useState<Set<string>>(new Set()); // Track shown myths in endless
  const [allGameStatements, setAllGameStatements] = useState<any[]>([]); // All possible myths for endless
  const [isLoseExplosionVisible, setIsLoseExplosionVisible] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const cardEntranceY = useSharedValue(0);
  const cardEntranceOpacity = useSharedValue(1);
  const timerWiggle = useSharedValue(0);
  const mythPressed = useSharedValue(0);
  const truthPressed = useSharedValue(0);
  const pressButtonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mythPressed.value * 4 }],
  }));
  const pressFaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mythPressed.value * 2 }],
  }));
  const truthPressButtonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: truthPressed.value * 4 }],
  }));
  const truthPressFaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: truthPressed.value * 2 }],
  }));
  const loseExplosionScale = useSharedValue(0.4);
  const loseExplosionRingScale = useSharedValue(0.6);
  const loseExplosionOpacity = useSharedValue(0);
  const loseExplosionFlashOpacity = useSharedValue(0);

  const progress = useSharedValue(0);
  const progressFillStyle = useAnimatedStyle(() => ({
    transformOrigin: "left",
    transform: [{ scaleX: Math.max(0.001, progress.value) }],
  }));

  const scorePulse = useSharedValue(0);
  const prevScore = useRef(score);
  const scorePulseStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + 0.12 * scorePulse.value },
      { translateY: -4 * scorePulse.value },
    ],
  }));

  const currentMyth = myths[currentIndex];

  useEffect(() => {
    void preloadGameSfx();
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // Stop any ongoing TTS when the statement changes
  useEffect(() => {
    if (gameState !== "playing") return;
    Speech.stop();
  }, [currentMyth?.id, gameState]);

  const speakStatement = () => {
    if (!currentMyth) return;
    Speech.stop();
    Speech.speak(`"${currentMyth.statement}"`, {
      language: "en",
      rate: 0.9,
      pitch: 1.0,
    });
  };

  // Timer countdown effect for challenge mode
  useEffect(() => {
    if (gameState !== "playing" || !selectedMode.timeLimit || timeLeft === null)
      return;

    if (timeLeft <= 0) {
      // Time's up - automatically mark as wrong and move to next
      handleTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameState, currentIndex]);

  useEffect(() => {
    if (
      gameState === "playing" &&
      selectedMode.timeLimit &&
      timeLeft !== null &&
      timeLeft > 0 &&
      timeLeft <= 3
    ) {
      timerWiggle.value = withRepeat(
        withSpring(1, { damping: 10, stiffness: 180 }),
        -1,
        true,
      );
      return;
    }

    timerWiggle.value = withTiming(0, { duration: 120, easing: EASE_OUT });
  }, [gameState, selectedMode.timeLimit, timeLeft]);

  useEffect(() => {
    progress.value = withTiming(
      selectedMode.id === "endless" ? 0 : (currentIndex + 1) / myths.length,
      { duration: 300, easing: EASE_OUT },
    );
  }, [currentIndex, myths.length, selectedMode.id, progress]);

  useEffect(() => {
    if (score > prevScore.current) {
      prevScore.current = score;
      scorePulse.value = withSequence(
        withTiming(1, { duration: 120, easing: EASE_OUT }),
        withTiming(0, { duration: 200, easing: EASE_OUT }),
      );
    }
  }, [score, scorePulse]);

  const handleTimeUp = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    void playGameSfx("wrong");

    // Mark as wrong (no correct answer)
    setStreak(0);

    // Endless mode: lose a life
    if (selectedMode.id === "endless") {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setTimeout(() => {
          showLoseExplosionAndFinish();
        }, 300);
        return;
      }
    }

    // Add to history as wrong
    setAnswers([...answers, false]);

    // Move to next question or end game
    if (currentIndex >= myths.length - 1) {
      setTimeout(() => {
        setIsAnimating(false);
        finishGame();
      }, 300);
    } else {
      setCurrentIndex(currentIndex + 1);
      // Reset card animation
      translateX.value = 0;
      opacity.value = 1;
      cardEntranceY.value = -24;
      cardEntranceOpacity.value = 0;
      cardEntranceY.value = withTiming(0, { duration: DURATION.medium, easing: EASE_OUT });
      cardEntranceOpacity.value = withTiming(1, { duration: DURATION.medium, easing: EASE_OUT });
      // Reset timer for challenge mode
      if (selectedMode.timeLimit) {
        setTimeLeft(selectedMode.timeLimit);
      }
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const resetCardTransformState = () => {
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
    opacity.value = 1;
    cardEntranceY.value = 0;
    cardEntranceOpacity.value = 1;
  };

  const resetRoundState = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setAnswers([]);
    setIsAnimating(false);
    setTimeLeft(null);
    setLives(3);
    setReviewTab("all");
    setShownMythIds(new Set());
    setAllGameStatements([]);
    setIsLoseExplosionVisible(false);
    resetCardTransformState();
    loseExplosionScale.value = 0.4;
    loseExplosionRingScale.value = 0.6;
    loseExplosionOpacity.value = 0;
    loseExplosionFlashOpacity.value = 0;
  };

  const startMode = async (mode: ModeConfig) => {
    resetRoundState();
    setSelectedMode(mode);
    const allMyths = await getAllMyths();

    // Transform myths into game statements (mix of myths and truths)
    const gameStatements = allMyths.flatMap((myth) => [
      // The myth statement (false)
      {
        id: `${myth.id}-myth`,
        statement: myth.mythStatement,
        isTrue: false,
        category: myth.category,
        difficulty: myth.difficulty,
        explanation: myth.reality,
      },
      // The reality statement (true)
      {
        id: `${myth.id}-truth`,
        statement: myth.reality,
        isTrue: true,
        category: myth.category,
        difficulty: myth.difficulty,
        explanation: myth.explanation,
      },
    ]);

    if (mode.id === "endless") {
      // For endless mode, store all statements and start with shuffled subset
      const shuffled = [...gameStatements].sort(() => Math.random() - 0.5);
      setAllGameStatements(gameStatements);
      setMyths(shuffled);
    } else {
      // For other modes, shuffle and select
      const shuffled = gameStatements.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(
        0,
        Math.min(mode.rounds, shuffled.length),
      );
      setMyths(selected);
    }

    setGameState("intro");
    setTimeLeft(mode.timeLimit ?? null);
  };

  // Arrived from the Games tab difficulty panel → start the game directly
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    const param = Array.isArray(modeParam) ? modeParam[0] : modeParam;
    const mode = GAME_MODES.find((m) => m.id === param) ?? GAME_MODES[0];
    void startMode(mode);
  }, [modeParam]);

  const handleSwipe = (direction: "truth" | "myth") => {
    if (!currentMyth || isAnimating) return;

    setIsAnimating(true);

    const isCorrect =
      (direction === "myth" && !currentMyth.isTrue) ||
      (direction === "truth" && currentMyth.isTrue);

    void playGameSfx(isCorrect ? "correct" : "wrong");

    // Check if this myth has been shown before (for endless mode)
    const isFirstAppearance =
      selectedMode.id === "endless" && !shownMythIds.has(currentMyth.id);

    const basePoints = 10;
    const streakBonus = streak * 2;
    const modeMultiplier = selectedMode.pointsMultiplier;
    const earnedPoints = Math.round((basePoints + streakBonus) * modeMultiplier);

    if (isCorrect) {
      // Only add points on first appearance in endless mode
      if (selectedMode.id !== "endless" || isFirstAppearance) {
        setScore((s) => s + earnedPoints);
      }
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
      // Endless mode: lose a life
      if (selectedMode.id === "endless") {
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setTimeout(() => {
            showLoseExplosionAndFinish();
          }, 300);
          return;
        }
      }
    }

    // Mark myth as shown in endless mode
    if (selectedMode.id === "endless") {
      setShownMythIds((prev) => new Set([...prev, currentMyth.id]));
    }

    setAnswers((prev) => [...prev, isCorrect]);

    // Move to next card
    if (selectedMode.id === "endless") {
      // For endless mode, always load next myth
      loadNextEndlessMythAndAdvance();
    } else if (currentIndex < myths.length - 1) {
      // For other modes, check if more cards exist
      // Reset timer for challenge mode immediately before animation
      if (selectedMode.timeLimit) {
        setTimeLeft(selectedMode.timeLimit);
      }
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        translateX.value = 0;
        translateY.value = 0;
        rotate.value = 0;
        opacity.value = 1;
        cardEntranceY.value = -24;
        cardEntranceOpacity.value = 0;
        cardEntranceY.value = withTiming(0, { duration: DURATION.medium, easing: EASE_OUT });
        cardEntranceOpacity.value = withTiming(1, { duration: DURATION.medium, easing: EASE_OUT });
        setIsAnimating(false); // Re-enable buttons
      }, 300);
    } else {
      setTimeout(() => {
        setIsAnimating(false); // Re-enable buttons
        finishGame();
      }, 300);
    }
  };

  const loadNextEndlessMythAndAdvance = () => {
    setTimeout(() => {
      // Find unshown myths first
      const unshownMyths = allGameStatements.filter(
        (m) => !shownMythIds.has(m.id),
      );

      let nextMyth;
      if (unshownMyths.length > 0) {
        // Pick random unshown myth
        nextMyth =
          unshownMyths[Math.floor(Math.random() * unshownMyths.length)];
      } else {
        // All myths shown, pick any random myth (repeating)
        nextMyth =
          allGameStatements[
            Math.floor(Math.random() * allGameStatements.length)
          ];
      }

      // Update myths array with next myth
      setMyths((prev) => [...prev, nextMyth]);
      setCurrentIndex((i) => i + 1);
      translateX.value = 0;
      translateY.value = 0;
      rotate.value = 0;
      opacity.value = 1;
      cardEntranceY.value = -24;
      cardEntranceOpacity.value = 0;
      cardEntranceY.value = withTiming(0, { duration: DURATION.medium, easing: EASE_OUT });
      cardEntranceOpacity.value = withTiming(1, { duration: DURATION.medium, easing: EASE_OUT });
      setIsAnimating(false);
    }, 300);
  };

  const finishGame = () => {
    setGameState("results");
    const bustedCount = answers.filter((a) => a).length;

    // Games award leaderboard points instead of XP
    void saveGameScore("myth-buster", score).catch((error) => {
      console.error("Failed to save game score:", error);
    });

    // Persist myths busted to profile & daily activity
    logDailyActivity(toLocalIsoDate(), {
      myths_busted: bustedCount,
    });

    // A played round (any difficulty) counts toward the daily mission
    recordMissionEvent("mythbuster", 1);

    if (userProfile) {
      updateUserProfile({
        myths_busted: (userProfile.myths_busted || 0) + bustedCount,
      });
    }
  };

  const showLoseExplosionAndFinish = () => {
    setIsLoseExplosionVisible(true);
    void playGameSfx("gameover");

    loseExplosionScale.value = 0.35;
    loseExplosionRingScale.value = 0.6;
    loseExplosionOpacity.value = 1;
    loseExplosionFlashOpacity.value = 0.8;

    loseExplosionScale.value = withTiming(1.45, {
      duration: LOSE_EXPLOSION_DURATION_MS,
      easing: EASE_OUT,
    });
    loseExplosionRingScale.value = withTiming(2.4, {
      duration: LOSE_EXPLOSION_DURATION_MS,
      easing: EASE_OUT,
    });
    loseExplosionOpacity.value = withTiming(0, {
      duration: LOSE_EXPLOSION_DURATION_MS,
      easing: EASE_OUT,
    });
    loseExplosionFlashOpacity.value = withTiming(0, {
      duration: LOSE_EXPLOSION_DURATION_MS,
      easing: EASE_OUT,
    });

    setTimeout(() => {
      setIsLoseExplosionVisible(false);
      setIsAnimating(false);
      finishGame();
    }, LOSE_EXPLOSION_DURATION_MS);
  };

  const resetGame = () => {
    resetRoundState();
    setMyths([]);
    router.back();
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotate.value = interpolate(
        event.translationX,
        [-width / 2, 0, width / 2],
        [-15, 0, 15],
      );
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? "truth" : "myth";

        // Animate out
        translateX.value = withSpring(event.translationX > 0 ? width : -width, {
          velocity: event.velocityX,
        });
        opacity.value = withTiming(0, { duration: 200, easing: EASE_OUT });

        runOnJS(handleSwipe)(direction);
      } else {
        // Spring back
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + cardEntranceY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value * cardEntranceOpacity.value,
  }));

  const resultsAnsweredCount = Math.min(answers.length, myths.length);
  const resultsWrongCount = answers
    .slice(0, resultsAnsweredCount)
    .filter((a) => !a).length;
  const resultsDeckSize =
    1 + (reviewTab === "wrong" ? resultsWrongCount : resultsAnsweredCount);

  const totalAnswered = resultsAnsweredCount;
  const correctAnswers = answers.filter((a) => a).length;
  const wrongAnswers = totalAnswered - correctAnswers;
  const accuracy =
    totalAnswered > 0
      ? Math.round((correctAnswers / totalAnswered) * 100)
      : 0;

  const resultRowX = useSharedValue(RESULTS_CARD_OFFSET);
  const resultsGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      resultRowX.value =
        -resultsIndex * RESULTS_STEP + RESULTS_CARD_OFFSET + event.translationX;
    })
    .onEnd((event) => {
      if (
        Math.abs(event.translationX) > SWIPE_THRESHOLD ||
        Math.abs(event.velocityX) > 500
      ) {
        const dir = event.translationX < 0 ? 1 : -1;
        const next = Math.max(
          0,
          Math.min(resultsDeckSize - 1, resultsIndex + dir),
        );
        resultRowX.value = withTiming(
          -next * RESULTS_STEP + RESULTS_CARD_OFFSET,
          {
            duration: 250,
            easing: EASE_OUT,
          },
        );
        runOnJS(setResultsIndex)(next);
      } else {
        resultRowX.value = withSpring(
          -resultsIndex * RESULTS_STEP + RESULTS_CARD_OFFSET,
        );
      }
    });
  const resultsRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: resultRowX.value }],
  }));

  const mythLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  const truthLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const timerIconWiggleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(timerWiggle.value, [0, 1], [-3.5, 3.5]) },
      { rotate: `${interpolate(timerWiggle.value, [0, 1], [-12, 12])}deg` },
    ],
  }));

  const loseExplosionCoreStyle = useAnimatedStyle(() => ({
    opacity: loseExplosionOpacity.value,
    transform: [{ scale: loseExplosionScale.value }],
  }));

  const loseExplosionRingStyle = useAnimatedStyle(() => ({
    opacity: loseExplosionOpacity.value * 0.7,
    transform: [{ scale: loseExplosionRingScale.value }],
  }));

  const loseExplosionFlashStyle = useAnimatedStyle(() => ({
    opacity: loseExplosionFlashOpacity.value,
  }));


  if (gameState === "intro") {
    // Mode-specific instructions
    const getModeInstruction = () => {
      switch (selectedMode.id) {
        case "quick":
          return "Take your time and learn at your own pace";
        case "challenge":
          return `You have ${selectedMode.timeLimit} seconds per statement!`;
        case "endless":
          return "You have 3 lives — how far can you go?";
        default:
          return "Swipe to judge each statement";
      }
    };

    const getModeDescription = () => {
      switch (selectedMode.id) {
        case "quick":
          return "Take your time and judge each statement at your own pace.";
        case "challenge":
          return `Race the clock — you have ${selectedMode.timeLimit} seconds per statement!`;
        case "endless":
          return "You have 3 lives. How far can you go before you run out?";
        default:
          return "Swipe to judge each statement.";
      }
    };

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.fullScreen}>
          <LinearGradient
            colors={appSky}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <SafeAreaView style={styles.fullScreen}>
            {/* Header */}
            <View style={styles.introHeader}>
              <TouchableOpacity
                onPress={resetGame}
                style={[
                  styles.introBackBtn,
                  { backgroundColor: cardColor, borderColor },
                ]}
              >
                <Icon name="ArrowLeft2" size={20} color={textColor} />
              </TouchableOpacity>
              <View
                style={[
                  styles.introBadge,
                  {
                    backgroundColor: selectedMode.color,
                    borderBottomColor: selectedMode.colorSecondary,
                  },
                ]}
              >
                <Icon name="Game" size={18} color="#FFF" variant="Bold" />
                <Text style={styles.introBadgeText}>Myth Buster</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>
            <ScrollView
              style={styles.introScrollView}
              contentContainerStyle={styles.introScrollContent}
              showsVerticalScrollIndicator={false}
              bounces
            >
              <Animated.View entering={FadeInDown.delay(200)} style={styles.introContainer}>
                {/* Title Card */}
                <View
                  style={[
                    styles.introCard,
                    { backgroundColor: cardColor, borderColor },
                  ]}
                >
                  <Text style={[styles.introTitle, { color: textColor }]}>
                    {selectedMode.title}
                  </Text>
                  <Text
                    style={[styles.introSubtitle, { color: mutedText }]}
                  >
                    Swipe MYTH or FACT
                  </Text>
                  <Text
                    style={[styles.introDescription, { color: mutedText }]}
                  >
                    {getModeDescription()}
                  </Text>
                </View>

                {/* How to Play */}
                <HowToPlayCard
                  steps={[
                    {
                      id: "myth",
                      icon: "Dislike",
                      title: "Swipe MYTH",
                      hint: "Swipe a statement left when it's a myth.",
                    },
                    {
                      id: "truth",
                      icon: "Like",
                      title: "Swipe FACT",
                      hint: "Swipe right when it's actually a fact.",
                    },
                    {
                      id: "mode",
                      icon: selectedMode.id === "endless" ? "Heart" : "Timer",
                      title: selectedMode.title,
                      hint: getModeInstruction(),
                    },
                  ]}
                  palette={{
                    cardBg: cardColor,
                    cardBorder: borderColor,
                    primaryText: textColor,
                    mutedText: mutedText,
                    subtleBg: subtleBg,
                    subtleBorder: borderColor,
                    iconWrapBg: subtleBg,
                  }}
                  accentColor={selectedMode.color}
                  footer={
                    <View style={styles.introStatsRow}>
                      <View style={styles.introStatItem}>
                        <Icon name="Layer" size={16} color={mutedText} />
                        <Text style={[styles.introStatText, { color: mutedText }]}>
                          {selectedMode.rounds === 999 ? "∞" : selectedMode.rounds}{" "}
                          rounds
                        </Text>
                      </View>
                    </View>
                  }
                />

                {/* Start Button */}
                <TouchableOpacity
                  style={[
                    styles.startButtonCard,
                    { backgroundColor: cardColor, borderColor },
                  ]}
                  onPress={() => setGameState("playing")}
                  activeOpacity={0.9}
                >
                  <Icon
                    name="Play"
                    size={26}
                    color={selectedMode.color}
                    variant="Bold"
                  />
                  <Text
                    style={[
                      styles.startButtonCardText,
                      { color: selectedMode.color },
                    ]}
                  >
                    START GAME
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>

          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (gameState === "results") {
    const answeredMyths = myths
      .slice(0, answers.length)
      .map((myth, index) => ({ ...myth, originalIndex: index }));

    // Get performance message based on accuracy
    const getPerformanceMessage = () => {
      if (accuracy >= 90) return { text: "Outstanding!", emoji: "🏆" };
      if (accuracy >= 70) return { text: "Great Job!", emoji: "⭐" };
      if (accuracy >= 50) return { text: "Good Effort!", emoji: "👍" };
      return { text: "Keep Learning!", emoji: "📚" };
    };
    const performance = getPerformanceMessage();

    const filteredMyths =
      reviewTab === "wrong"
        ? answeredMyths.filter((myth) => !answers[myth.originalIndex])
        : answeredMyths;

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          entering={FadeIn.duration(200).easing(EASE_OUT)}
          style={styles.fullScreen}
        >
        <LinearGradient
          colors={appSky}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
          <SafeAreaView style={styles.fullScreen}>
            {/* Header */}
            <View style={styles.resultsHeader}>
              <View style={styles.resultsHeaderContent}>
                <TouchableOpacity
                  onPress={resetGame}
                  style={[
                    styles.resultsBackBtn,
                    { backgroundColor: cardColor, borderColor },
                  ]}
                  activeOpacity={0.7}
                >
                  <Icon name="ArrowLeft2" size={20} color={textColor} />
                </TouchableOpacity>
                <View style={styles.resultsHeaderCenter}>
                  <Text
                    style={[styles.resultsHeaderTitle, { color: textColor }]}
                  >
                    Game Results
                  </Text>
                  <Text
                    style={[
                      styles.resultsHeaderSubtitle,
                      { color: mutedText },
                    ]}
                  >
                    {selectedMode.title} Mode
                  </Text>
                </View>
                <View style={{ width: 44 }} />
              </View>
            </View>

            {/* Review filter tabs */}
            <View style={[styles.resultTabRow, styles.resultsTabsWrap]}>
              <TouchableOpacity
                style={[
                  styles.resultTab,
                  { backgroundColor: subtleBg },
                  reviewTab === "all" && [
                    styles.resultTabActive,
                    { backgroundColor: selectedMode.color },
                  ],
                ]}
                onPress={() => {
                  setReviewTab("all");
                  setResultsIndex(0);
                  resultRowX.value = RESULTS_CARD_OFFSET;
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resultTabText,
                    { color: reviewTab === "all" ? "#FFF" : mutedText },
                  ]}
                >
                  All ({totalAnswered})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.resultTab,
                  { backgroundColor: subtleBg },
                  reviewTab === "wrong" && [
                    styles.resultTabActive,
                    { backgroundColor: THEME.error },
                  ],
                ]}
                onPress={() => {
                  setReviewTab("wrong");
                  setResultsIndex(0);
                  resultRowX.value = RESULTS_CARD_OFFSET;
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resultTabText,
                    { color: reviewTab === "wrong" ? "#FFF" : mutedText },
                  ]}
                >
                  Missed ({wrongAnswers})
                </Text>
              </TouchableOpacity>
            </View>

            <GestureDetector gesture={resultsGesture}>
              <View style={styles.resultsPager}>
                <Animated.View
                  style={[
                    styles.resultsRow,
                    {
                      width:
                        RESULT_CARD_W * resultsDeckSize +
                        RESULTS_CARD_GAP * (resultsDeckSize - 1),
                    },
                    resultsRowStyle,
                  ]}
                >
                  {/* Card 1: Results */}
                  <View
                    style={[
                      styles.resultCard,
                      styles.resultSummaryCard,
                      { backgroundColor: cardColor, borderColor },
                    ]}
                  >
                    {/* Mascot + performance */}
                    <View style={styles.resultHeroArea}>
                      <Animated.View
                        entering={FadeInUp.duration(260).easing(EASE_OUT)}
                        style={{ alignItems: "center" }}
                      >
                        <Image
                          source={
                            accuracy >= 50
                              ? require("@/assets/images/mascot/happy.png")
                              : require("@/assets/images/mascot/fix.png")
                          }
                          style={styles.resultHeroMascot}
                          resizeMode="contain"
                        />
                      </Animated.View>
                      <Text
                        style={[styles.resultHeroTitle, { color: textColor }]}
                      >
                        {performance.text}
                      </Text>
                    </View>

                    {/* Stats row */}
                    <View style={styles.resultStatsRow}>
                      <View
                        style={[
                          styles.resultStatCard,
                          { backgroundColor: THEME.success + "14" },
                        ]}
                      >
                        <Icon
                          name="TickCircle"
                          size={22}
                          color={THEME.success}
                          variant="Bold"
                        />
                        <CountUpText
                          value={correctAnswers}
                          style={[styles.resultStatValue, { color: textColor }]}
                        />
                        <Text style={[styles.resultStatLabel, { color: mutedText }]}>Correct</Text>
                      </View>
                      <View
                        style={[
                          styles.resultStatCard,
                          { backgroundColor: THEME.error + "14" },
                        ]}
                      >
                        <Icon
                          name="CloseCircle"
                          size={22}
                          color={THEME.error}
                          variant="Bold"
                        />
                        <CountUpText
                          value={wrongAnswers}
                          style={[styles.resultStatValue, { color: textColor }]}
                        />
                        <Text style={[styles.resultStatLabel, { color: mutedText }]}>Wrong</Text>
                      </View>
                      <View
                        style={[
                          styles.resultStatCard,
                          { backgroundColor: selectedMode.color + "14" },
                        ]}
                      >
                        <Icon
                          name="Chart"
                          size={22}
                          color={selectedMode.color}
                          variant="Bold"
                        />
                        <CountUpText
                          value={accuracy}
                          suffix="%"
                          style={[styles.resultStatValue, { color: textColor }]}
                        />
                        <Text style={[styles.resultStatLabel, { color: mutedText }]}>Accuracy</Text>
                      </View>
                    </View>
                  </View>

                  {/* Statement cards */}
                  {filteredMyths.map((myth) => {
                    const isCorrect = answers[myth.originalIndex];
                    return (
                      <View
                        key={myth.originalIndex}
                        style={[
                          styles.resultCard,
                          { backgroundColor: cardColor, borderColor },
                        ]}
                      >
                        <View style={styles.resultHeaderRow}>
                          <View style={styles.resultHeaderLeft}>
                            <View
                              style={[
                                styles.resultHeaderPill,
                                { backgroundColor: selectedMode.color },
                              ]}
                            >
                              <Text style={styles.resultHeaderPillText}>
                                #{myth.originalIndex + 1}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.resultHeaderChip,
                              {
                                backgroundColor: isCorrect
                                  ? THEME.success
                                  : THEME.error,
                              },
                            ]}
                          >
                            <Text style={styles.resultHeaderChipText}>
                              {myth.isTrue ? "FACT" : "MYTH"} ·{" "}
                              {isCorrect ? "Correct" : "Wrong"}
                            </Text>
                          </View>
                        </View>

                        {/* Statement */}
                        <View style={styles.resultStatementWrap}>
                          <Text
                            style={[
                              styles.resultStatementTitle,
                              { color: textColor },
                            ]}
                            numberOfLines={4}
                          >
                            {"\u201C"}{myth.statement}{"\u201D"}
                          </Text>
                        </View>

                        {/* Explanation section */}
                        <View style={styles.exampleSection}>
                          <ScrollView
                            style={styles.resultReviewScroll}
                            contentContainerStyle={styles.resultStatementContent}
                            showsVerticalScrollIndicator={false}
                          >
                            <View
                              style={[
                                styles.exampleBody,
                                { backgroundColor: subtleBg, borderColor },
                              ]}
                            >
                              <View style={styles.exampleLabelRow}>
                                <Icon
                                  name="InfoCircle"
                                  size={16}
                                  color={mutedText}
                                  variant="Bold"
                                />
                                <Text
                                  style={[
                                    styles.exampleLabel,
                                    { color: mutedText },
                                  ]}
                                >
                                  The reality
                                </Text>
                              </View>
                              <MarkdownText
                                text={myth.explanation}
                                style={styles.exampleExplainText}
                                textColor={mutedText}
                              />
                            </View>
                          </ScrollView>
                        </View>
                      </View>
                    );
                  })}
                </Animated.View>
              </View>
            </GestureDetector>

            {/* Pager dots */}
            <View style={styles.resultsDots}>
              {Array.from({ length: resultsDeckSize }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.resultsDot,
                    resultsIndex === i && styles.resultsDotActive,
                  ]}
                />
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.resultsActions}>
              <TouchableOpacity
                style={[
                  styles.resultsPlayAgainBtn,
                  { backgroundColor: selectedMode.color },
                ]}
                onPress={() => startMode(selectedMode)}
                activeOpacity={0.8}
              >
                <Icon name="Refresh" size={20} color="#FFF" variant="Bold" />
                <Text style={styles.resultsPlayAgainText}>Play Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resultsHomeBtn,
                  {
                    backgroundColor: cardColor,
                    borderColor:
                      colorScheme === "dark" ? "#2D3748" : THEME.border,
                  },
                ]}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Icon name="Home2" size={20} color={textColor} />
                <Text style={[styles.resultsHomeText, { color: textColor }]}>
                  Back to Home
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </GestureHandlerRootView>
    );
  }

  // Playing state
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View
        entering={FadeIn.duration(200).easing(EASE_OUT)}
        style={styles.fullScreen}
      >
        <LinearGradient
          colors={appSky}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View
          style={[styles.gameHeaderContainer, { paddingTop: insets.top + 16 }]}
        >
          {/* Header */}
          <View style={styles.gameHeader}>
            <TouchableOpacity
              onPress={() => resetGame()}
              style={[
                styles.gameCloseButton,
                { backgroundColor: cardColor, borderColor },
              ]}
            >
              <Icon name="Close" size={20} color={textColor} />
            </TouchableOpacity>

            <View style={styles.progressContainer}>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressText, { color: textColor }]}>
                  {selectedMode.id === "endless"
                    ? `${currentIndex + 1} / ∞`
                    : `${currentIndex + 1} / ${myths.length}`}
                </Text>
              </View>
              <View
                style={[styles.progressBar, { backgroundColor: cardColor }]}
              >
                {selectedMode.id !== "endless" && (
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { backgroundColor: selectedMode.color },
                      progressFillStyle,
                    ]}
                  />
                )}
              </View>
            </View>

            <Animated.View
              style={[
                styles.scoreContainer,
                { backgroundColor: cardColor, borderColor },
                scorePulseStyle,
              ]}
            >
              <Icon name="Flash" size={16} color={THEME.gold} variant="Bold" />
              <Text style={[styles.scoreText, { color: textColor }]}>
                {score}
              </Text>
            </Animated.View>

            {selectedMode.id === "endless" && (
              <TouchableOpacity
                onPress={() => {
                  if (!isAnimating) finishGame();
                }}
                style={[
                  styles.endGameButton,
                  { backgroundColor: selectedMode.color },
                ]}
                activeOpacity={0.8}
              >
                <Icon name="Flag" size={16} color="#FFF" variant="Bold" />
                <Text style={styles.endGameButtonText}>End</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Streak Indicator */}
        {streak > 1 && (
          <Animated.View
            entering={FadeInDown.duration(260).easing(EASE_OUT)}
            exiting={FadeOutDown.duration(150).easing(EASE_OUT)}
            style={styles.streakBannerContainer}
          >
            <LinearGradient
              colors={[selectedMode.color, selectedMode.colorSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.streakBanner}
            >
              <View style={styles.streakIconContainer}>
                <Icon name="Fire" size={24} color="#FFF" variant="Bold" />
              </View>
              <View style={styles.streakTextContainer}>
                <Text style={styles.streakText}>{streak}x STREAK!</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Card Stack */}
        <View style={styles.cardContainer}>
          {/* Swipe Labels */}
          <Animated.View
            style={[styles.swipeLabel, styles.mythLabel, mythLabelStyle]}
          >
            <Icon
              name="CloseCircle"
              size={48}
              color={THEME.error}
              variant="Bold"
            />
            <Text style={[styles.swipeLabelText, { color: THEME.error }]}>
              MYTH
            </Text>
          </Animated.View>

          <Animated.View
            style={[styles.swipeLabel, styles.truthLabel, truthLabelStyle]}
          >
            <Icon
              name="TickCircle"
              size={48}
              color={THEME.success}
              variant="Bold"
            />
            <Text style={[styles.swipeLabelText, { color: THEME.success }]}>
              FACT
            </Text>
          </Animated.View>

          {/* Current card */}
          {currentMyth && (
            <GestureDetector gesture={gesture}>
              <Animated.View
                style={[styles.card, animatedStyle]}
              >
                <View
                  style={[
                    styles.cardInner,
                    { backgroundColor: cardColor, borderColor },
                  ]}
                >
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    onPress={speakStatement}
                    style={styles.cardSpeaker}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name="VolumeHigh"
                      size={20}
                      color="#8A8A8A"
                      variant="Bold"
                    />
                  </TouchableOpacity>

                  <View style={styles.cardHeaderRight}>
                    <View style={styles.progressPill}>
                      <Text style={styles.progressCurrent}>
                        {currentIndex + 1}
                      </Text>
                      <Text style={styles.progressTotal}>
                        {" "}
                        / {myths.length}
                      </Text>
                    </View>

                    {selectedMode.timeLimit && timeLeft !== null ? (
                      <View
                        style={[
                          styles.timerBadge,
                          {
                            backgroundColor:
                              timeLeft <= 3
                                ? THEME.error
                                : selectedMode.color,
                          },
                        ]}
                      >
                        <Animated.View style={timerIconWiggleStyle}>
                          <Icon
                            name="Timer"
                            size={18}
                            color="#FFF"
                            variant="Bold"
                          />
                        </Animated.View>
                        <Text style={styles.timerText}>{timeLeft}s</Text>
                      </View>
                    ) : null}

                    {selectedMode.id === "endless" && (
                      <View style={styles.livesContainer}>
                        {[...Array(3)].map((_, i) => (
                          <Icon
                            key={i}
                            name="Heart"
                            size={18}
                            color={i < lives ? THEME.error : "#E5E7EB"}
                            variant={i < lives ? "Bold" : "Linear"}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                  <View style={styles.cardContent}>
                    <Text
                      style={[styles.cardStatement, { color: textColor }]}
                    >
                      {"\u201C"}
                      {currentMyth.statement}
                      {"\u201D"}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </GestureDetector>
          )}
        </View>

        {/* Action Buttons */}
        {currentMyth && (
          <View style={styles.actionButtons}>
            <AnimatedTouchableOpacity
              style={[styles.actionButton, pressButtonStyle]}
              onPress={() => {
                if (isAnimating || currentIndex >= myths.length) return;
                translateX.value = withSpring(-width);
                opacity.value = withTiming(0, { duration: 200, easing: EASE_OUT });
                handleSwipe("myth");
              }}
              onPressIn={() => {
                mythPressed.value = withTiming(1, {
                  duration: DURATION.press,
                  easing: PRESS_EASING,
                });
              }}
              onPressOut={() => {
                mythPressed.value = withTiming(0, {
                  duration: DURATION.press,
                  easing: PRESS_EASING,
                });
              }}
              activeOpacity={1}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.actionButtonLip,
                  { backgroundColor: THEME.dangerDark },
                ]}
              />
              <View
                style={[
                  styles.actionButtonFace,
                  { backgroundColor: THEME.error },
                  pressFaceStyle,
                ]}
              >
                <Icon
                  name="CloseCircle"
                  size={24}
                  color="#FFFFFF"
                  variant="Bold"
                />
                <Text style={styles.actionButtonText}>MYTH</Text>
              </View>
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              style={[styles.actionButton, truthPressButtonStyle]}
              onPress={() => {
                if (isAnimating || currentIndex >= myths.length) return;
                translateX.value = withSpring(width);
                opacity.value = withTiming(0, { duration: 200, easing: EASE_OUT });
                handleSwipe("truth");
              }}
              onPressIn={() => {
                truthPressed.value = withTiming(1, {
                  duration: DURATION.press,
                  easing: PRESS_EASING,
                });
              }}
              onPressOut={() => {
                truthPressed.value = withTiming(0, {
                  duration: DURATION.press,
                  easing: PRESS_EASING,
                });
              }}
              activeOpacity={1}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.actionButtonLip,
                  { backgroundColor: THEME.successDark },
                ]}
              />
              <View
                style={[
                  styles.actionButtonFace,
                  { backgroundColor: THEME.success },
                  truthPressFaceStyle,
                ]}
              >
                <Icon
                  name="TickCircle"
                  size={24}
                  color="#FFFFFF"
                  variant="Bold"
                />
                <Text style={styles.actionButtonText}>FACT</Text>
              </View>
            </AnimatedTouchableOpacity>
          </View>
        )}

        {isLoseExplosionVisible && (
          <View style={styles.loseExplosionOverlay} pointerEvents="none">
            <Animated.View
              style={[styles.loseExplosionFlash, loseExplosionFlashStyle]}
            />
            <Animated.View
              style={[
                styles.loseExplosionRing,
                { borderColor: selectedMode.colorSecondary },
                loseExplosionRingStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.loseExplosionCore,
                { backgroundColor: selectedMode.color },
                loseExplosionCoreStyle,
              ]}
            >
              <Text style={styles.loseExplosionText}>BOOM!</Text>
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Intro Screen with colored background
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  introBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  introBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.2)",
  },
  introBadgeText: {
    fontSize: 16,
    fontFamily: fontFamilies.heavy,
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
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderBottomWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  introTitle: {
    fontSize: 28,
    fontFamily: fontFamilies.heavy,
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
    marginBottom: 12,
  },
  introDescription: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    lineHeight: 22,
  },
  introStatsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  introStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  introStatText: {
    fontSize: 13,
    fontFamily: fontFamilies.semibold,
  },
  startButtonCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  startButtonCardText: {
    fontSize: 17,
    fontFamily: fontFamilies.heavy,
    letterSpacing: 0.5,
  },

  // Game Screen
  gameHeaderContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  gameHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  gameCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressContainer: {
    flex: 1,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  timerText: {
    fontSize: 14,
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressFill: {
    height: "100%",
    width: "100%",
    borderRadius: 4,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreText: {
    fontSize: 16,
    fontFamily: fontFamilies.heavy,
  },
  endGameButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  endGameButtonText: {
    fontSize: 14,
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
  },
  streakBannerContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  streakIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  streakTextContainer: {
    flex: 1,
  },
  streakText: {
    fontSize: 18,
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
    marginBottom: 2,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  card: {
    width: width - 48,
    height: height * 0.45,
    position: "absolute",
  },
  cardInner: {
    flex: 1,
    borderRadius: 32,
    padding: 24,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.6)",
  },
  cardHeader: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardSpeaker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECECEB",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 4,
  },
  progressCurrent: {
    fontSize: 15,
    fontFamily: fontFamilies.heavy,
    color: "#83B625",
  },
  progressTotal: {
    fontSize: 15,
    fontFamily: fontFamilies.heavy,
    color: "#A3A3A3",
  },
  livesContainer: {
    flexDirection: "row",
    gap: 4,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  cardStatement: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    lineHeight: 36,
    textAlign: "center",
  },
  swipeLabel: {
    position: "absolute",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  mythLabel: {
    left: 40,
    top: height * 0.25,
  },
  truthLabel: {
    right: 40,
    top: height * 0.25,
  },
  swipeLabelText: {
    fontSize: 24,
    fontFamily: fontFamilies.black,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    height: 68,
    borderRadius: 20,
  },
  actionButtonLip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  actionButtonFace: {
    ...StyleSheet.absoluteFillObject,
    bottom: 4,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  actionButtonText: {
    fontSize: 20,
    fontFamily: fontFamilies.heavy,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  loseExplosionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
  loseExplosionFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
  loseExplosionRing: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    position: "absolute",
  },
  loseExplosionCore: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  loseExplosionText: {
    fontSize: 36,
    fontFamily: fontFamilies.black,
    color: "#FFF",
    letterSpacing: 2,
  },

  // Results Screen
  resultsContainer: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  // New Results Screen Styles
  resultsScreen: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  resultsHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsHeaderCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  resultsBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  resultsHeaderTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.heavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultsHeaderSubtitle: {
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    marginTop: 4,
  },
  resultsContent: {
    padding: 20,
  },
  // Score Card
  resultsScoreCard: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  resultsScoreGradient: {
    padding: 24,
    alignItems: "center",
  },
  resultsScoreMascot: {
    width: 60,
    height: 60,
    marginBottom: 6,
  },
  resultsScoreEmoji: {
    fontSize: 36,
    fontFamily: fontFamilies.regular,
    marginBottom: 6,
  },
  resultsScoreTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.black,
    color: "#FFF",
    marginBottom: 12,
    textAlign: "center",
  },
  // Legacy hero styles
  resultsHeroCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
  },
  resultsHeroGradient: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  resultsHeroMascot: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  resultsHeroEmoji: {
    fontSize: 32,
    fontFamily: fontFamilies.regular,
    marginBottom: 8,
  },
  resultsHeroTitle: {
    fontSize: 28,
    fontFamily: fontFamilies.black,
    color: "#FFF",
    marginBottom: 4,
  },
  resultsHeroScore: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    color: "rgba(255,255,255,0.9)",
  },
  resultsStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  resultsStatCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsStatValue: {
    fontSize: 20,
    fontFamily: fontFamilies.black,
    color: THEME.text,
  },
  resultsStatLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
  },
  resultsReviewSection: {
    marginBottom: 24,
  },
  resultsReviewHeader: {
    marginBottom: 12,
  },
  resultsReviewTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 4,
  },
  resultsReviewSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
  },
  resultsTabRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultsEmptyState: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.success + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  resultsEmptyTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.heavy,
    color: THEME.success,
  },
  resultsEmptyText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
  },
  resultsCardList: {
    gap: 12,
  },
  resultsReviewCard: {
    borderRadius: 18,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsCardIndicator: {
    width: 5,
  },
  resultsCardInner: {
    flex: 1,
    padding: 14,
  },
  resultsReviewCardCorrect: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.success,
  },
  resultsReviewCardWrong: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.error,
  },
  resultsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  resultsCardNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsCardNumberText: {
    fontSize: 12,
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
  },
  resultsCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultsCardBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilies.heavy,
  },
  resultsCardStatement: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
    color: THEME.text,
    lineHeight: 20,
  },
  resultsCardExpanded: {
    marginTop: 12,
  },
  resultsCardDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginBottom: 12,
  },
  resultsCardExplanation: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  resultsCardExplanationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: THEME.text,
    lineHeight: 19,
  },
  resultsCardFooter: {
    alignItems: "center",
    marginTop: 10,
  },
  resultsCardHint: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
  },
  resultsPlayAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    borderRadius: 18,
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.15)",
  },
  resultsPlayAgainText: {
    fontSize: 16,
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
  },
  resultsHomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  resultsHomeText: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    color: THEME.text,
  },
  // Legacy Results Styles
  resultsIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  resultsMascot: {
    width: 150,
    height: 150,
  },
  reviewMascot: {
    width: 24,
    height: 24,
  },
  resultsTitle: {
    fontSize: 32,
    fontFamily: fontFamilies.black,
    color: "#FFF",
    marginBottom: 32,
    textAlign: "center",
  },
  scoreCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    marginBottom: 32,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
    alignItems: "center",
  },
  mascotInCard: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
  },
  scoreValue: {
    fontSize: 32,
    fontFamily: fontFamilies.black,
    color: THEME.primary,
  },
  divider: {
    height: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.bg,
    padding: 16,
    borderRadius: 16,
  },
  statValue: {
    fontSize: 20,
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
  },
  resultsActions: {
    width: "100%",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  playAgainButton: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  playAgainText: {
    fontSize: 16,
    fontFamily: fontFamilies.heavy,
    color: THEME.primary,
  },
  homeButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  homeButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
  },


  // Review Section
  reviewSection: {
    width: "100%",
    marginTop: 32,
    gap: 16,
  },
  reviewTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.black,
    color: "#FFF",
    textAlign: "center",
  },
  reviewSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 8,
  },
  reviewCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  reviewNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewNumberText: {
    fontSize: 14,
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
  },
  reviewBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontFamily: fontFamilies.heavy,
  },
  reviewStatement: {
    fontSize: 15,
    fontFamily: fontFamilies.semibold,
    color: THEME.text,
    lineHeight: 22,
  },
  reviewExplanation: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: THEME.bg,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  reviewExplanationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    lineHeight: 18,
  },

  resultStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  resultStatCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 10,
  },
  resultStatValue: {
    fontSize: 17,
    fontFamily: fontFamilies.black,
    marginTop: 2,
  },
  resultStatLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
    marginTop: 2,
  },
  resultsPager: {
    flex: 1,
    overflow: "hidden",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  resultsRow: {
    flexDirection: "row",
    gap: RESULTS_CARD_GAP,
  },
  resultCard: {
    width: RESULT_CARD_W,
    aspectRatio: 0.85,
    borderRadius: 32,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.6)",
  },
  resultSummaryCard: {
    justifyContent: "center",
  },
  resultHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultHeaderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resultHeaderPillText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: fontFamilies.heavy,
  },
  resultHeaderChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  resultHeaderChipText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: fontFamilies.heavy,
  },
  resultHeroArea: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  resultHeroMascot: {
    width: 64,
    height: 64,
    marginBottom: 2,
  },
  resultHeroTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.black,
  },
  resultReviewHeader: {
    marginBottom: 12,
  },
  resultReviewTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.black,
  },
  resultReviewSubtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    fontFamily: fontFamilies.regular,
    marginTop: 2,
  },
  resultTabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  resultTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  resultTabActive: {},
  resultTabText: {
    fontSize: 13,
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
  },
  resultReviewScroll: {
    flex: 1,
  },
  resultReviewList: {
    gap: 12,
    paddingBottom: 8,
  },
  exampleSection: {
    flex: 1,
  },
  exampleLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  exampleLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.heavy,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  resultsTabsWrap: {
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  resultStatementWrap: {
    marginVertical: 12,
  },
  resultStatementTitle: {
    textAlign: "center",
    fontSize: 17,
    fontFamily: fontFamilies.heavy,
    lineHeight: 24,
  },
  resultStatementContent: {
    paddingBottom: 8,
  },
  exampleBody: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  exampleStatement: {
    color: "#1A1A1A",
    fontSize: 17,
    fontFamily: fontFamilies.semibold,
    lineHeight: 24,
    marginBottom: 12,
  },
  exampleDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 12,
  },
  exampleExplainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  exampleExplainText: {
    fontSize: 15,
    lineHeight: 20,
  },
  resultEmpty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  resultEmptyTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.heavy,
    marginTop: 8,
  },
  resultEmptyText: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  resultsDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  resultsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.textMuted,
  },
  resultsDotActive: {
    width: 20,
    backgroundColor: THEME.gold,
  },
});