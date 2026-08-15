import {fontFamilies} from "@/theme";
import { MarkdownText } from "@/components/markdown-text";
import { Icon } from "@/components/ui/icon";
import { HowToPlayCard } from "@/components/games/HowToPlayCard";
import { getAllMyths } from "@/content/myths";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useStorage } from "@/services/StorageContext";
import { logDailyActivity } from "@/services/database";
import { playGameSfx, preloadGameSfx } from "@/services/game-sfx";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.3;
const LOSE_EXPLOSION_DURATION_MS = 700;

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
  error: "#E74C3C",
  gold: "#FFC107",
  border: "#E5E7EB",
};

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
  xpMultiplier: number;
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
    xpMultiplier: 1,
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
    xpMultiplier: 1.5,
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
    xpMultiplier: 2,
    difficulty: 3,
    tagline: "For true MythBusters!",
    mascotMood: "determined",
  },
];

export default function MythBusterScreen() {
  const router = useRouter();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const { addXP, updateUserProfile, userProfile } = useStorage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const backgroundColor =
    colorScheme === "dark" ? "#1A1A2E" : useThemeColor({}, "background");
  const textColor =
    colorScheme === "dark" ? "#EAEAEA" : useThemeColor({}, "text");
  const cardColor =
    colorScheme === "dark" ? "#213356" : useThemeColor({}, "card");
  const borderColor =
    colorScheme === "dark" ? "#2D3A56" : "#E5E7EB";
  const subtleBg =
    colorScheme === "dark" ? "#1A2D4A" : "#F4F5F7";
  const mutedText =
    colorScheme === "dark" ? "#8898AA" : "#6B7280";

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
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [shownMythIds, setShownMythIds] = useState<Set<string>>(new Set()); // Track shown myths in endless
  const [allGameStatements, setAllGameStatements] = useState<any[]>([]); // All possible myths for endless
  const [isLoseExplosionVisible, setIsLoseExplosionVisible] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const timerWiggle = useSharedValue(0);
  const loseExplosionScale = useSharedValue(0.4);
  const loseExplosionRingScale = useSharedValue(0.6);
  const loseExplosionOpacity = useSharedValue(0);
  const loseExplosionFlashOpacity = useSharedValue(0);

  const currentMyth = myths[currentIndex];

  useEffect(() => {
    void preloadGameSfx();
  }, []);

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
        withTiming(1, { duration: 120 }),
        -1,
        true,
      );
      return;
    }

    timerWiggle.value = withTiming(0, { duration: 120 });
  }, [gameState, selectedMode.timeLimit, timeLeft]);

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
    setExpandedCard(null);
    setShownMythIds(new Set());
    setAllGameStatements([]);
    setIsLoseExplosionVisible(false);
    resetCardTransformState();
    loseExplosionScale.value = 0.4;
    loseExplosionRingScale.value = 0.6;
    loseExplosionOpacity.value = 0;
    loseExplosionFlashOpacity.value = 0;
  };

  const startMode = (mode: ModeConfig) => {
    resetRoundState();
    setSelectedMode(mode);
    const allMyths = getAllMyths();

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
    startMode(mode);
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

    const baseXP = 10;
    const streakBonus = streak * 2;
    const modeMultiplier = selectedMode.xpMultiplier;
    const earnedXP = Math.round((baseXP + streakBonus) * modeMultiplier);

    if (isCorrect) {
      // Only add points on first appearance in endless mode
      if (selectedMode.id !== "endless" || isFirstAppearance) {
        setScore((s) => s + earnedXP);
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
      setIsAnimating(false);
    }, 300);
  };

  const finishGame = () => {
    setGameState("results");
    const xpEarned = score;
    const bustedCount = answers.filter((a) => a).length;
    addXP(xpEarned);

    // Persist myths busted to profile & daily activity
    const today = new Date().toISOString().split("T")[0];
    logDailyActivity(today, {
      xp_earned: xpEarned,
      myths_busted: bustedCount,
    });

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
    });
    loseExplosionRingScale.value = withTiming(2.4, {
      duration: LOSE_EXPLOSION_DURATION_MS,
    });
    loseExplosionOpacity.value = withTiming(0, {
      duration: LOSE_EXPLOSION_DURATION_MS,
    });
    loseExplosionFlashOpacity.value = withTiming(0, {
      duration: LOSE_EXPLOSION_DURATION_MS,
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
        opacity.value = withTiming(0, { duration: 200 });

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
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const mythLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  const truthLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const timerIconWiggleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(timerWiggle.value, [0, 1], [-2.5, 2.5]) },
      { rotate: `${interpolate(timerWiggle.value, [0, 1], [-10, 10])}deg` },
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
        <View
          style={[
            styles.fullScreen,
            { backgroundColor: selectedMode.colorSecondary },
          ]}
        >
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
                  { backgroundColor: selectedMode.color },
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
              <View style={styles.introContainer}>
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
                    Swipe MYTH or TRUTH
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
                      title: "Swipe TRUTH",
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
                        <Icon name="Layer" size={16} color={THEME.textMuted} />
                        <Text style={styles.introStatText}>
                          {selectedMode.rounds === 999 ? "∞" : selectedMode.rounds}{" "}
                          rounds
                        </Text>
                      </View>
                      <View style={styles.introStatItem}>
                        <Icon
                          name="Flash"
                          size={16}
                          color={THEME.gold}
                          variant="Bold"
                        />
                        <Text style={styles.introStatText}>
                          {selectedMode.xpMultiplier}x XP
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
              </View>
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
    const totalAnswered = answeredMyths.length;
    const correctAnswers = answers.filter((a) => a).length;
    const accuracy =
      totalAnswered > 0
        ? Math.round((correctAnswers / totalAnswered) * 100)
        : 0;
    const wrongAnswers = totalAnswered - correctAnswers;

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
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? ["#1A1A2E", "#1A1A2E"]
              : ["#FFF9E6", "#FFF5D6", "#FFFBF0"]
          }
          style={styles.fullScreen}
        >
          <SafeAreaView style={styles.fullScreen}>
            {/* Header */}
            <View style={[styles.resultsHeader, { paddingTop: insets.top }]}>
              <View style={styles.resultsHeaderContent}>
                <TouchableOpacity
                  onPress={resetGame}
                  style={[
                    styles.resultsBackBtn,
                    {
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(255,255,255,0.2)",
                    },
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
                      { color: textColor, opacity: 0.6 },
                    ]}
                  >
                    {selectedMode.title} Mode
                  </Text>
                </View>
                <View style={{ width: 44 }} />
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.resultsContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Score Card with Mascot */}
              <View style={styles.resultsScoreCard}>
                <LinearGradient
                  colors={[selectedMode.color, selectedMode.color + "DD"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.resultsScoreGradient}
                >
                  <Image
                    source={
                      accuracy >= 50
                        ? require("@/assets/images/mascot/happy.png")
                        : require("@/assets/images/mascot/fix.png")
                    }
                    style={styles.resultsScoreMascot}
                    resizeMode="contain"
                  />
                  <Text style={styles.resultsScoreEmoji}>
                    {performance.emoji}
                  </Text>
                  <Text style={styles.resultsScoreTitle}>
                    {performance.text}
                  </Text>
                  <View style={styles.resultsXPBadge}>
                    <Icon name="Flash" size={20} color="#FFF" variant="Bold" />
                    <Text style={styles.resultsXPText}>{score} XP</Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Stats Row */}
              <View style={styles.resultsStatsRow}>
                <View
                  style={[
                    styles.resultsStatCard,
                    { backgroundColor: cardColor },
                  ]}
                >
                  <View
                    style={[
                      styles.resultsStatIcon,
                      { backgroundColor: THEME.success + "20" },
                    ]}
                  >
                    <Icon
                      name="TickCircle"
                      size={20}
                      color={THEME.success}
                      variant="Bold"
                    />
                  </View>
                  <Text style={[styles.resultsStatValue, { color: textColor }]}>
                    {correctAnswers}
                  </Text>
                  <Text style={styles.resultsStatLabel}>Correct</Text>
                </View>
                <View
                  style={[
                    styles.resultsStatCard,
                    { backgroundColor: cardColor },
                  ]}
                >
                  <View
                    style={[
                      styles.resultsStatIcon,
                      { backgroundColor: THEME.error + "20" },
                    ]}
                  >
                    <Icon
                      name="CloseCircle"
                      size={20}
                      color={THEME.error}
                      variant="Bold"
                    />
                  </View>
                  <Text style={[styles.resultsStatValue, { color: textColor }]}>
                    {wrongAnswers}
                  </Text>
                  <Text style={styles.resultsStatLabel}>Wrong</Text>
                </View>
                <View
                  style={[
                    styles.resultsStatCard,
                    { backgroundColor: cardColor },
                  ]}
                >
                  <View
                    style={[
                      styles.resultsStatIcon,
                      { backgroundColor: selectedMode.color + "20" },
                    ]}
                  >
                    <Icon
                      name="Chart"
                      size={20}
                      color={selectedMode.color}
                      variant="Bold"
                    />
                  </View>
                  <Text style={[styles.resultsStatValue, { color: textColor }]}>
                    {accuracy}%
                  </Text>
                  <Text style={styles.resultsStatLabel}>Accuracy</Text>
                </View>
              </View>

              {/* Review Section */}
              <View style={styles.resultsReviewSection}>
                <View style={styles.resultsReviewHeader}>
                  <Text
                    style={[styles.resultsReviewTitle, { color: textColor }]}
                  >
                    Review Answers
                  </Text>
                  <Text style={styles.resultsReviewSubtitle}>
                    Tap cards to see explanations
                  </Text>
                </View>

                {/* Tab Buttons */}
                <View
                  style={[styles.resultsTabRow, { backgroundColor: cardColor }]}
                >
                  <TouchableOpacity
                    style={[
                      styles.resultsTab,
                      reviewTab === "all" && [
                        styles.resultsTabActive,
                        { backgroundColor: selectedMode.color },
                      ],
                    ]}
                    onPress={() => setReviewTab("all")}
                  >
                    <Text
                      style={[
                        styles.resultsTabText,
                        reviewTab === "all" && styles.resultsTabTextActive,
                      ]}
                    >
                      All ({totalAnswered})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.resultsTab,
                      reviewTab === "wrong" && [
                        styles.resultsTabActive,
                        { backgroundColor: THEME.error },
                      ],
                    ]}
                    onPress={() => setReviewTab("wrong")}
                  >
                    <Text
                      style={[
                        styles.resultsTabText,
                        reviewTab === "wrong" && styles.resultsTabTextActive,
                      ]}
                    >
                      Missed ({wrongAnswers})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Review Cards */}
                {filteredMyths.length === 0 ? (
                  <View
                    style={[
                      styles.resultsEmptyState,
                      { backgroundColor: cardColor },
                    ]}
                  >
                    <View style={styles.resultsEmptyIcon}>
                      <Icon
                        name="TickCircle"
                        size={40}
                        color={THEME.success}
                        variant="Bold"
                      />
                    </View>
                    <Text
                      style={[
                        styles.resultsEmptyTitle,
                        { color: THEME.success },
                      ]}
                    >
                      Perfect Score!
                    </Text>
                    <Text style={styles.resultsEmptyText}>
                      You got all answers correct!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.resultsCardList}>
                    {filteredMyths.map((myth) => {
                      const isCorrect = answers[myth.originalIndex];
                      const isExpanded = expandedCard === myth.originalIndex;

                      return (
                        <TouchableOpacity
                          key={myth.originalIndex}
                          style={[
                            styles.resultsReviewCard,
                            { backgroundColor: cardColor },
                          ]}
                          onPress={() =>
                            setExpandedCard(
                              isExpanded ? null : myth.originalIndex,
                            )
                          }
                          activeOpacity={0.7}
                        >
                          {/* Colored side indicator */}
                          <View
                            style={[
                              styles.resultsCardIndicator,
                              {
                                backgroundColor: isCorrect
                                  ? THEME.success
                                  : THEME.error,
                              },
                            ]}
                          />

                          <View style={styles.resultsCardInner}>
                            {/* Card Header */}
                            <View style={styles.resultsCardHeader}>
                              <View
                                style={[
                                  styles.resultsCardNumber,
                                  {
                                    backgroundColor: isCorrect
                                      ? THEME.success
                                      : THEME.error,
                                  },
                                ]}
                              >
                                <Text style={styles.resultsCardNumberText}>
                                  {myth.originalIndex + 1}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.resultsCardBadge,
                                  {
                                    backgroundColor: myth.isTrue
                                      ? THEME.success + "15"
                                      : THEME.error + "15",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.resultsCardBadgeText,
                                    {
                                      color: myth.isTrue
                                        ? THEME.success
                                        : THEME.error,
                                    },
                                  ]}
                                >
                                  {myth.isTrue ? "TRUTH" : "MYTH"}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }} />
                              <Icon
                                name={isCorrect ? "TickCircle" : "CloseCircle"}
                                size={22}
                                color={isCorrect ? THEME.success : THEME.error}
                                variant="Bold"
                              />
                            </View>

                            {/* Statement */}
                            <Text
                              style={[
                                styles.resultsCardStatement,
                                { color: textColor },
                              ]}
                              numberOfLines={isExpanded ? undefined : 2}
                            >
                              {myth.statement}
                            </Text>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <View style={styles.resultsCardExpanded}>
                                <View style={styles.resultsCardDivider} />
                                <View
                                  style={[
                                    styles.resultsCardExplanation,
                                    { backgroundColor: backgroundColor },
                                  ]}
                                >
                                  <Icon
                                    name="Lamp"
                                    size={16}
                                    color={selectedMode.color}
                                    variant="Bold"
                                  />
                                  <MarkdownText
                                    text={myth.explanation}
                                    style={styles.resultsCardExplanationText}
                                    textColor={textColor}
                                  />
                                </View>
                              </View>
                            )}

                            {/* Expand hint */}
                            <View style={styles.resultsCardFooter}>
                              <Icon
                                name={isExpanded ? "ArrowUp2" : "ArrowDown2"}
                                size={16}
                                color={THEME.textMuted}
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
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

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </GestureHandlerRootView>
    );
  }

  // Playing state
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        colors={[backgroundColor, backgroundColor]}
        style={{ flex: 1 }}
      >
        <View
          style={[styles.gameHeaderContainer, { paddingTop: insets.top + 16 }]}
        >
          {/* Header */}
          <View style={styles.gameHeader}>
            <TouchableOpacity
              onPress={() => resetGame()}
              style={[styles.gameCloseButton, { backgroundColor: cardColor }]}
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
                    entering={FadeInDown.duration(300)}
                    style={[
                      styles.progressFill,
                      {
                        width: `${((currentIndex + 1) / myths.length) * 100}%`,
                        backgroundColor: selectedMode.color,
                      },
                    ]}
                  />
                )}
              </View>
            </View>

            <View
              style={[styles.scoreContainer, { backgroundColor: cardColor }]}
            >
              <Icon name="Flash" size={16} color={THEME.gold} variant="Bold" />
              <Text style={[styles.scoreText, { color: textColor }]}>
                {score}
              </Text>
            </View>

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
            entering={FadeInDown.springify()}
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
                <Text style={styles.streakBonus}>+{streak * 2} XP Bonus</Text>
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
              TRUTH
            </Text>
          </Animated.View>

          {/* Next card preview (if exists) */}
          {currentIndex < myths.length - 1 && (
            <View style={[styles.card, styles.cardBehind]}>
              <View style={styles.cardContent}>
                <Text style={styles.cardStatement}>Next statement...</Text>
              </View>
            </View>
          )}

          {/* Current card */}
          {currentMyth && (
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.card, animatedStyle]}>
                <View
                  style={[
                    styles.cardInner,
                    { backgroundColor: cardColor, borderColor },
                  ]}
                >
                  {selectedMode.timeLimit && timeLeft !== null ? (
                    <View style={styles.cardHeaderRight}>
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
                    </View>
                  ) : null}

                  {selectedMode.id === "endless" && (
                    <View style={styles.cardHeaderRight}>
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
                    </View>
                  )}

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
            <TouchableOpacity
              style={[styles.actionButton, styles.mythButton]}
              onPress={() => {
                if (isAnimating || currentIndex >= myths.length) return;
                translateX.value = withSpring(-width);
                opacity.value = withTiming(0, { duration: 200 });
                handleSwipe("myth");
              }}
              activeOpacity={isAnimating ? 1 : 0.8}
              disabled={isAnimating}
            >
              <View
                  style={[
                    styles.actionButtonGradient,
                    { backgroundColor: cardColor, borderColor },
                  ]}
                >
                  <View style={[styles.actionButtonIcon, { backgroundColor: subtleBg }]}>
                    <Icon
                      name="CloseCircle"
                      size={24}
                      color={THEME.error}
                      variant="Bold"
                    />
                  </View>
                  <Text style={[styles.actionButtonText, { color: THEME.error }]}>
                    MYTH
                  </Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.truthButton]}
              onPress={() => {
                if (isAnimating || currentIndex >= myths.length) return;
                translateX.value = withSpring(width);
                opacity.value = withTiming(0, { duration: 200 });
                handleSwipe("truth");
              }}
              activeOpacity={isAnimating ? 1 : 0.8}
              disabled={isAnimating}
            >
              <View
                  style={[
                    styles.actionButtonGradient,
                    { backgroundColor: cardColor, borderColor },
                  ]}
                >
                  <View style={[styles.actionButtonIcon, { backgroundColor: subtleBg }]}>
                    <Icon
                      name="TickCircle"
                      size={24}
                      color={THEME.success}
                      variant="Bold"
                    />
                  </View>
                  <Text style={[styles.actionButtonText, { color: THEME.success }]}>
                    TRUTH
                  </Text>
                </View>
            </TouchableOpacity>
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
      </LinearGradient>
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
    fontWeight: "900",
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
    fontWeight: "900",
    fontFamily: fontFamilies.heavy,
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 14,
    fontWeight: "600",
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
    fontWeight: "600",
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
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
    fontWeight: "900",
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
    fontWeight: "700",
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
    fontWeight: "800",
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
    borderRadius: 4,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
    marginBottom: 2,
  },
  streakBonus: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: fontFamilies.semibold,
    color: "rgba(255,255,255,0.9)",
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
  cardBehind: {
    transform: [{ scale: 0.95 }],
    opacity: 0.5,
  },
  cardInner: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderBottomWidth: 6,
    position: "relative",
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-end",
    marginBottom: 24,
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
    fontWeight: "700",
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
    fontWeight: "900",
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
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 12,
  },
  actionButtonIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mythButton: {
    // Styles applied via gradient
  },
  truthButton: {
    // Styles applied via gradient
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    letterSpacing: 0.5,
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
    fontWeight: "900",
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
    paddingBottom: 16,
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
  },
  resultsHeaderTitle: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
  },
  resultsHeaderSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: fontFamilies.medium,
    marginTop: 2,
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
    fontWeight: "900",
    fontFamily: fontFamilies.black,
    color: "#FFF",
    marginBottom: 12,
    textAlign: "center",
  },
  resultsXPBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resultsXPText: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: fontFamilies.black,
    color: "#FFF",
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
    fontWeight: "900",
    fontFamily: fontFamilies.black,
    color: "#FFF",
    marginBottom: 4,
  },
  resultsHeroScore: {
    fontSize: 16,
    fontWeight: "600",
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
    fontWeight: "900",
    fontFamily: fontFamilies.black,
    color: THEME.text,
  },
  resultsStatLabel: {
    fontSize: 11,
    fontWeight: "600",
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
    fontWeight: "800",
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
  resultsTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  resultsTabActive: {
    backgroundColor: THEME.primary,
  },
  resultsTabText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
    color: THEME.textMuted,
  },
  resultsTabTextActive: {
    color: "#FFF",
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
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
  },
  resultsCardStatement: {
    fontSize: 14,
    fontWeight: "600",
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
    borderRadius: 16,
    marginBottom: 12,
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.15)",
  },
  resultsPlayAgainText: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
  },
  resultsHomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  resultsHomeText: {
    fontSize: 16,
    fontWeight: "700",
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
    fontWeight: "900",
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
    fontWeight: "600",
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "900",
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
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
  },
  resultsActions: {
    width: "100%",
    gap: 12,
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
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "900",
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
    fontWeight: "800",
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
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
  },
  reviewStatement: {
    fontSize: 15,
    fontWeight: "600",
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
});
