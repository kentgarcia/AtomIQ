import { Icon } from "@/components/ui/icon";
import { getAllMyths } from "@/content/myths";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useStorage } from "@/services/StorageContext";
import { logDailyActivity } from "@/services/database";
import { playGameSfx, preloadGameSfx } from "@/services/game-sfx";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

type GameState = "mode-select" | "intro" | "playing" | "results";
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
    timeLimit: 5,
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
  const { addXP, updateUserProfile, userProfile } = useStorage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const backgroundColor =
    colorScheme === "dark" ? "#1A1A2E" : useThemeColor({}, "background");
  const textColor =
    colorScheme === "dark" ? "#EAEAEA" : useThemeColor({}, "text");
  const cardColor =
    colorScheme === "dark" ? "#16213E" : useThemeColor({}, "card");

  const [gameState, setGameState] = useState<GameState>("mode-select");
  const [selectedMode, setSelectedMode] = useState<ModeConfig>(GAME_MODES[0]);
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
    setGameState("mode-select");
    setMyths([]);
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

  if (gameState === "mode-select") {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.fullScreen, { backgroundColor }]}>
          {/* Header */}
          <View
            style={[
              styles.modeHeader,
              { paddingTop: insets.top + 16, backgroundColor: cardColor },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButtonCircle, { backgroundColor }]}
            >
              <Icon name="ArrowLeft2" size={20} color={textColor} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.modeHeaderTitle, { color: textColor }]}>
                MythBuster
              </Text>
              <Text style={styles.modeHeaderSubtitle}>
                Choose your challenge
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.modeScrollView}
            contentContainerStyle={styles.modeContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Mode Cards */}
            <View style={styles.modesGridNew}>
              {GAME_MODES.map((mode, index) => (
                <Pressable
                  key={mode.id}
                  onPress={() => startMode(mode)}
                  style={({ pressed }) => [
                    styles.modeCardNew,
                    pressed && styles.modeCardPressed,
                  ]}
                >
                  {/* 3D Card Bottom Layer (Shadow/Depth) */}
                  <View
                    style={[
                      styles.card3DBottom,
                      { backgroundColor: mode.color + "AA" },
                    ]}
                  />

                  {/* 3D Card Middle Layer */}
                  <View
                    style={[
                      styles.card3DMiddle,
                      { backgroundColor: mode.color },
                    ]}
                  />

                  {/* Card Background Gradient - Top Layer */}
                  <LinearGradient
                    colors={[mode.colorSecondary, mode.color]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.3, y: 1 }}
                    style={styles.modeCardGradientNew}
                  >
                    {/* Shine Effect */}
                    <View style={styles.cardShine} />

                    {/* Decorative Circles */}
                    <View style={[styles.cardCircle, styles.cardCircle1]} />
                    <View style={[styles.cardCircle, styles.cardCircle2]} />

                    {/* Icon Badge */}
                    <View style={styles.modeIconBadge}>
                      <View style={styles.modeIconInner}>
                        <Icon
                          name={mode.icon as any}
                          size={28}
                          color={mode.color}
                          variant="Bold"
                        />
                      </View>
                      {/* Icon Badge Shine */}
                      <View style={styles.iconBadgeShine} />
                    </View>

                    {/* Content */}
                    <View style={styles.modeCardContent}>
                      <Text style={styles.modeCardTitleNew}>{mode.title}</Text>
                      <Text style={styles.modeCardDescNew}>
                        {mode.description}
                      </Text>

                      {/* Tagline Banner */}
                      <View style={styles.taglineBanner}>
                        <Text style={styles.taglineText}>{mode.tagline}</Text>
                      </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.modeStatsRow}>
                      {/* Difficulty Stars */}
                      <View style={styles.difficultyStars}>
                        {[1, 2, 3].map((star) => (
                          <Icon
                            key={star}
                            name="Star1"
                            size={14}
                            color={
                              star <= mode.difficulty
                                ? "#FFD700"
                                : "rgba(255,255,255,0.3)"
                            }
                            variant="Bold"
                          />
                        ))}
                      </View>

                      {/* XP Multiplier */}
                      <View style={styles.xpBadge}>
                        <Icon
                          name="Flash"
                          size={12}
                          color="#FFD700"
                          variant="Bold"
                        />
                        <Text style={styles.xpBadgeText}>
                          {mode.xpMultiplier}x
                        </Text>
                      </View>

                      {/* Rounds */}
                      <View style={styles.roundsBadge}>
                        <Icon
                          name="Layer"
                          size={12}
                          color="rgba(255,255,255,0.9)"
                        />
                        <Text style={styles.roundsBadgeText}>
                          {mode.rounds === 999 ? "∞" : mode.rounds}
                        </Text>
                      </View>
                    </View>

                    {/* Play Arrow */}
                    <View style={styles.playArrowCircle}>
                      <Icon
                        name="Play"
                        size={20}
                        color={mode.color}
                        variant="Bold"
                      />
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>

            {/* Info Card */}
            <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
              <View style={styles.infoIconWrap}>
                <Icon name="InfoCircle" size={20} color={THEME.primary} />
              </View>
              <Text style={[styles.infoText, { color: textColor }]}>
                Swipe left for{" "}
                <Text style={{ color: THEME.error, fontWeight: "800" }}>
                  MYTH
                </Text>{" "}
                and right for{" "}
                <Text style={{ color: THEME.success, fontWeight: "800" }}>
                  TRUTH
                </Text>
                !
              </Text>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </GestureHandlerRootView>
    );
  }

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

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient
          colors={[selectedMode.colorSecondary, selectedMode.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fullScreen}
        >
          <SafeAreaView style={styles.fullScreen}>
            {/* Header */}
            <View style={styles.introHeader}>
              <TouchableOpacity onPress={resetGame} style={styles.introBackBtn}>
                <Icon name="ArrowLeft2" size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.introModePillLight}>
                <Icon
                  name={selectedMode.icon as any}
                  size={14}
                  color="#FFF"
                  variant="Bold"
                />
                <Text style={styles.introModePillText}>
                  {selectedMode.title}
                </Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.introContent}>
              {/* Single white card with all instructions */}
              <View style={styles.introWhiteCard}>
                <Text style={styles.introCardTitle}>How to Play</Text>

                {/* Swipe instructions */}
                <View style={styles.introSwipeRow}>
                  <View
                    style={[
                      styles.introSwipeItem,
                      { backgroundColor: THEME.error + "10" },
                    ]}
                  >
                    <Icon
                      name="ArrowLeft"
                      size={20}
                      color={THEME.error}
                      variant="Bold"
                    />
                    <Text
                      style={[styles.introSwipeLabel, { color: THEME.error }]}
                    >
                      MYTH
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.introSwipeItem,
                      { backgroundColor: THEME.success + "10" },
                    ]}
                  >
                    <Text
                      style={[styles.introSwipeLabel, { color: THEME.success }]}
                    >
                      TRUTH
                    </Text>
                    <Icon
                      name="ArrowRight"
                      size={20}
                      color={THEME.success}
                      variant="Bold"
                    />
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.introCardDivider} />

                {/* Mode info */}
                <View style={styles.introModeInfo}>
                  <Icon
                    name={
                      selectedMode.id === "endless"
                        ? "Heart"
                        : (selectedMode.icon as any)
                    }
                    size={18}
                    color={selectedMode.color}
                    variant="Bold"
                  />
                  <Text style={styles.introModeInfoText}>
                    {getModeInstruction()}
                  </Text>
                </View>

                {/* Stats row */}
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
              </View>
            </View>

            {/* Bottom Start Button */}
            <View style={styles.introBottom}>
              <TouchableOpacity
                onPress={() => setGameState("playing")}
                activeOpacity={0.9}
                style={styles.introStartBtnWhite}
              >
                <Text
                  style={[
                    styles.introStartTextColored,
                    { color: selectedMode.color },
                  ]}
                >
                  Start Game
                </Text>
                <Icon
                  name="ArrowRight2"
                  size={20}
                  color={selectedMode.color}
                  variant="Bold"
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </GestureHandlerRootView>
    );
  }

  if (gameState === "results") {
    const correctAnswers = answers.filter((a) => a).length;
    const accuracy = Math.round((correctAnswers / myths.length) * 100);
    const wrongAnswers = myths.length - correctAnswers;

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
        ? myths
            .map((m, i) => ({ ...m, originalIndex: i }))
            .filter((_, i) => !answers[i])
        : myths.map((m, i) => ({ ...m, originalIndex: i }));

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
                      All ({myths.length})
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
                                  <Text
                                    style={[
                                      styles.resultsCardExplanationText,
                                      { color: textColor },
                                    ]}
                                  >
                                    {myth.explanation}
                                  </Text>
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
                  onPress={resetGame}
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
                {selectedMode.timeLimit && timeLeft !== null && (
                  <View
                    style={[
                      styles.timerBadge,
                      {
                        backgroundColor:
                          timeLeft <= 3 ? THEME.error : selectedMode.color,
                      },
                    ]}
                  >
                    <Icon name="Timer" size={14} color="#FFF" variant="Bold" />
                    <Text style={styles.timerText}>{timeLeft}s</Text>
                  </View>
                )}
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
                  style={[styles.cardInner, { backgroundColor: cardColor }]}
                >
                  {/* Decorative corner accents */}
                  <View
                    style={[
                      styles.cardCornerAccent,
                      styles.cardCornerTopLeft,
                      { backgroundColor: selectedMode.color },
                    ]}
                  />
                  <View
                    style={[
                      styles.cardCornerAccent,
                      styles.cardCornerBottomRight,
                      { backgroundColor: selectedMode.color },
                    ]}
                  />

                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.difficultyBadge,
                        { backgroundColor: selectedMode.color + "20" },
                      ]}
                    >
                      <Icon
                        name="Layer"
                        size={14}
                        color={selectedMode.color}
                        variant="Bold"
                      />
                      <Text
                        style={[
                          styles.difficultyText,
                          { color: selectedMode.color },
                        ]}
                      >
                        {currentMyth.difficulty.toUpperCase()}
                      </Text>
                    </View>
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

                  <View style={styles.cardContent}>
                    <View style={styles.quoteContainer}>
                      <Text
                        style={[
                          styles.quoteMarkTop,
                          { color: selectedMode.color },
                        ]}
                      >
                        "
                      </Text>
                      <Text
                        style={[styles.cardStatement, { color: textColor }]}
                      >
                        {currentMyth.statement}
                      </Text>
                      <Text
                        style={[
                          styles.quoteMarkBottom,
                          { color: selectedMode.color },
                        ]}
                      >
                        "
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View
                      style={[
                        styles.swipeHint,
                        { backgroundColor: backgroundColor },
                      ]}
                    >
                      <View
                        style={[
                          styles.swipeHintItem,
                          { backgroundColor: THEME.error + "15" },
                        ]}
                      >
                        <Icon
                          name="ArrowLeft"
                          size={14}
                          color={THEME.error}
                          variant="Bold"
                        />
                        <Text style={[styles.hintText, { color: THEME.error }]}>
                          MYTH
                        </Text>
                      </View>
                      <View style={styles.swipeHintDivider} />
                      <View
                        style={[
                          styles.swipeHintItem,
                          { backgroundColor: THEME.success + "15" },
                        ]}
                      >
                        <Text
                          style={[styles.hintText, { color: THEME.success }]}
                        >
                          TRUTH
                        </Text>
                        <Icon
                          name="ArrowRight"
                          size={14}
                          color={THEME.success}
                          variant="Bold"
                        />
                      </View>
                    </View>
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
              <LinearGradient
                colors={[THEME.error, "#C0392B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <View style={styles.actionButtonIcon}>
                  <Icon
                    name="CloseCircle"
                    size={28}
                    color="#FFF"
                    variant="Bold"
                  />
                </View>
                <Text style={styles.actionButtonText}>MYTH</Text>
              </LinearGradient>
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
              <LinearGradient
                colors={[THEME.success, "#27AE60"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <View style={styles.actionButtonIcon}>
                  <Icon
                    name="TickCircle"
                    size={28}
                    color="#FFF"
                    variant="Bold"
                  />
                </View>
                <Text style={styles.actionButtonText}>TRUTH</Text>
              </LinearGradient>
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

  // Intro Screen
  introContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  introIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 8,
    textAlign: "center",
  },
  introSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 40,
    textAlign: "center",
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
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  introModePillLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  introModePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
  },
  introContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  // Single white card
  introWhiteCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  introCardTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: THEME.text,
    textAlign: "center",
    marginBottom: 20,
  },
  introSwipeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  introSwipeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  introSwipeLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  introCardDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginBottom: 16,
  },
  introModeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  introModeInfoText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.text,
    flex: 1,
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
    color: THEME.textMuted,
  },
  introBottom: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  introStartBtnWhite: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFF",
    paddingVertical: 18,
    borderRadius: 28,
  },
  introStartTextColored: {
    fontSize: 17,
    fontWeight: "800",
  },
  // Legacy styles
  instructionsCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    marginBottom: 32,
    gap: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  swipeDemo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.text,
    flex: 1,
  },
  bonusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.gold + "20",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  bonusText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.text,
    flex: 1,
  },
  startButton: {
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
  startButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.primary,
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
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "800",
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
    color: "#FFF",
    marginBottom: 2,
  },
  streakBonus: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  card: {
    width: width - 40,
    height: height * 0.55,
    position: "absolute",
  },
  cardBehind: {
    transform: [{ scale: 0.95 }],
    opacity: 0.5,
  },
  cardInner: {
    flex: 1,
    borderRadius: 32,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: "relative",
  },
  cardCornerAccent: {
    position: "absolute",
    width: 40,
    height: 40,
    opacity: 0.15,
  },
  cardCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  cardCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  difficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "800",
  },
  livesContainer: {
    flexDirection: "row",
    gap: 4,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  quoteContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  quoteMarkTop: {
    fontSize: 48,
    fontWeight: "900" as "900",
    opacity: 0.3,
    marginBottom: 16,
    lineHeight: 48,
  },
  quoteMarkBottom: {
    fontSize: 48,
    fontWeight: "900" as "900",
    opacity: 0.3,
    marginTop: 16,
    lineHeight: 48,
  },
  cardStatement: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 36,
    textAlign: "center",
  },
  cardFooter: {
    alignItems: "center",
    marginTop: 16,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  swipeHintItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  swipeHintDivider: {
    width: 2,
    height: 20,
    backgroundColor: "#E5E7EB",
  },
  hintText: {
    fontSize: 12,
    fontWeight: "800",
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
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  actionButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
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
  },
  resultsHeaderSubtitle: {
    fontSize: 14,
    fontWeight: "500",
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
    marginBottom: 6,
  },
  resultsScoreTitle: {
    fontSize: 22,
    fontWeight: "900",
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
    marginBottom: 8,
  },
  resultsHeroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 4,
  },
  resultsHeroScore: {
    fontSize: 16,
    fontWeight: "600",
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
    color: THEME.text,
  },
  resultsStatLabel: {
    fontSize: 11,
    fontWeight: "600",
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
    color: THEME.text,
    marginBottom: 4,
  },
  resultsReviewSubtitle: {
    fontSize: 13,
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
    color: THEME.success,
  },
  resultsEmptyText: {
    fontSize: 14,
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
  },
  resultsCardStatement: {
    fontSize: 14,
    fontWeight: "600",
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
    color: THEME.text,
    lineHeight: 19,
  },
  resultsCardFooter: {
    alignItems: "center",
    marginTop: 10,
  },
  resultsCardHint: {
    fontSize: 12,
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
    color: THEME.textMuted,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "900",
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
    color: THEME.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
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
    color: "#FFF",
  },

  // Mode Selection Screen
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  modeHeaderTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  modeHeaderSubtitle: {
    fontSize: 14,
    color: "#8898AA",
    fontWeight: "500",
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modeScrollView: {
    flex: 1,
  },
  modeContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  // Decorations
  decorationsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    overflow: "hidden",
    zIndex: 0,
  },
  floatingDecor: {
    position: "absolute",
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  buntingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: -8,
    paddingHorizontal: 20,
  },
  buntingFlag: {
    width: 20,
    height: 28,
    borderRadius: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  // Title Section
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
    marginTop: 8,
  },
  titleMascot: {
    width: 90,
    height: 90,
  },
  titleBubble: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 18,
    // 3D effect
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    borderTopColor: "rgba(255,255,255,1)",
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 5,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modeTitleNew: {
    fontSize: 24,
    fontWeight: "900",
    color: THEME.text,
    marginBottom: 4,
  },
  modeSubtitleNew: {
    fontSize: 14,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  // New Mode Cards - 3D Style
  modesGridNew: {
    gap: 22,
  },
  modeCardNew: {
    borderRadius: 24,
    position: "relative",
    height: 160,
  },
  modeCardPressed: {
    transform: [{ scale: 0.97 }, { translateY: 2 }],
  },
  // 3D Layers
  card3DBottom: {
    position: "absolute",
    top: 8,
    left: 4,
    right: -4,
    bottom: -8,
    borderRadius: 24,
    opacity: 0.4,
  },
  card3DMiddle: {
    position: "absolute",
    top: 4,
    left: 2,
    right: -2,
    bottom: -4,
    borderRadius: 24,
    opacity: 0.6,
  },
  modeCardGradientNew: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    padding: 20,
    paddingRight: 60,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    borderTopColor: "rgba(255,255,255,0.5)",
    borderLeftColor: "rgba(255,255,255,0.4)",
  },
  // Shine Effect
  cardShine: {
    position: "absolute",
    top: -50,
    left: -50,
    width: 100,
    height: 200,
    backgroundColor: "rgba(255,255,255,0.15)",
    transform: [{ rotate: "45deg" }],
  },
  cardCircle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardCircle1: {
    width: 140,
    height: 140,
    top: -40,
    right: -40,
  },
  cardCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -30,
  },
  modeIconBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    // 3D effect for badge
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderTopColor: "rgba(255,255,255,0.6)",
  },
  modeIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    // Inner shadow effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBadgeShine: {
    position: "absolute",
    top: 4,
    left: 8,
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
    transform: [{ rotate: "-20deg" }],
  },
  modeCardContent: {
    marginLeft: 60,
    flex: 1,
  },
  modeCardTitleNew: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 4,
  },
  modeCardDescNew: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginBottom: 8,
  },
  taglineBanner: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  modeStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    marginLeft: 64,
  },
  difficultyStars: {
    flexDirection: "row",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,215,0,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  roundsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  roundsBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
  },
  playArrowCircle: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    // 3D effect
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderRightColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  // Legacy styles kept for compatibility
  modeTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: THEME.text,
    marginBottom: 8,
  },
  modeSubtitle: {
    fontSize: 16,
    color: THEME.textMuted,
    marginBottom: 32,
  },
  modesGrid: {
    gap: 16,
  },
  modeCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
  },
  modeCardGradient: {
    padding: 24,
    gap: 12,
  },
  modeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  modeCardTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
  },
  modeCardDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  modeStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  modeStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modeStatText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  modePlayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 12,
    borderRadius: 16,
  },
  modePlayText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.text,
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
    color: "#FFF",
    textAlign: "center",
  },
  reviewSubtitle: {
    fontSize: 14,
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
  },
  reviewStatement: {
    fontSize: 15,
    fontWeight: "600",
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
    color: THEME.textMuted,
    lineHeight: 18,
  },
});
