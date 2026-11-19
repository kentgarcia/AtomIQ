import { RESULT_FX } from "@/components/celebration/celebration-core";
import { StatTile } from "@/components/lesson/StatTile";
import { STAT_FX, shineStart, statStart } from "@/components/lesson/stat-reveal-core";
import { SfxOnMount } from "@/components/ui/sfx-on-mount";
import { Stamp } from "@/components/lesson/Stamp";
import { Reveal } from "@/components/motion/Reveal";
import {
  createStyles,
  fontFaces,
  useResponsiveLayout,
  useTheme,
  withAlpha,
} from "@/theme";
import { MarkdownText } from "@/components/markdown-text";
import { Icon } from "@/components/ui/icon";
import { GAME_MODES, type ModeConfig } from "@/constants/mythbuster-modes";
import { getAllMyths } from "@/content/myths";
import { getUnitStatements } from "@/content/myths/unit-statements";
import { contentRepository } from "@/services/content-db";
import {
  challengeRound,
  clockAfterAnswer,
  clockTick,
  livesAfterAnswer,
  nextEndless,
  originalDeck,
  quickRound,
  unitDeck,
  type GameStatement,
} from "@/services/mythbuster-core";
import { useStorage } from "@/services/StorageContext";
import { recordActivity } from "@/services/activity-log";
import { logDailyActivity, saveGameScore } from "@/services/database";
import { toLocalIsoDate } from "@/services/utils";
import { recordMissionEvent } from "@/services/missions";
import { pinSfx, playSfx, warmSfxGroup } from "@/services/sfx";
import type { SfxCue } from "@/services/sfx-core";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { readAloud } from "@/services/media";
import { buildMythSpeech } from "@/services/media-core";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
    Alert,
    BackHandler,
    Dimensions,
    Image,
    Platform,
    Pressable,
    ScrollView,
    View,
} from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Explosion, useExplosionShake } from "@/components/games/Explosion";
import { EXPLOSION } from "@/components/games/explosion-core";
import { OptionButton } from "@/components/lesson/cards/shared";
import { HeaderButton, ScreenHeader } from "@/components/layout";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  ZoomIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, EASE_OUT } from "@/theme/motion";

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.3;
/** Endless, out of time: how long the "time's up" sound is heard before the explosion. */
const TIME_UP_BEAT_MS = 700;

// Shared screen backdrop mirrors the autumn cream → white page gradient used
// across the home + games tabs (theme.colors.background).



type GameState = "intro" | "playing" | "results";

/** The countdown before every round: a quick beat each (the sound of each is its own file, and rings on into the next), then GO. */
const COUNTDOWN: readonly { label: string; cue: SfxCue; ms: number }[] = [
  { label: "3", cue: "game.count-one", ms: 650 },
  { label: "2", cue: "game.count-two", ms: 650 },
  { label: "1", cue: "game.count-three", ms: 650 },
  { label: "GO!", cue: "game.count-finish", ms: 500 },
];

export default function MythBusterScreen() {
  const router = useRouter();
  const { mode: modeParam, unit: unitParam } = useLocalSearchParams<{ mode?: string; unit?: string }>();
  const { updateUserProfile, userProfile } = useStorage();
  const insets = useSafeAreaInsets();
  const {
    width: windowWidth,
    contentMaxWidth,
    gutter,
  } = useResponsiveLayout();
  const frameWidth = Math.min(windowWidth, contentMaxWidth);
  const { theme } = useTheme();
  const textColor = theme.colors.text;
  const borderColor = theme.colors.border;
  const mutedText = theme.colors.textMuted;
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
  const [lives, setLives] = useState(3); // Challenge: lives left
  // Review rows start collapsed (some explanations are long): the ones opened by a tap
  const [openRows, setOpenRows] = useState<ReadonlySet<number>>(new Set());
  const [reviewTab, setReviewTab] = useState<"all" | "wrong">("all");
  const [shownMythIds, setShownMythIds] = useState<Set<string>>(new Set()); // Track shown myths in endless
  const [allGameStatements, setAllGameStatements] = useState<any[]>([]); // All possible myths for endless
  const [isLoseExplosionVisible, setIsLoseExplosionVisible] = useState(false);
  // Every round starts with a countdown: the step on show (an index of COUNTDOWN), or null when it is over
  const [countStep, setCountStep] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  // The button just answered shows right or wrong (the lesson buttons' pop and shake) while its card leaves
  const [picked, setPicked] = useState<{ side: "myth" | "truth"; ok: boolean } | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const cardEntranceY = useSharedValue(0);
  const cardEntranceOpacity = useSharedValue(1);
  const timerWiggle = useSharedValue(0);
  // The explosion's clock (ms, 0 up to EXPLOSION.total) and the page's shake that goes with it
  const explosionClock = useSharedValue(0);
  const shakeStyle = useExplosionShake(explosionClock);

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
    warmSfxGroup("game");
    pinSfx("reward.finish-jingle");
  }, []);

  // Read Aloud: one control per statement. A new statement changes the owner
  // id, which stops the previous narration; leaving the game stops it too.
  const readAloudOwner = `mythbuster:${currentMyth?.id ?? "none"}`;

  // Leaving the playing state (game over, results) ends any narration.
  useEffect(() => {
    if (gameState !== "playing") readAloud.stop("screen-exit");
  }, [gameState]);

  // Endless: one clock for the whole round. It ticks every second; a right answer adds time and a wrong one takes it
  // away (handleSwipe); at 0 the round is over.
  const clock = selectedMode.clock;
  const endingRef = useRef(false);
  useEffect(() => {
    if (gameState !== "playing" || !clock || countStep !== null) return;
    const timer = setInterval(() => setTimeLeft((prev) => (prev === null ? prev : clockTick(prev))), 1000);
    return () => clearInterval(timer);
  }, [gameState, clock, countStep]);

  // The countdown: each step plays its sound and holds for its time; after GO the round and its clock begin
  useEffect(() => {
    if (countStep === null || gameState !== "playing") return;
    const step = COUNTDOWN[countStep]!;
    void playSfx(step.cue);
    const timer = setTimeout(() => setCountStep(countStep + 1 < COUNTDOWN.length ? countStep + 1 : null), step.ms);
    return () => clearTimeout(timer);
  }, [countStep, gameState]);

  useEffect(() => {
    if (gameState !== "playing" || !clock || countStep !== null || timeLeft !== 0 || endingRef.current) return;
    endingRef.current = true;
    setIsAnimating(true);
    showLoseExplosionAndFinish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, gameState, clock, countStep]);

  // The clock's icon wiggles in its last seconds
  useEffect(() => {
    if (gameState === "playing" && clock && timeLeft !== null && timeLeft > 0 && timeLeft <= 5) {
      timerWiggle.value = withRepeat(withSpring(1, { damping: 10, stiffness: 180 }), -1, true);
      return;
    }
    timerWiggle.value = withTiming(0, { duration: 120, easing: EASE_OUT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, clock, timeLeft]);

  useEffect(() => {
    // Endless: the bar is the clock, draining as it ticks; other modes: how far through the deck
    if (clock) {
      progress.value = withTiming((timeLeft ?? 0) / clock.max, { duration: 900, easing: Easing.linear });
      return;
    }
    progress.value = withTiming((currentIndex + 1) / Math.max(1, myths.length), { duration: 300, easing: EASE_OUT });
  }, [currentIndex, myths.length, clock, timeLeft, progress]);

  useEffect(() => {
    if (score > prevScore.current) {
      prevScore.current = score;
      scorePulse.value = withSequence(
        withTiming(1, { duration: 120, easing: EASE_OUT }),
        withTiming(0, { duration: 200, easing: EASE_OUT }),
      );
    }
  }, [score, scorePulse]);

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
    setOpenRows(new Set());
    // The answer buttons go back to rest (they would replay the last answer's right or wrong otherwise)
    setPicked(null);
    setShownMythIds(new Set());
    setAllGameStatements([]);
    setIsLoseExplosionVisible(false);
    resetCardTransformState();
    cancelAnimation(explosionClock);
    explosionClock.value = 0;
  };

  // Quick Play's unit, kept so "Play again" replays the same theme
  const quickUnitRef = useRef<string | null>(null);

  const startMode = async (mode: ModeConfig, requestedUnit?: string) => {
    resetRoundState();
    endingRef.current = false;
    setSelectedMode(mode);
    const [allMyths, statements, units] = await Promise.all([getAllMyths(), getUnitStatements(), contentRepository.getUnits()]);
    const titleOf = (unitId: string) => units.find((u) => u.id === unitId)?.title ?? unitId;
    const original = originalDeck(allMyths);
    const unitCards = (rows: typeof statements) => rows.flatMap((r) => unitDeck([r], titleOf(r.unitId)));

    let round: GameStatement[];
    if (mode.byUnit) {
      // Quick Play: the chosen unit's deck (a unit with statements when none was asked for)
      const unitId = requestedUnit ?? quickUnitRef.current ?? statements[0]?.unitId ?? "";
      quickUnitRef.current = unitId;
      round = quickRound(unitCards(statements.filter((r) => r.unitId === unitId)), mode.rounds);
    } else if (mode.clock) {
      // Endless: both decks without repeats until all were seen; it starts with one statement and serves the next after each answer
      const pool = [...original, ...unitCards(statements)];
      setAllGameStatements(pool);
      const first = nextEndless(pool, new Set());
      round = first ? [first] : [];
    } else {
      // Challenge: a mix of the original statements and the units'
      round = challengeRound(original, unitCards(statements), mode.rounds);
    }
    setMyths(round);
    setLives(mode.lives ?? 0);
    setTimeLeft(mode.clock?.start ?? null);
    setCountStep(0);
    setPicked(null);

    // The instructions live in the Games tab's header now: a level starts the game itself
    setGameState("playing");
  };

  // Arrived from the Games tab difficulty panel → start the game directly
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    const param = Array.isArray(modeParam) ? modeParam[0] : modeParam;
    const unit = Array.isArray(unitParam) ? unitParam[0] : unitParam;
    const mode = GAME_MODES.find((m) => m.id === param) ?? GAME_MODES[0];
    void startMode(mode, unit);
  }, [modeParam, unitParam]);

  const handleSwipe = (direction: "truth" | "myth") => {
    if (!currentMyth || isAnimating || countStep !== null) return;

    setIsAnimating(true);
    readAloud.stop("answered", readAloudOwner);

    const isCorrect =
      (direction === "myth" && !currentMyth.isTrue) ||
      (direction === "truth" && currentMyth.isTrue);
    setPicked({ side: direction, ok: isCorrect });

    // The card is swept away, then the verdict (docs/SFX_SPEC.md §6.7)
    void playSfx("lesson.whoosh");
    void playSfx(isCorrect ? "lesson.answer-correct" : "lesson.answer-wrong");

    // Check if this myth has been shown before (for endless mode)
    const isFirstAppearance =
      selectedMode.id === "endless" && !shownMythIds.has(currentMyth.id);

    const basePoints = 10;
    const streakBonus = streak * 2;
    const modeMultiplier = selectedMode.xpMultiplier;
    const earnedPoints = Math.round((basePoints + streakBonus) * modeMultiplier);

    if (isCorrect) {
      // Only add points on first appearance in endless mode
      if (selectedMode.id !== "endless" || isFirstAppearance) {
        setScore((s) => s + earnedPoints);
      }
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    // Challenge: a wrong answer costs a life, and with none left the round is over
    if (selectedMode.lives) {
      const left = livesAfterAnswer(lives, isCorrect);
      setLives(left);
      if (left <= 0) {
        setAnswers((prev) => [...prev, isCorrect]);
        setTimeout(() => showLoseExplosionAndFinish(), 300);
        return;
      }
    }

    // Endless: a right answer adds time, a wrong one takes time away, and at 0 the round is over
    if (clock && timeLeft !== null) {
      const left = clockAfterAnswer(clock, timeLeft, isCorrect);
      setTimeLeft(left);
      if (left <= 0) {
        endingRef.current = true;
        setAnswers((prev) => [...prev, isCorrect]);
        setTimeout(() => showLoseExplosionAndFinish(true), 300);
        return;
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
      setTimeout(() => {
        setPicked(null);
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
      // Unseen statements first (the one on screen counts as seen); once all were seen, any again
      const seen = new Set(shownMythIds);
      if (currentMyth) seen.add(currentMyth.id);
      const nextMyth = nextEndless(allGameStatements, seen);
      if (!nextMyth) {
        setIsAnimating(false);
        finishGame();
        return;
      }

      // Update myths array with next myth
      setPicked(null);
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
    recordActivity("game_session", { id: "myth-buster" });

    if (userProfile) {
      updateUserProfile({
        myths_busted: (userProfile.myths_busted || 0) + bustedCount,
      });
    }
  };

  /**
   * The round is lost: the BOOM, then the results. Out of time (`timeUp`) the "time's up" sound comes first and the
   * explosion follows after it.
   */
  const showLoseExplosionAndFinish = (timeUp = false) => {
    if (timeUp) {
      void playSfx("game.time-up");
      setTimeout(() => showLoseExplosionAndFinish(false), TIME_UP_BEAT_MS);
      return;
    }
    setIsLoseExplosionVisible(true);
    void playSfx("game.explosion");

    cancelAnimation(explosionClock);
    explosionClock.value = 0;
    explosionClock.value = withTiming(EXPLOSION.total, { duration: EXPLOSION.total, easing: Easing.linear });

    setTimeout(() => {
      setIsLoseExplosionVisible(false);
      setIsAnimating(false);
      finishGame();
    }, EXPLOSION.total);
  };

  const resetGame = () => {
    resetRoundState();
    setMyths([]);
    router.back();
  };

  const confirmExit = useCallback(() => {
    Alert.alert(
      "Leave this game?",
      "Your current run and score will be lost.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => router.back(),
        },
      ],
    );
  }, [router]);

  const handleExit = useCallback(() => {
    if (gameState === "playing") {
      confirmExit();
      return;
    }
    router.back();
  }, [confirmExit, gameState, router]);

  useEffect(() => {
    if (Platform.OS !== "android" || gameState !== "playing") {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        confirmExit();
        return true;
      },
    );

    return () => subscription.remove();
  }, [confirmExit, gameState]);

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

  const totalAnswered = resultsAnsweredCount;
  const correctAnswers = answers.filter((a) => a).length;
  const wrongAnswers = totalAnswered - correctAnswers;
  const accuracy =
    totalAnswered > 0
      ? Math.round((correctAnswers / totalAnswered) * 100)
      : 0;

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



  // Statements are loading: an empty page in the page colour until the game starts
  if (gameState === "intro") {
    return <View style={[styles.fullScreen, { backgroundColor: theme.colors.background }]} />;
  }

  if (gameState === "results") {
    const answeredMyths = myths
      .slice(0, answers.length)
      .map((myth, index) => ({ ...myth, originalIndex: index }));

    // Get performance message based on accuracy
    const performance =
      accuracy >= 90 ? "Outstanding!" : accuracy >= 70 ? "Great job!" : accuracy >= 50 ? "Good effort!" : "Keep learning!";

    const filteredMyths =
      reviewTab === "wrong"
        ? answeredMyths.filter((myth) => !answers[myth.originalIndex])
        : answeredMyths;

    const stats = [
      { key: "correct", icon: "TickCircle", tone: theme.colors.success, value: correctAnswers, suffix: "", label: "Correct" },
      { key: "wrong", icon: "CloseCircle", tone: theme.colors.error, value: wrongAnswers, suffix: "", label: "Wrong" },
      { key: "accuracy", icon: "Chart", tone: selectedMode.color, value: accuracy, suffix: "%", label: "Accuracy" },
    ];
    const frame = { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: gutter } as const;

    return (
      <Animated.View entering={FadeIn.duration(200).easing(EASE_OUT)} style={[styles.fullScreen, { backgroundColor: theme.colors.mapBackground }]}>
        <SfxOnMount cue="reward.finish-jingle" />
        <ScreenHeader title="Results" subtitle={selectedMode.title} onBack={resetGame} backLabel="Back to games" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.resultsBody, frame, { paddingHorizontal: gutter + 4 }]}>
          {/* The mascot and the verdict */}
          <View style={styles.resultHero}>
            <Animated.View entering={FadeInUp.duration(260).easing(EASE_OUT)}>
              <Image
                source={accuracy >= 50 ? require("@/assets/images/mascot/happy.png") : require("@/assets/images/mascot/fix.png")}
                style={styles.resultHeroMascot}
                resizeMode="contain"
              />
            </Animated.View>
            <Stamp at={RESULT_FX.title}>
              <Text style={[styles.resultHeroTitle, { color: textColor }]}>{performance}</Text>
            </Stamp>
            <Text style={[styles.resultHeroSub, { color: mutedText }]}>
              {correctAnswers} of {totalAnswered} right
            </Text>
          </View>

          {/* The numbers arrive like the lesson finish screen's: each tile's icon and number appear big with stars while the
              number counts up, then the tile fades in around them; once all are in, a band of light sweeps across them */}
          <View style={styles.resultStatsRow}>
            {stats.map((stat, n) => (
              <React.Fragment key={stat.key}>
                <StatTile
                  tone={stat.tone}
                  label={stat.label}
                  value={`${stat.value}${stat.suffix}`}
                  countTo={stat.value}
                  format={(v) => `${v}${stat.suffix}`}
                  icon={<Icon name={stat.icon} size={26} color={stat.tone} variant="Bold" />}
                  accessibilityLabel={`${stat.value}${stat.suffix} ${stat.label.toLowerCase()}`}
                  revealAt={statStart(n)}
                  shineAt={shineStart(n, stats.length)}
                />
                <SfxOnMount cue="ui.select" volume={0.5} delay={statStart(n) + STAT_FX.gatherEnd} />
              </React.Fragment>
            ))}
          </View>

          {/* Review: every statement with the reason, as a flat list */}
          <View>
            <View style={styles.reviewHead}>
              <View style={[styles.reviewIcon, { backgroundColor: withAlpha(selectedMode.color, 0.14) }]}>
                <Icon name="Judge" size={20} color={selectedMode.color} variant="Bold" />
              </View>
              <Text style={[styles.reviewHeading, { color: textColor }]} accessibilityRole="header">
                Review
              </Text>
            </View>
            <View style={styles.reviewChips}>
              {(
                [
                  { id: "all", label: `All ${totalAnswered}`, tone: selectedMode.color },
                  { id: "wrong", label: `Missed ${wrongAnswers}`, tone: theme.colors.error },
                ] as const
              ).map((chip) => {
                const active = reviewTab === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => setReviewTab(chip.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.reviewChip,
                      { borderColor: active ? chip.tone : borderColor, backgroundColor: active ? withAlpha(chip.tone, 0.12) : theme.colors.surface },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.reviewChipText, { color: active ? textColor : mutedText }]}>{chip.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {filteredMyths.length === 0 ? (
              <Text style={[styles.reviewEmpty, { color: mutedText }]}>Nothing missed. Well done!</Text>
            ) : (
              filteredMyths.map((myth, i) => {
                const isCorrect = answers[myth.originalIndex];
                const tone = isCorrect ? theme.colors.success : theme.colors.error;
                const open = openRows.has(myth.originalIndex);
                const hasMore = Boolean(myth.explanation);
                return (
                  <Pressable
                    key={myth.originalIndex}
                    disabled={!hasMore}
                    onPress={() =>
                      setOpenRows((prev) => {
                        const next = new Set(prev);
                        if (next.has(myth.originalIndex)) next.delete(myth.originalIndex);
                        else next.add(myth.originalIndex);
                        return next;
                      })
                    }
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityHint={hasMore ? (open ? "Hides the explanation" : "Shows the full explanation") : undefined}
                    style={({ pressed }) => [
                      styles.reviewRow,
                      i > 0 && { borderTopWidth: 1, borderStyle: "dashed", borderColor },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={[styles.reviewMark, { backgroundColor: withAlpha(tone, 0.14) }]}>
                      <Icon name={isCorrect ? "TickCircle" : "CloseCircle"} size={20} color={tone} variant="Bold" />
                    </View>
                    <View style={styles.reviewCopy}>
                      <Text style={[styles.reviewText, { color: textColor }]}>{myth.statement}</Text>
                      <Text style={[styles.reviewVerdict, { color: tone }]}>
                        {myth.isTrue ? "FACT" : "MYTH"} · {isCorrect ? "Correct" : "Wrong"}
                      </Text>
                      {hasMore && open ? (
                        <Animated.View entering={FadeIn.duration(160).easing(EASE_OUT)}>
                          <MarkdownText text={myth.explanation} style={styles.reviewExplain} textColor={mutedText} />
                        </Animated.View>
                      ) : null}
                    </View>
                    {hasMore ? <Icon name={open ? "ArrowUp2" : "ArrowDown2"} size={18} color={mutedText} /> : null}
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* The buttons arrive with the last number and are never blocked while they do */}
        <Reveal at={statStart(stats.length - 1) + STAT_FX.gatherEnd} style={[styles.resultsFooter, frame, { paddingBottom: insets.bottom + 16, backgroundColor: theme.colors.mapBackground }]}>
          <Button
            label="Play again"
            onPress={() => startMode(selectedMode)}
            renderIcon={(color) => <Icon name="Refresh" size={20} color={color} variant="Bold" />}
          />
          <Button label="Back to games" variant="secondary" onPress={() => router.back()} />
        </Reveal>
      </Animated.View>
    );
  }

  // Playing state
  const barTone = clock && timeLeft !== null && timeLeft <= 5 ? theme.colors.error : selectedMode.color;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View
        entering={FadeIn.duration(200).easing(EASE_OUT)}
        style={[styles.fullScreen, { backgroundColor: theme.colors.mapBackground }, shakeStyle]}
      >
        {/* Top bar: close, the progress (in Endless the clock itself, draining), then the lives or the seconds left */}
        <View style={[styles.gameHeaderContainer, { paddingTop: insets.top + 12, paddingHorizontal: gutter, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }]}>
          <View style={styles.gameHeader}>
            <HeaderButton icon="Close" label="Exit game" onPress={handleExit} />

            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: barTone }, progressFillStyle]} />
            </View>

            {selectedMode.lives ? (
              <View style={styles.livesContainer} accessibilityLabel={`${lives} lives left`}>
                {[...Array(selectedMode.lives)].map((_, i) => (
                  <Icon key={i} name="Heart" size={22} color={i < lives ? theme.colors.error : theme.colors.border} variant="Bold" />
                ))}
              </View>
            ) : null}
            {selectedMode.clock && timeLeft !== null ? (
              <View style={styles.clockChip} accessibilityLabel={`${timeLeft} seconds left`}>
                <Animated.View style={timerIconWiggleStyle}>
                  <Icon name="Timer" size={20} color={barTone} variant="Bold" />
                </Animated.View>
                <Text style={[styles.clockText, { color: barTone }]}>{timeLeft}s</Text>
              </View>
            ) : null}
          </View>

          {/* Under it: where you are, the streak, the score */}
          <View style={styles.gameSubRow}>
            <Text style={[styles.progressText, { color: mutedText }]}>
              {selectedMode.id === "endless" ? `Statement ${currentIndex + 1}` : `${currentIndex + 1} of ${myths.length}`}
            </Text>
            {streak > 1 ? (
              <Animated.View
                entering={FadeInDown.duration(220).easing(EASE_OUT)}
                exiting={FadeOutDown.duration(150).easing(EASE_OUT)}
                style={[styles.streakPill, { backgroundColor: withAlpha(selectedMode.color, 0.14) }]}
              >
                <Icon name="Fire" size={16} color={selectedMode.color} variant="Bold" />
                <Text style={[styles.streakText, { color: selectedMode.color }]}>{streak} in a row</Text>
              </Animated.View>
            ) : null}
            <View style={{ flex: 1 }} />
            <Animated.View style={[styles.scoreContainer, scorePulseStyle]}>
              <Icon name="Flash" size={18} color={theme.colors.gold} variant="Bold" />
              <Text style={[styles.scoreText, { color: textColor }]}>{score}</Text>
            </Animated.View>
            {selectedMode.id === "endless" ? (
              <Pressable
                onPress={() => {
                  if (!isAnimating) finishGame();
                }}
                accessibilityRole="button"
                accessibilityLabel="End endless game"
                style={({ pressed }) => [styles.endGameButton, pressed && { opacity: 0.6 }]}
              >
                <Icon name="Flag" size={16} color={theme.colors.textMuted} variant="Bold" />
                <Text style={[styles.endGameButtonText, { color: theme.colors.textMuted }]}>End</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Card */}
        <View style={styles.cardContainer}>
          {/* Swipe Labels */}
          <Animated.View style={[styles.swipeLabel, styles.mythLabel, mythLabelStyle]}>
            <Icon name="CloseCircle" size={48} color={theme.colors.error} variant="Bold" />
            <Text style={[styles.swipeLabelText, { color: theme.colors.error }]}>MYTH</Text>
          </Animated.View>

          <Animated.View style={[styles.swipeLabel, styles.truthLabel, truthLabelStyle]}>
            <Icon name="TickCircle" size={48} color={theme.colors.success} variant="Bold" />
            <Text style={[styles.swipeLabelText, { color: theme.colors.success }]}>FACT</Text>
          </Animated.View>

          {/* Current card */}
          {currentMyth && (
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.card, { width: frameWidth - 2 * gutter }, animatedStyle]}>
                <View style={[styles.cardInner, { backgroundColor: theme.colors.card, borderColor }]}>
                  <View style={styles.cardHeader}>
                    <ReadAloudButton
                      ownerId={readAloudOwner}
                      subject="statement"
                      appearance="flat"
                      size={38}
                      accent={theme.colors.link}
                      text={() => buildMythSpeech(currentMyth.statement)}
                    />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={[styles.cardStatement, { color: textColor }]}>{currentMyth.statement}</Text>
                  </View>

                  <Text style={[styles.cardHint, { color: mutedText }]}>Swipe or tap</Text>
                </View>
              </Animated.View>
            </GestureDetector>
          )}
        </View>

        {/* Answers: the same buttons as the lessons. The one just pressed shows right or wrong while its card leaves. */}
        {currentMyth && (
          <View style={[styles.actionButtons, { paddingHorizontal: gutter, paddingBottom: insets.bottom + 20, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }]}>
            <OptionButton
              label="MYTH"
              icon="CloseCircle"
              iconColor={theme.colors.error}
              state={picked ? (picked.side === "myth" ? (picked.ok ? "correct" : "wrong") : "dim") : "idle"}
              disabled={isAnimating}
              onPress={() => {
                if (isAnimating || currentIndex >= myths.length) return;
                translateX.value = withSpring(-width);
                opacity.value = withTiming(0, { duration: 200, easing: EASE_OUT });
                handleSwipe("myth");
              }}
            />
            <OptionButton
              label="FACT"
              icon="TickCircle"
              iconColor={theme.colors.success}
              state={picked ? (picked.side === "truth" ? (picked.ok ? "correct" : "wrong") : "dim") : "idle"}
              disabled={isAnimating}
              onPress={() => {
                if (isAnimating || currentIndex >= myths.length) return;
                translateX.value = withSpring(width);
                opacity.value = withTiming(0, { duration: 200, easing: EASE_OUT });
                handleSwipe("truth");
              }}
            />
          </View>
        )}

        {countStep !== null && (
          <View style={[styles.countOverlay, { backgroundColor: theme.colors.mapBackground }]} accessibilityLiveRegion="assertive">
            <Text style={[styles.countHint, { color: mutedText }]}>Get ready</Text>
            <Animated.Text
              key={countStep}
              entering={reducedMotion ? undefined : ZoomIn.duration(220).easing(EASE_OUT)}
              style={[styles.countText, { color: selectedMode.color }]}
              accessibilityLabel={COUNTDOWN[countStep]!.label}
            >
              {COUNTDOWN[countStep]!.label}
            </Animated.Text>
          </View>
        )}

        {isLoseExplosionVisible && <Explosion clock={explosionClock} />}
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const makeStyles = createStyles((theme) => ({
  fullScreen: {
    flex: 1,
  },

  // Intro Screen with colored background

  // Game Screen
  gameHeaderContainer: {
    paddingBottom: 8,
    gap: 4,
  },
  gameHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gameSubRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 },
  clockChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  clockText: { fontSize: 18, ...fontFaces.black, fontVariant: ["tabular-nums"] },
  streakPill: { flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13 },
  cardHint: { fontSize: 13, ...fontFaces.semibold, textAlign: "center" },
  progressText: {
    fontSize: 14,
    ...fontFaces.bold,
    fontVariant: ["tabular-nums"],
  },
  progressBar: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "100%",
    borderRadius: 8,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scoreText: {
    fontSize: 18,
    ...fontFaces.black,
    fontVariant: ["tabular-nums"],
  },
  endGameButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  endGameButtonText: {
    fontSize: 14,
    ...fontFaces.heavy,
  },
  streakText: {
    fontSize: 18,
    ...fontFaces.heavy,
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
    borderRadius: 28,
    padding: 20,
    gap: 8,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  livesContainer: {
    flexDirection: "row",
    gap: 2,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cardStatement: {
    fontSize: 26,
    ...fontFaces.heavy,
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
    ...fontFaces.black,
  },
  actionButtons: {
    flexDirection: "row",
    paddingTop: 12,
    gap: 12,
  },
  // The countdown before an Endless round: opaque, so the first statement is not read early
  countOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 50,
  },
  countHint: { fontSize: 18, ...fontFaces.heavy, textTransform: "uppercase", letterSpacing: 1.2 },
  countText: { fontSize: 128, lineHeight: 140, ...fontFaces.black },

  // Results Screen
  // New Results Screen Styles
  // Score Card
  // Legacy hero styles
  // Legacy Results Styles


  // Review Section

  resultStatsRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  resultHero: { alignItems: "center", gap: 6 },
  resultHeroMascot: { width: 120, height: 120 },
  resultHeroTitle: { fontSize: 30, lineHeight: 38, ...fontFaces.black },
  resultHeroSub: { fontSize: 16, ...fontFaces.semibold },
  resultsBody: { paddingTop: 16, paddingBottom: 24, gap: 24 },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40, marginBottom: 4 },
  reviewIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reviewHeading: { flex: 1, fontSize: 20, ...fontFaces.heavy },
  reviewChips: { flexDirection: "row", gap: 6, marginBottom: 6 },
  reviewChip: { height: 34, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  reviewChipText: { fontSize: 13, ...fontFaces.bold },
  reviewEmpty: { fontSize: 15, ...fontFaces.medium, paddingVertical: 12 },
  reviewRow: { flexDirection: "row", gap: 12, paddingVertical: 14, alignItems: "flex-start" },
  reviewMark: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reviewCopy: { flex: 1, gap: 4 },
  reviewText: { fontSize: 16, lineHeight: 22, ...fontFaces.heavy },
  reviewVerdict: { fontSize: 12, ...fontFaces.heavy, letterSpacing: 0.4 },
  reviewExplain: { fontSize: 14, lineHeight: 20 },
  resultsFooter: { gap: 10, paddingTop: 12 },
}));