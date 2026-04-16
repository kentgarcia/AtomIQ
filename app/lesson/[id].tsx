import { Icon } from "@/components/ui/icon";
import { getLessonById } from "@/content/lessons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStorage } from "@/services/StorageContext";
import {
    getLevelProgress,
    logDailyActivity,
    unlockNextLevel,
    updateLevelProgress,
} from "@/services/database";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Dimensions,
    Image,
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

const { width, height } = Dimensions.get("window");

// Theme
const LightTHEME = {
  bg: "#F7F7F7",
  card: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#6B7280",
  primary: "#EA580C",
  primaryDark: "#C2410C",
  primaryLight: "#FB923C",
  success: "#2ECC71",
  error: "#EF4444",
  gold: "#FFC107",
  border: "#E5E7EB",
};

const DarkTHEME = {
  bg: "#172B4D",
  card: "#213356",
  text: "#F6F9FC",
  textMuted: "#8898AA",
  primary: "#EA580C",
  primaryDark: "#C2410C",
  primaryLight: "#FB923C",
  success: "#2ECC71",
  error: "#EF4444",
  gold: "#FFC107",
  border: "#2D3A56",
};

// --- Components for Each Step ---

// 1. Briefing View
const BriefingView = ({
  data,
  onComplete,
  theme,
}: {
  data: any;
  onComplete: () => void;
  theme: typeof LightTHEME;
}) => {
  const scale = useSharedValue(1);
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);
    const timer = setTimeout(onComplete, 3000); // Auto advance after 3s
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View
        entering={FadeInDown.springify()}
        style={[styles.mascotLarge, animatedStyle]}
      >
        <Image
          source={require("@/assets/images/mascot/explain.png")}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.briefingTitle}>Topic: {data.topic}</Text>
      <Text style={styles.briefingSubtitle}>{data.mission}</Text>
      <View style={styles.loadingBar}>
        <Animated.View
          style={[
            styles.loadingFill,
            { width: withTiming("100%", { duration: 3000 }) },
          ]}
        />
      </View>
    </View>
  );
};

// 2. MythBuster View (Creative Flashcard with Read Aloud)
const MythBusterView = ({
  data,
  onComplete,
  theme,
}: {
  data: any;
  onComplete: () => void;
  theme: typeof LightTHEME;
}) => {
  const translateX = useSharedValue(0);
  const cardRotate = useSharedValue(0);
  const [showFeedback, setShowFeedback] = useState<
    null | "correct" | "incorrect"
  >(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const mythStyles = useMemo(() => createMythStyles(theme), [theme]);
  const [leftIndicator, setLeftIndicator] = useState(0);
  const [rightIndicator, setRightIndicator] = useState(0);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speakMyth = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(data.myth, {
        language: "en",
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (showFeedback) return;
      translateX.value = event.translationX;
      cardRotate.value = interpolate(
        event.translationX,
        [-width, width],
        [-5, 5],
      ); // Very subtle rotation

      runOnJS(setLeftIndicator)(
        Math.max(0, Math.min(1, -event.translationX / 100)),
      );
      runOnJS(setRightIndicator)(
        Math.max(0, Math.min(1, event.translationX / 100)),
      );
    })
    .onEnd((event) => {
      if (showFeedback) return;
      runOnJS(setLeftIndicator)(0);
      runOnJS(setRightIndicator)(0);

      if (Math.abs(event.translationX) > 120) {
        const isLeft = event.translationX < 0;
        translateX.value = withTiming(isLeft ? -width * 1.5 : width * 1.5, {
          duration: 200,
        });
        runOnJS(Speech.stop)();
        runOnJS(setIsSpeaking)(false);
        runOnJS(setShowFeedback)(isLeft ? "correct" : "incorrect");
      } else {
        translateX.value = withSpring(0, { damping: 20 });
        cardRotate.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${cardRotate.value}deg` },
    ],
  }));

  return (
    <View style={styles.stepContainer}>
      {/* Full Height Swipe Indicators */}
      <View style={mythStyles.fullHeightIndicators}>
        <Animated.View
          style={[mythStyles.indicatorLeftFull, { opacity: leftIndicator }]}
        >
          <LinearGradient
            colors={[
              "rgba(239,68,68,0.5)",
              "rgba(239,68,68,0.2)",
              "transparent",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={mythStyles.indicatorContent}>
            <Icon name="Forbidden2" size={48} color={theme.error} />
            <Text style={mythStyles.indicatorTextLeft}>MYTH</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[mythStyles.indicatorRightFull, { opacity: rightIndicator }]}
        >
          <LinearGradient
            colors={[
              "transparent",
              "rgba(46,204,113,0.2)",
              "rgba(46,204,113,0.5)",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={mythStyles.indicatorContent}>
            <Icon
              name="TickCircle"
              size={48}
              color={theme.success}
              variant="Bold"
            />
            <Text style={mythStyles.indicatorTextRight}>FACT</Text>
          </View>
        </Animated.View>
      </View>

      <Text style={styles.stepHeader}>MYTH BUSTER</Text>
      <Text style={styles.stepSubHeader}>
        Swipe LEFT for Myth, RIGHT for Fact
      </Text>

      <View style={styles.cardContainer}>
        {showFeedback ? (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              mythStyles.resultCard,
              showFeedback === "correct"
                ? mythStyles.resultCorrect
                : mythStyles.resultIncorrect,
            ]}
          >
            {/* Speaker Button - Top Right */}
            <TouchableOpacity
              style={mythStyles.speakerBtn}
              onPress={() =>
                Speech.speak(
                  `${data.explanation}. The reality is: ${data.reality}`,
                  { language: "en", rate: 0.9 },
                )
              }
            >
              <Icon
                name="VolumeHigh"
                size={22}
                color={showFeedback === "correct" ? theme.success : theme.error}
              />
            </TouchableOpacity>

            {/* Result Icon */}
            <View
              style={[
                mythStyles.resultIconCircle,
                {
                  backgroundColor:
                    showFeedback === "correct" ? theme.success : theme.error,
                },
              ]}
            >
              <Icon
                name={showFeedback === "correct" ? "TickCircle" : "CloseCircle"}
                size={36}
                color="#FFF"
                variant="Bold"
              />
            </View>

            <Text style={mythStyles.resultTitle}>
              {showFeedback === "correct" ? "Correct!" : "Oops!"}
            </Text>

            {/* Explanation */}
            <Text style={mythStyles.resultExplanation}>{data.explanation}</Text>

            {/* Reality Box */}
            <View style={mythStyles.realityBox}>
              <Text style={mythStyles.realityLabel}>THE REALITY</Text>
              <Text style={mythStyles.realityText}>{data.reality}</Text>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                mythStyles.resultContinueBtn,
                {
                  backgroundColor:
                    showFeedback === "correct" ? theme.success : theme.error,
                  borderBottomColor:
                    showFeedback === "correct" ? "#1F9D55" : "#C53030",
                },
              ]}
              onPress={onComplete}
            >
              <Text style={mythStyles.resultContinueBtnText}>CONTINUE</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.swipeCard, cardStyle]}>
              <View style={styles.mythBadge}>
                <Icon name="Danger" size={24} color="#FFF" />
                <Text style={styles.mythBadgeText}>MYTH?</Text>
              </View>
              <Text style={styles.mythText}>"{data.myth}"</Text>

              {/* Read Aloud Button */}
              <TouchableOpacity
                style={[
                  mythStyles.speakBtn,
                  isSpeaking && mythStyles.speakBtnActive,
                ]}
                onPress={speakMyth}
              >
                <Icon
                  name={isSpeaking ? "VolumeSlash" : "VolumeHigh"}
                  size={24}
                  color={isSpeaking ? "#FFF" : theme.primary}
                />
                <Text
                  style={[
                    mythStyles.speakBtnText,
                    isSpeaking && { color: "#FFF" },
                  ]}
                >
                  {isSpeaking ? "Stop" : "Read Aloud"}
                </Text>
              </TouchableOpacity>

              <View style={styles.swipeInstructions}>
                <View style={styles.swipeLeft}>
                  <Icon
                    name="ArrowLeft2"
                    size={24}
                    color={theme.error}
                    variant="Bold"
                  />
                  <Text
                    style={{
                      color: theme.error,
                      fontWeight: "800",
                      fontSize: 14,
                    }}
                  >
                    MYTH
                  </Text>
                </View>
                <View style={styles.swipeRight}>
                  <Text
                    style={{
                      color: theme.success,
                      fontWeight: "800",
                      fontSize: 14,
                    }}
                  >
                    FACT
                  </Text>
                  <Icon
                    name="ArrowRight2"
                    size={24}
                    color={theme.success}
                    variant="Bold"
                  />
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
};

// 3. MicroLearn View - Duolingo Style
const MicroLearnView = ({
  data,
  onComplete,
  theme,
}: {
  data: any;
  onComplete: () => void;
  theme: typeof LightTHEME;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const learnStyles = useMemo(() => createLearnStyles(theme), [theme]);

  // Simplified slides: intro, main content, all key points together, summary
  const slides = [
    { type: "intro", title: data.title },
    { type: "content", content: data.content },
    ...(data.keyPoints && data.keyPoints.length > 0
      ? [{ type: "keypoints", points: data.keyPoints }]
      : []),
    { type: "summary", title: data.title, content: data.content },
  ];

  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;
  const currentContent = slides[currentSlide];

  const speakContent = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      let text = "";
      if (currentContent.type === "intro") text = data.title;
      else if (currentContent.type === "content") text = currentContent.content;
      else if (currentContent.type === "keypoints")
        text = currentContent.points.join(". ");
      else if (currentContent.type === "summary")
        text = `Summary: ${data.title}. ${data.content}`;

      setIsSpeaking(true);
      Speech.speak(text, {
        language: "en",
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  const handleNext = () => {
    Speech.stop();
    setIsSpeaking(false);
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    Speech.stop();
    setIsSpeaking(false);
    if (!isFirstSlide) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <View style={styles.stepContainer}>
      {/* Progress Dots */}
      <View style={learnStyles.progressDots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              learnStyles.dot,
              i === currentSlide && learnStyles.dotActive,
              i < currentSlide && learnStyles.dotCompleted,
            ]}
          />
        ))}
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* Content Card */}
        <Animated.View
          key={currentSlide}
          entering={FadeInDown.duration(300)}
          style={learnStyles.slideCard}
        >
          {/* Speaker Button */}
          <TouchableOpacity
            style={learnStyles.speakerBtn}
            onPress={speakContent}
          >
            <Icon
              name={isSpeaking ? "VolumeSlash" : "VolumeHigh"}
              size={22}
              color={isSpeaking ? "#FFF" : theme.primary}
            />
          </TouchableOpacity>

          {currentContent.type === "intro" && (
            <>
              <View style={learnStyles.badgeRow}>
                <View style={learnStyles.learnBadge}>
                  <Icon name="Book" size={18} color="#FFF" variant="Bold" />
                  <Text style={learnStyles.badgeText}>LEARN</Text>
                </View>
              </View>
              <Image
                source={require("@/assets/images/mascot/idea.png")}
                style={learnStyles.mascotImg}
                resizeMode="contain"
              />
              <Text style={learnStyles.titleText}>{data.title}</Text>
              <Text style={learnStyles.subtitleText}>
                Let's learn something new!
              </Text>
            </>
          )}

          {currentContent.type === "content" && (
            <>
              <Image
                source={require("@/assets/images/mascot/explain.png")}
                style={learnStyles.mascotSmall}
                resizeMode="contain"
              />
              <Text style={learnStyles.contentText}>
                {currentContent.content}
              </Text>
            </>
          )}

          {currentContent.type === "keypoints" && (
            <ScrollView
              style={{ width: "100%" }}
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={learnStyles.keypointsHeader}>
                <Icon
                  name="TickCircle"
                  size={24}
                  color={theme.success}
                  variant="Bold"
                />
                <Text style={learnStyles.keypointsTitle}>KEY POINTS</Text>
              </View>
              {currentContent.points.map((point: string, i: number) => (
                <View key={i} style={learnStyles.keypointItem}>
                  <View style={learnStyles.keypointBullet}>
                    <Text style={learnStyles.keypointNumber}>{i + 1}</Text>
                  </View>
                  <Text style={learnStyles.keypointItemText}>{point}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {currentContent.type === "summary" && (
            <>
              <View style={learnStyles.summaryBadge}>
                <Icon
                  name="DocumentText"
                  size={20}
                  color="#FFF"
                  variant="Bold"
                />
              </View>
              <Text style={learnStyles.summaryLabel}>SUMMARY</Text>
              <Text style={learnStyles.summaryTitle}>{data.title}</Text>
              <View style={learnStyles.summaryDivider} />
              <Text style={learnStyles.summaryText}>{data.content}</Text>
              <Image
                source={require("@/assets/images/mascot/happy.png")}
                style={learnStyles.summaryMascot}
                resizeMode="contain"
              />
            </>
          )}
        </Animated.View>
      </View>

      {/* Navigation Buttons */}
      <View style={learnStyles.navRow}>
        {!isFirstSlide && (
          <TouchableOpacity style={learnStyles.backBtn} onPress={handleBack}>
            <Icon
              name="ArrowLeft2"
              size={20}
              color={theme.text}
              variant="Bold"
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            learnStyles.continueBtn,
            isLastSlide && {
              backgroundColor: theme.success,
              borderColor: "#1F9D55",
            },
          ]}
          onPress={handleNext}
        >
          <Text style={learnStyles.continueBtnText}>
            {isLastSlide ? "GOT IT!" : "CONTINUE"}
          </Text>
          <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 4. Lab View (Mini Sim) - Duolingo Style
const LabView = ({
  data,
  onComplete,
  onBack,
  theme,
}: {
  data: any;
  onComplete: () => void;
  onBack?: () => void;
  theme: typeof LightTHEME;
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const labStyles = useMemo(() => createLabStyles(theme), [theme]);

  const handleSelect = (optionId: string) => {
    if (showFeedback) return;
    setSelectedOption(optionId);
  };

  const handleCheck = () => {
    if (!selectedOption) return;
    setShowFeedback(true);
    // Auto-scroll to feedback after a short delay
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const isCorrect = selectedOption === data.correctAnswer;

  const speakTask = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(data.task, {
        language: "en",
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  return (
    <View style={styles.stepContainer}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={labStyles.headerCard}
        >
          <View style={labStyles.badgeRow}>
            <View style={labStyles.labBadge}>
              <Icon name="Microscope" size={18} color="#FFF" variant="Bold" />
              <Text style={labStyles.badgeText}>LAB</Text>
            </View>
            <TouchableOpacity style={labStyles.speakerBtn} onPress={speakTask}>
              <Icon
                name={isSpeaking ? "VolumeSlash" : "VolumeHigh"}
                size={20}
                color={isSpeaking ? "#FFF" : "#8B5CF6"}
              />
            </TouchableOpacity>
          </View>

          <Image
            source={require("@/assets/images/mascot/experiment.png")}
            style={labStyles.mascot}
            resizeMode="contain"
          />

          <Text style={labStyles.taskText}>{data.task}</Text>
        </Animated.View>

        {/* Options Grid */}
        <View style={labStyles.optionsGrid}>
          {data.options.map((option: any, index: number) => {
            const isSelected = selectedOption === option.id;
            const showCorrectMark =
              showFeedback && option.id === data.correctAnswer;
            const showWrongMark = showFeedback && isSelected && !isCorrect;

            return (
              <Animated.View
                key={option.id}
                entering={FadeInDown.delay(100 + index * 80)}
                style={labStyles.optionWrapper}
              >
                <TouchableOpacity
                  style={[
                    labStyles.optionCard,
                    isSelected && !showFeedback && labStyles.optionSelected,
                    showCorrectMark && labStyles.optionCorrect,
                    showWrongMark && labStyles.optionWrong,
                  ]}
                  onPress={() => handleSelect(option.id)}
                  disabled={showFeedback}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      labStyles.optionIconCircle,
                      isSelected &&
                        !showFeedback && {
                          backgroundColor: theme.primary + "20",
                        },
                      showCorrectMark && {
                        backgroundColor: theme.success + "20",
                      },
                      showWrongMark && { backgroundColor: theme.error + "20" },
                    ]}
                  >
                    <Icon
                      name={option.icon as any}
                      size={28}
                      color={
                        showCorrectMark
                          ? theme.success
                          : showWrongMark
                            ? theme.error
                            : isSelected
                              ? theme.primary
                              : theme.textMuted
                      }
                      variant="Bold"
                    />
                  </View>
                  <Text
                    style={[
                      labStyles.optionLabel,
                      isSelected &&
                        !showFeedback && {
                          color: theme.primary,
                          fontWeight: "700",
                        },
                      showCorrectMark && {
                        color: theme.success,
                        fontWeight: "700",
                      },
                      showWrongMark && {
                        color: theme.error,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>

                  {/* Selection/Result indicator */}
                  {(isSelected || showCorrectMark) && (
                    <View
                      style={[
                        labStyles.checkCircle,
                        showCorrectMark && {
                          backgroundColor: theme.success,
                          borderColor: theme.success,
                        },
                        showWrongMark && {
                          backgroundColor: theme.error,
                          borderColor: theme.error,
                        },
                        isSelected &&
                          !showFeedback && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                      ]}
                    >
                      <Icon
                        name={showWrongMark ? "CloseCircle" : "TickCircle"}
                        size={16}
                        color="#FFF"
                        variant="Bold"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Feedback Card */}
        {showFeedback && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              labStyles.feedbackCard,
              isCorrect ? labStyles.feedbackCorrect : labStyles.feedbackWrong,
            ]}
          >
            <View style={labStyles.feedbackHeader}>
              <Icon
                name={isCorrect ? "TickCircle" : "CloseCircle"}
                size={24}
                color={isCorrect ? theme.success : theme.error}
                variant="Bold"
              />
              <Text
                style={[
                  labStyles.feedbackTitle,
                  { color: isCorrect ? theme.success : theme.error },
                ]}
              >
                {isCorrect ? "Excellent!" : "Not quite!"}
              </Text>
            </View>
            <Text style={labStyles.feedbackText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={labStyles.navRow}>
        {onBack && !showFeedback && (
          <TouchableOpacity style={labStyles.backBtn} onPress={onBack}>
            <Icon
              name="ArrowLeft2"
              size={20}
              color={theme.text}
              variant="Bold"
            />
          </TouchableOpacity>
        )}

        {!showFeedback ? (
          <TouchableOpacity
            style={[
              labStyles.checkBtn,
              !selectedOption && labStyles.checkBtnDisabled,
              !onBack && { flex: 1 },
            ]}
            onPress={handleCheck}
            disabled={!selectedOption}
          >
            <Text style={labStyles.checkBtnText}>CHECK</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              labStyles.continueBtn,
              isCorrect && {
                backgroundColor: theme.success,
                borderColor: "#1F9D55",
              },
            ]}
            onPress={onComplete}
          >
            <Text style={labStyles.continueBtnText}>CONTINUE</Text>
            <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// 5. Assessment (Quiz) - Duolingo Style
const AssessmentView = ({
  data,
  onComplete,
  theme,
}: {
  data: any;
  onComplete: () => void;
  theme: typeof LightTHEME;
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const quizStyles = useMemo(() => createQuizStyles(theme), [theme]);
  const correctIndex = data.correctIndex;
  const isCorrect = selected === correctIndex;

  const speakQuestion = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(data.question, {
        language: "en",
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  const handleCheck = () => {
    if (selected === null) return;
    setConfirmed(true);
    // Auto-scroll to feedback after a short delay
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View style={styles.stepContainer}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Card */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={quizStyles.questionCard}
        >
          <View style={quizStyles.questionHeader}>
            <View style={quizStyles.quizBadge}>
              <Icon name="Cup" size={18} color="#FFF" variant="Bold" />
              <Text style={quizStyles.badgeText}>QUIZ</Text>
            </View>
            <TouchableOpacity
              style={quizStyles.speakerBtn}
              onPress={speakQuestion}
            >
              <Icon
                name={isSpeaking ? "VolumeSlash" : "VolumeHigh"}
                size={20}
                color={isSpeaking ? "#FFF" : theme.gold}
              />
            </TouchableOpacity>
          </View>

          <Text style={quizStyles.questionText}>{data.question}</Text>
        </Animated.View>

        {/* Options */}
        <View style={quizStyles.optionsContainer}>
          {data.options.map((opt: string, index: number) => {
            const isSelected = selected === index;
            const showCorrectMark = confirmed && index === correctIndex;
            const showWrongMark = confirmed && isSelected && !isCorrect;
            const optionLetter = String.fromCharCode(65 + index);

            return (
              <Animated.View
                key={opt}
                entering={FadeInDown.delay(100 + index * 80)}
              >
                <TouchableOpacity
                  style={[
                    quizStyles.optionCard,
                    isSelected && !confirmed && quizStyles.optionSelected,
                    showCorrectMark && quizStyles.optionCorrect,
                    showWrongMark && quizStyles.optionWrong,
                  ]}
                  onPress={() => !confirmed && setSelected(index)}
                  activeOpacity={0.8}
                  disabled={confirmed}
                >
                  <View
                    style={[
                      quizStyles.optionLetter,
                      isSelected &&
                        !confirmed &&
                        quizStyles.optionLetterSelected,
                      showCorrectMark && quizStyles.optionLetterCorrect,
                      showWrongMark && quizStyles.optionLetterWrong,
                    ]}
                  >
                    <Text
                      style={[
                        quizStyles.optionLetterText,
                        (isSelected || showCorrectMark || showWrongMark) && {
                          color: "#FFF",
                        },
                      ]}
                    >
                      {optionLetter}
                    </Text>
                  </View>

                  <Text
                    style={[
                      quizStyles.optionText,
                      isSelected &&
                        !confirmed && {
                          color: theme.primary,
                          fontWeight: "700",
                        },
                      showCorrectMark && {
                        color: theme.success,
                        fontWeight: "700",
                      },
                      showWrongMark && {
                        color: theme.error,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {opt}
                  </Text>

                  {showCorrectMark && (
                    <Icon
                      name="TickCircle"
                      size={24}
                      color={theme.success}
                      variant="Bold"
                    />
                  )}
                  {showWrongMark && (
                    <Icon
                      name="CloseCircle"
                      size={24}
                      color={theme.error}
                      variant="Bold"
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Feedback */}
        {confirmed && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              quizStyles.feedbackCard,
              isCorrect ? quizStyles.feedbackCorrect : quizStyles.feedbackWrong,
            ]}
          >
            <View style={quizStyles.feedbackHeader}>
              <Icon
                name={isCorrect ? "TickCircle" : "CloseCircle"}
                size={24}
                color={isCorrect ? theme.success : theme.error}
                variant="Bold"
              />
              <Text
                style={[
                  quizStyles.feedbackTitle,
                  { color: isCorrect ? theme.success : theme.error },
                ]}
              >
                {isCorrect ? "Correct!" : "Not quite!"}
              </Text>
            </View>
            <Text style={quizStyles.feedbackText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={{ paddingTop: 16 }}>
        {!confirmed ? (
          <TouchableOpacity
            style={[
              quizStyles.checkBtn,
              selected === null && quizStyles.checkBtnDisabled,
            ]}
            onPress={handleCheck}
            disabled={selected === null}
          >
            <Text style={quizStyles.checkBtnText}>CHECK</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              quizStyles.continueBtn,
              isCorrect && {
                backgroundColor: theme.success,
                borderColor: "#1F9D55",
              },
            ]}
            onPress={onComplete}
          >
            <Text style={quizStyles.continueBtnText}>CONTINUE</Text>
            <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// 6. Debrief (Success)
const DebriefView = ({
  data,
  levelId,
  isReplay = false,
  theme,
}: {
  data: any;
  levelId: string;
  isReplay?: boolean;
  theme: typeof LightTHEME;
}) => {
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { addXP, updateUserProfile, userProfile } = useStorage();
  const [saved, setSaved] = useState(false);
  const [rewardsAwarded, setRewardsAwarded] = useState(false);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Celebration animation
    scale.value = withSpring(1, { damping: 8 });
    rotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1, false);

    // Save progress when reaching this screen
    const saveProgress = async () => {
      if (saved) return;

      try {
        // Check if lesson is already completed
        const existingProgress = (await getLevelProgress(levelId)) as {
          status?: string;
          completed_at?: string;
        } | null;
        const isAlreadyCompleted = existingProgress?.status === "completed";

        const xpEarned = data.rewards?.xp || 50;
        const stars = data.rewards?.stars || 3;

        // Update level progress (always update to mark as completed)
        await updateLevelProgress(levelId, {
          status: "completed",
          xp_earned: xpEarned,
          stars: stars,
          completed_at:
            existingProgress?.completed_at || new Date().toISOString(),
        });

        // Unlock next lesson/unit when completing for the first time
        if (!isAlreadyCompleted) {
          await unlockNextLevel(levelId);
        }

        // Only award rewards if this is the first completion (not a replay)
        if (!isAlreadyCompleted && !isReplay) {
          // Add XP to user
          await addXP(xpEarned);

          // Increment lessons completed
          if (userProfile) {
            await updateUserProfile({
              lessons_completed: userProfile.lessons_completed + 1,
            });
          }

          // Log daily activity
          const today = new Date().toISOString().split("T")[0];
          await logDailyActivity(today, {
            xp_earned: xpEarned,
            lessons_completed: 1,
            time_spent_minutes: 5,
          });

          setRewardsAwarded(true);
          console.log("Lesson completed for the first time! Rewards awarded.");
        } else {
          console.log("Lesson replay. No rewards awarded.");
        }

        setSaved(true);
      } catch (error) {
        console.error("Error saving lesson progress:", error);
      }
    };

    saveProgress();
  }, [saved, levelId, addXP, updateUserProfile, userProfile]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const xpReward = data.rewards?.xp || 50;
  const starsReward = data.rewards?.stars || 3;

  // Different titles/messages for replay vs first completion
  const title = isReplay
    ? "Practice Complete!"
    : data.title || "Mission Complete!";
  const message = isReplay
    ? "Great review! You've already mastered this lesson."
    : data.message || "Great job! You've completed this lesson.";

  return (
    <View style={styles.fullScreenCenter}>
      {/* Decorative rotating rings */}
      <Animated.View style={[styles.decorativeRing, rotationStyle]} />

      <Animated.View
        entering={FadeInDown.springify()}
        style={[styles.mascotLarge, animatedStyle]}
      >
        <Image
          source={require("@/assets/images/mascot/happy.png")}
          style={styles.mascotImageSuccess}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)}>
        <Text style={styles.successTitle}>{title}</Text>
        <Text style={styles.successText}>{message}</Text>
      </Animated.View>

      {/* Show rewards only if not a replay */}
      {rewardsAwarded ? (
        <Animated.View
          entering={FadeInDown.delay(400)}
          style={styles.rewardRow}
        >
          <View style={styles.rewardPill}>
            <LinearGradient
              colors={[theme.primary, theme.primaryLight]}
              style={styles.rewardIconWrapper}
            >
              <Icon name="Flash" size={20} color="#FFF" variant="Bold" />
            </LinearGradient>
            <View>
              <Text style={styles.rewardLabel}>XP Earned</Text>
              <Text style={styles.rewardText}>+{xpReward}</Text>
            </View>
          </View>
          <View style={styles.rewardPill}>
            <LinearGradient
              colors={[theme.gold, "#FFA000"]}
              style={styles.rewardIconWrapper}
            >
              <Icon name="Star1" size={20} color="#FFF" variant="Bold" />
            </LinearGradient>
            <View>
              <Text style={styles.rewardLabel}>Stars</Text>
              <Text style={styles.rewardText}>{starsReward}</Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInDown.delay(400)}
          style={styles.rewardRow}
        >
          <View style={[styles.rewardPill, { opacity: 0.6 }]}>
            <View
              style={[
                styles.rewardIconWrapper,
                { backgroundColor: theme.textMuted },
              ]}
            >
              <Icon name="TickCircle" size={20} color="#FFF" variant="Bold" />
            </View>
            <View>
              <Text style={styles.rewardLabel}>Already Earned</Text>
              <Text style={[styles.rewardText, { color: theme.textMuted }]}>
                {xpReward} XP
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(600)} style={{ width: "100%" }}>
        <TouchableOpacity
          style={[
            styles.mainBtn,
            { backgroundColor: theme.success, borderColor: "#25A25A" },
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.mainBtnText}>CONTINUE</Text>
          <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const [step, setStep] = useState(0);
  const [isReplay, setIsReplay] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const THEME = colorScheme === "dark" ? DarkTHEME : LightTHEME;
  const styles = useMemo(() => createStyles(THEME), [THEME]);
  const levelId = typeof id === "string" ? id : "radiation-shielding";

  // Load lesson from content system
  const lesson = getLessonById(levelId);

  // Check if this is a replay and only mark in_progress for new lessons
  useEffect(() => {
    const checkAndMarkProgress = async () => {
      try {
        const existingProgress = (await getLevelProgress(levelId)) as {
          status?: string;
        } | null;
        const isAlreadyCompleted = existingProgress?.status === "completed";

        setIsReplay(isAlreadyCompleted);

        // Only mark as in_progress if not already completed
        if (!isAlreadyCompleted) {
          await updateLevelProgress(levelId, {
            status: "in_progress",
          });
        }
      } catch (error) {
        console.error("Error checking/marking level progress:", error);
      }
    };

    checkAndMarkProgress();
  }, [levelId]);

  // If lesson not found, show error
  if (!lesson) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: THEME.bg,
        }}
      >
        <Icon name="Danger" size={64} color={THEME.error} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: THEME.text,
            marginTop: 16,
          }}
        >
          Lesson not found
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 24,
            backgroundColor: THEME.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: "#FFF", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simple step manager
  const nextStep = () => setStep((s) => s + 1);

  // Get current step from lesson
  const currentStep = lesson.steps[step];

  if (!currentStep) {
    // All steps completed, go back
    router.back();
    return null;
  }

  const renderStep = () => {
    switch (currentStep.type) {
      case "briefing":
        return (
          <BriefingView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
      case "myth_buster":
        return (
          <MythBusterView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
      case "micro_learn":
        return (
          <MicroLearnView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
      case "lab":
        return (
          <LabView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
            theme={THEME}
          />
        );
      case "assessment":
        return (
          <AssessmentView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
      case "debrief":
        return (
          <DebriefView
            key={step}
            data={currentStep.data}
            levelId={levelId}
            isReplay={isReplay}
            theme={THEME}
          />
        );
      default:
        return (
          <BriefingView
            key={step}
            data={currentStep.data}
            onComplete={nextStep}
            theme={THEME}
          />
        );
    }
  };

  const totalSteps = lesson.steps.length;
  const isFirstStep = step === 0;
  const isLastStep = step === totalSteps - 1;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Progress Header - Show for all steps except first (briefing) and last (debrief) */}
          {!isFirstStep && !isLastStep && (
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ padding: 8 }}
              >
                <Icon name="Close" size={24} color={THEME.textMuted} />
              </TouchableOpacity>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: `${((step + 1) / totalSteps) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          <View style={{ flex: 1 }}>{renderStep()}</View>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const createStyles = (theme: typeof LightTHEME) =>
  StyleSheet.create({
    // Layout
    stepContainer: {
      flex: 1,
      padding: 24,
      justifyContent: "center",
      backgroundColor: theme.bg,
    },
    fullScreenCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: theme.bg,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      height: 50,
      backgroundColor: theme.bg,
    },
    progressBarBg: {
      flex: 1,
      height: 12,
      backgroundColor: theme.border,
      borderRadius: 6,
      marginLeft: 16,
      marginRight: 8,
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: theme.primary,
      borderRadius: 6,
    },

    // Briefing
    mascotLarge: {
      marginBottom: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    mascotImage: {
      width: 200,
      height: 200,
    },
    mascotImageSuccess: {
      width: 220,
      height: 220,
    },
    briefingTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 8,
      textAlign: "center",
    },
    briefingSubtitle: {
      fontSize: 18,
      color: theme.textMuted,
      marginBottom: 48,
      textAlign: "center",
    },
    loadingBar: {
      width: "80%",
      height: 6,
      backgroundColor: theme.border,
      borderRadius: 3,
      overflow: "hidden",
    },
    loadingFill: {
      height: "100%",
      backgroundColor: theme.primary,
    },

    // Headers
    stepHeader: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.textMuted,
      textTransform: "uppercase",
      marginBottom: 8,
      letterSpacing: 1,
      textAlign: "center",
    },
    stepSubHeader: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: 32,
    },

    // Buttons
    mainBtn: {
      backgroundColor: theme.primary,
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderBottomWidth: 4,
      borderColor: theme.primaryDark,
      width: "100%",
      marginTop: "auto",
      flexDirection: "row",
      gap: 8,
    },
    mainBtnDisabled: {
      backgroundColor: theme.textMuted,
      borderColor: "#6B7280",
    },
    mainBtnText: {
      color: "#FFF",
      fontWeight: "800",
      fontSize: 16,
      letterSpacing: 1,
    },

    // MythBuster
    cardContainer: {
      alignItems: "center",
      justifyContent: "center",
      height: 400,
    },
    swipeCard: {
      width: width - 48,
      height: 350,
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 24,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 6,
      alignItems: "center",
      justifyContent: "center",
      elevation: 5,
    },
    mythBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 24,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    mythBadgeText: {
      color: "#FFF",
      fontWeight: "800",
      fontSize: 12,
    },
    mythText: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: 40,
    },
    swipeInstructions: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    swipeLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
    swipeRight: { flexDirection: "row", alignItems: "center", gap: 4 },
    feedbackCard: {
      width: width - 48,
      height: 350,
      backgroundColor: theme.primary,
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    feedbackCorrect: { backgroundColor: theme.success },
    feedbackIncorrect: { backgroundColor: theme.error },
    feedbackTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: "#FFF",
      marginBottom: 12,
    },
    feedbackText: {
      fontSize: 18,
      color: "#FFF",
      textAlign: "center",
      lineHeight: 26,
    },
    continueBtn: {
      backgroundColor: "#FFF",
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 16,
      borderBottomWidth: 4,
      borderColor: "rgba(0,0,0,0.1)",
    },
    continueBtnText: { fontWeight: "800", fontSize: 16 },
    overlayIndicator: {
      position: "absolute",
      top: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 3,
      borderColor: "#FFF",
    },
    overlayText: {
      color: "#FFF",
      fontWeight: "800",
      fontSize: 18,
      letterSpacing: 2,
    },

    // MicroLearn
    conceptBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderBottomWidth: 3,
      borderColor: theme.primaryDark,
    },
    conceptBadgeText: {
      color: "#FFF",
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 1,
    },
    conceptCard: {
      backgroundColor: "#FFF",
      borderRadius: 20,
      padding: 24,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      marginBottom: 24,
    },
    conceptImageContainer: {
      height: 150,
      marginBottom: 20,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    conceptMascot: {
      width: 120,
      height: 120,
    },
    labMascot: {
      width: 56,
      height: 56,
    },
    conceptTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 12,
      lineHeight: 30,
    },
    conceptText: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 26,
      marginBottom: 8,
    },
    keyPointsWrapper: {
      marginTop: 20,
      gap: 12,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    keyPointRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    keyPointDot: {
      marginTop: 2,
    },
    keyPointText: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      lineHeight: 22,
      fontWeight: "500",
    },

    // Lab
    labCard: {
      backgroundColor: "#FFF",
      borderRadius: 20,
      padding: 24,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      marginBottom: 24,
    },
    labIconWrapper: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#8B5CF6" + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    taskBox: {
      marginTop: 16,
      padding: 16,
      backgroundColor: "#F3F4F6",
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#8B5CF6",
    },
    taskLabel: {
      fontSize: 11,
      fontWeight: "800",
      color: "#8B5CF6",
      letterSpacing: 1,
      marginBottom: 6,
    },
    taskText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      lineHeight: 22,
    },
    optionsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      gap: 12,
      marginBottom: 24,
    },
    optionBtn: {
      backgroundColor: "#FFF",
      padding: 16,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      minHeight: 100,
    },
    optionBtnActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "10",
      transform: [{ scale: 1.05 }],
    },
    optionText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.text,
    },
    correctBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: theme.success,
      borderRadius: 12,
      padding: 4,
    },
    wrongBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: theme.error,
      borderRadius: 12,
      padding: 4,
    },
    feedbackBox: {
      padding: 20,
      borderRadius: 16,
      borderWidth: 2,
      marginBottom: 24,
    },
    feedbackHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    feedbackMascot: {
      width: 40,
      height: 40,
    },
    feedbackHeaderText: {
      fontSize: 18,
      fontWeight: "800",
    },

    // Quiz
    quizCard: {
      marginBottom: 24,
      backgroundColor: "#FFF",
      borderRadius: 20,
      padding: 24,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
    },
    questionIconWrapper: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    questionText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 24,
      lineHeight: 30,
    },
    quizOptions: { gap: 12 },
    quizOption: {
      backgroundColor: "#FFF",
      padding: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    quizOptionContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    optionLetter: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    optionLetterText: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.text,
    },
    quizOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "08",
      transform: [{ scale: 1.02 }],
    },
    quizOptionCorrect: {
      borderColor: theme.success,
      backgroundColor: theme.success + "15",
    },
    quizOptionWrong: {
      borderColor: theme.error,
      backgroundColor: theme.error + "15",
    },
    quizOptionText: {
      fontSize: 16,
      color: theme.text,
      flex: 1,
      lineHeight: 22,
    },

    // Debrief
    decorativeRing: {
      position: "absolute",
      width: 200,
      height: 200,
      borderRadius: 100,
      borderWidth: 2,
      borderColor: theme.gold + "30",
      borderStyle: "dashed",
    },
    successTitle: {
      fontSize: 32,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 12,
      textAlign: "center",
    },
    successText: {
      fontSize: 18,
      color: theme.textMuted,
      textAlign: "center",
      marginBottom: 40,
      lineHeight: 26,
      paddingHorizontal: 20,
    },
    rewardRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 48,
      width: "100%",
      justifyContent: "center",
    },
    rewardPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFF",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.border,
      borderBottomWidth: 4,
      gap: 12,
      minWidth: 140,
    },
    rewardIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    rewardLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    rewardText: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.text,
    },
  });

// Additional style functions for component-specific styles
const createMythStyles = (theme: typeof LightTHEME) => ({
  fullHeightIndicators: {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  indicatorLeftFull: {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    left: 0,
    width: "50%" as const,
  },
  indicatorRightFull: {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    right: 0,
    width: "50%" as const,
  },
  indicatorContent: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  indicatorTextLeft: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: theme.error,
    marginTop: 8,
  },
  indicatorTextRight: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: theme.success,
    marginTop: 8,
  },
  resultCard: {
    width: width - 48,
    padding: 24,
    borderRadius: 24,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  resultCorrect: { backgroundColor: theme.success + "15" },
  resultIncorrect: { backgroundColor: theme.error + "15" },
  speakerBtn: {
    position: "absolute" as const,
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: theme.card,
    borderRadius: 12,
  },
  resultIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: theme.text,
    marginBottom: 16,
  },
  resultExplanation: {
    fontSize: 16,
    color: theme.textMuted,
    textAlign: "center" as const,
    marginBottom: 24,
    lineHeight: 24,
  },
  realityBox: {
    width: "100%" as const,
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  realityLabel: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: theme.primary,
    marginBottom: 8,
  },
  realityText: { fontSize: 15, color: theme.text, lineHeight: 22 },
  resultContinueBtn: {
    width: "100%" as const,
    height: 56,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderBottomWidth: 4,
  },
  resultContinueBtnText: {
    color: "#FFF",
    fontWeight: "800" as const,
    fontSize: 16,
  },
  speakBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.border,
  },
  speakBtnActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  speakBtnText: { fontSize: 14, fontWeight: "700" as const, color: theme.text },
});

const createLearnStyles = (theme: typeof LightTHEME) => ({
  progressDots: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginBottom: 24,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.border },
  dotActive: { backgroundColor: theme.primary, width: 24 },
  dotCompleted: { backgroundColor: theme.success },
  slideCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: theme.border,
    borderBottomWidth: 4,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  speakerBtn: {
    position: "absolute" as const,
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: theme.bg,
    borderRadius: 12,
  },
  badgeRow: { marginBottom: 16, alignItems: "center" as const },
  learnBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  badgeText: { color: "#FFF", fontWeight: "800" as const, fontSize: 12 },
  mascotImg: { width: 80, height: 80, marginBottom: 16 },
  mascotSmall: { width: 60, height: 60, marginBottom: 16 },
  titleText: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: theme.text,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: theme.textMuted,
    textAlign: "center" as const,
  },
  contentText: {
    fontSize: 16,
    color: theme.text,
    lineHeight: 24,
    textAlign: "center" as const,
  },
  keypointsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 16,
  },
  keypointsTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: theme.text,
  },
  keypoint: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    marginBottom: 12,
    paddingLeft: 8,
  },
  keypointText: { flex: 1, fontSize: 15, color: theme.text, lineHeight: 22 },
  keypointItem: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    marginBottom: 12,
  },
  keypointBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  keypointNumber: { fontSize: 12, fontWeight: "800" as const, color: "#FFF" },
  keypointItemText: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    lineHeight: 22,
  },
  summaryBadge: { marginBottom: 16, alignItems: "center" as const },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: theme.primary,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: theme.text,
    textAlign: "center" as const,
    marginBottom: 12,
  },
  summaryDivider: {
    width: 60,
    height: 2,
    backgroundColor: theme.border,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  summaryMascot: { width: 60, height: 60, marginTop: 16 },
  navButtons: { flexDirection: "row" as const, gap: 12, marginTop: 24 },
  navBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
  },
  backBtn: { backgroundColor: theme.bg, borderColor: theme.border },
  nextBtn: {
    backgroundColor: theme.primary,
    borderColor: theme.primaryDark,
    borderBottomWidth: 4,
  },
  btnText: { fontWeight: "700" as const, fontSize: 14 },
  navRow: { flexDirection: "row" as const, gap: 12, marginTop: 24 },
  continueBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderBottomWidth: 4,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  continueBtnText: { color: "#FFF", fontWeight: "800" as const, fontSize: 16 },
});

const createLabStyles = (theme: typeof LightTHEME) => ({
  headerCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.border,
    borderBottomWidth: 4,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  labBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  badgeText: { color: "#FFF", fontWeight: "800" as const, fontSize: 12 },
  badgeRow: { marginBottom: 16, alignItems: "center" as const },
  speakerBtn: { padding: 8, backgroundColor: theme.bg, borderRadius: 12 },
  mascot: {
    width: 60,
    height: 60,
    marginBottom: 12,
    alignSelf: "center" as const,
  },
  taskText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: theme.text,
    textAlign: "center" as const,
    lineHeight: 26,
  },
  optionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  optionWrapper: { width: "48%" as const },
  optionCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: theme.border,
    borderBottomWidth: 4,
    minHeight: 100,
  },
  optionSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + "08",
  },
  optionCorrect: {
    borderColor: theme.success,
    backgroundColor: theme.success + "10",
  },
  optionWrong: {
    borderColor: theme.error,
    backgroundColor: theme.error + "10",
  },
  optionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.bg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: theme.text,
    textAlign: "center" as const,
  },
  checkCircle: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  feedbackCard: { borderRadius: 16, padding: 16, marginTop: 16 },
  feedbackCorrect: { backgroundColor: theme.success + "15" },
  feedbackWrong: { backgroundColor: theme.error + "15" },
  feedbackHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 8,
  },
  feedbackTitle: { fontSize: 18, fontWeight: "800" as const },
  feedbackText: { fontSize: 15, color: theme.text, lineHeight: 22 },
  bottomBar: { flexDirection: "row" as const, gap: 12, paddingTop: 16 },
  backBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.bg,
    borderWidth: 2,
    borderColor: theme.border,
    paddingHorizontal: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  checkBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.gold,
    borderBottomWidth: 4,
    borderColor: "#D97706",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  checkBtnDisabled: {
    backgroundColor: theme.border,
    borderColor: theme.textMuted,
  },
  checkBtnText: { color: "#FFF", fontWeight: "800" as const, fontSize: 16 },
  navRow: { flexDirection: "row" as const, gap: 12, marginTop: 24 },
  continueBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderBottomWidth: 4,
  },
  continueBtnText: { color: "#FFF", fontWeight: "800" as const, fontSize: 16 },
});

const createQuizStyles = (theme: typeof LightTHEME) => ({
  questionCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.border,
    borderBottomWidth: 4,
  },
  questionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  quizBadge: {
    backgroundColor: theme.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  badgeText: { color: "#FFF", fontWeight: "800" as const, fontSize: 12 },
  speakerBtn: { padding: 8, backgroundColor: theme.bg, borderRadius: 12 },
  questionText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: theme.text,
    lineHeight: 26,
  },
  optionsContainer: { gap: 12, marginBottom: 16 },
  optionCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.border,
    borderBottomWidth: 4,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  optionSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + "08",
  },
  optionCorrect: {
    borderColor: theme.success,
    backgroundColor: theme.success + "10",
  },
  optionWrong: {
    borderColor: theme.error,
    backgroundColor: theme.error + "10",
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.bg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  optionLetterSelected: { backgroundColor: theme.primary },
  optionLetterCorrect: { backgroundColor: theme.success },
  optionLetterWrong: { backgroundColor: theme.error },
  optionLetterText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: theme.text,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
    color: theme.text,
  },
  optionCheck: { width: 24, height: 24 },
  feedbackCard: { borderRadius: 16, padding: 16 },
  feedbackCorrect: { backgroundColor: theme.success + "15" },
  feedbackWrong: { backgroundColor: theme.error + "15" },
  feedbackHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 8,
  },
  feedbackTitle: { fontSize: 18, fontWeight: "800" as const },
  feedbackText: { fontSize: 15, color: theme.text, lineHeight: 22 },
  checkBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.gold,
    borderBottomWidth: 4,
    borderColor: "#D97706",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  checkBtnDisabled: {
    backgroundColor: theme.border,
    borderColor: theme.textMuted,
  },
  checkBtnText: { color: "#FFF", fontWeight: "800" as const, fontSize: 16 },
  continueBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderBottomWidth: 4,
  },
  continueBtnText: { color: "#FFF", fontWeight: "800" as const, fontSize: 16 },
});
