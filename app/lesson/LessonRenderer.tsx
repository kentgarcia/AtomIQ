import {fontFamilies} from "@/theme";
/**
 * Dynamic Lesson Renderer
 * Renders lesson steps based on content from the content system
 */

import { Icon } from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    FadeInDown,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    ZoomIn
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const THEME = {
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

// ============================================
// STEP RENDERERS
// ============================================

// 1. Briefing
export const BriefingRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.mascotLarge}
      >
        <Image
          source={require("@/assets/images/mascot/explain.png")}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.briefingTitle}>Topic: {data.topic}</Text>
      <Text style={styles.briefingSubtitle}>Mission: {data.mission}</Text>
      <View style={styles.loadingBar}>
        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={styles.loadingFill}
        />
      </View>
    </View>
  );
};

// 2. Myth Buster - Creative Flashcard Design
export const MythBusterRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardRotate = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const [showFeedback, setShowFeedback] = useState<
    null | "correct" | "incorrect"
  >(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [leftIndicator, setLeftIndicator] = useState(0);
  const [rightIndicator, setRightIndicator] = useState(0);

  // Stop speech when component unmounts or feedback shows
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

  const speakFeedback = (text: string) => {
    Speech.speak(text, {
      language: "en",
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (showFeedback) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;
      cardRotate.value = interpolate(
        event.translationX,
        [-width, width],
        [-20, 20],
      );
      cardScale.value = interpolate(
        Math.abs(event.translationX),
        [0, 150],
        [1, 0.95],
      );

      runOnJS(setLeftIndicator)(Math.max(0, -event.translationX / 150));
      runOnJS(setRightIndicator)(Math.max(0, event.translationX / 150));
    })
    .onEnd((event) => {
      if (showFeedback) return;
      runOnJS(setLeftIndicator)(0);
      runOnJS(setRightIndicator)(0);

      if (Math.abs(event.translationX) > 120) {
        const isLeft = event.translationX < 0;
        translateX.value = withSpring(isLeft ? -width * 1.5 : width * 1.5, {
          damping: 15,
        });
        translateY.value = withSpring(isLeft ? -50 : -50);
        cardScale.value = withSpring(0.8);
        runOnJS(Speech.stop)();
        runOnJS(setIsSpeaking)(false);
        runOnJS(setShowFeedback)(isLeft ? "correct" : "incorrect");
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0);
        cardRotate.value = withSpring(0);
        cardScale.value = withSpring(1);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${cardRotate.value}deg` },
      { scale: cardScale.value },
    ],
  }));

  return (
    <View style={styles.stepContainer}>
      {/* Header */}
      <View style={mythStyles.header}>
        <View style={mythStyles.headerBadge}>
          <Icon name="Danger" size={20} color="#FFF" variant="Bold" />
          <Text style={mythStyles.headerText}>MYTH BUSTER</Text>
        </View>
        <Text style={mythStyles.headerSubtext}>Is this a myth or fact?</Text>
      </View>

      {/* Swipe Indicators */}
      <View style={mythStyles.indicatorContainer}>
        <Animated.View
          style={[mythStyles.indicatorLeft, { opacity: leftIndicator }]}
        >
          <LinearGradient
            colors={["rgba(239,68,68,0.3)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon name="Forbidden2" size={40} color={THEME.error} />
          <Text style={mythStyles.indicatorTextLeft}>MYTH</Text>
        </Animated.View>

        <Animated.View
          style={[mythStyles.indicatorRight, { opacity: rightIndicator }]}
        >
          <LinearGradient
            colors={["transparent", "rgba(46,204,113,0.3)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon
            name="TickCircle"
            size={40}
            color={THEME.success}
            variant="Bold"
          />
          <Text style={mythStyles.indicatorTextRight}>FACT</Text>
        </Animated.View>
      </View>

      <View style={styles.cardContainer}>
        {showFeedback ? (
          <Animated.View
            entering={ZoomIn.springify().damping(15)}
            style={[
              mythStyles.feedbackCard,
              showFeedback === "correct"
                ? mythStyles.feedbackCorrect
                : mythStyles.feedbackIncorrect,
            ]}
          >
            {/* Result Icon with Glow */}
            <View style={mythStyles.resultIconContainer}>
              <View
                style={[
                  mythStyles.resultIconGlow,
                  {
                    backgroundColor:
                      showFeedback === "correct"
                        ? "rgba(46,204,113,0.3)"
                        : "rgba(239,68,68,0.3)",
                  },
                ]}
              />
              <Icon
                name={showFeedback === "correct" ? "TickCircle" : "Forbidden2"}
                size={80}
                color="#FFF"
                variant="Bold"
              />
            </View>

            <Text style={mythStyles.feedbackTitle}>
              {showFeedback === "correct" ? "🎉 Correct!" : "😅 Not Quite!"}
            </Text>

            <Text style={mythStyles.feedbackSubtitle}>
              {showFeedback === "correct"
                ? "That was indeed a myth!"
                : "That was actually a myth!"}
            </Text>

            {/* Explanation Card */}
            <View style={mythStyles.explanationCard}>
              <View style={mythStyles.explanationHeader}>
                <Icon
                  name="InfoCircle"
                  size={20}
                  color={
                    showFeedback === "correct" ? THEME.success : THEME.error
                  }
                />
                <Text style={mythStyles.explanationLabel}>THE TRUTH</Text>
                <TouchableOpacity
                  onPress={() =>
                    speakFeedback(
                      `${data.explanation}. The reality is: ${data.reality}`,
                    )
                  }
                  style={mythStyles.speakBtnSmall}
                >
                  <Icon
                    name="VolumeHigh"
                    size={18}
                    color={
                      showFeedback === "correct" ? THEME.success : THEME.error
                    }
                  />
                </TouchableOpacity>
              </View>
              <Text style={mythStyles.explanationText}>{data.explanation}</Text>

              <View style={mythStyles.realitySection}>
                <Text style={mythStyles.realityLabel}>💡 REALITY:</Text>
                <Text style={mythStyles.realityText}>{data.reality}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={mythStyles.continueBtn}
              onPress={onComplete}
            >
              <LinearGradient
                colors={["#FFF", "#F0F0F0"]}
                style={mythStyles.continueBtnGradient}
              >
                <Text
                  style={[
                    mythStyles.continueBtnText,
                    {
                      color:
                        showFeedback === "correct"
                          ? THEME.success
                          : THEME.error,
                    },
                  ]}
                >
                  CONTINUE
                </Text>
                <Icon
                  name="ArrowRight2"
                  size={20}
                  color={
                    showFeedback === "correct" ? THEME.success : THEME.error
                  }
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <GestureDetector gesture={pan}>
            <Animated.View style={[mythStyles.flashCard, cardStyle]}>
              {/* Card Decorations */}
              <View style={mythStyles.cardCornerTL}>
                <Icon name="Danger" size={16} color="rgba(239,68,68,0.3)" />
              </View>
              <View style={mythStyles.cardCornerTR}>
                <Icon name="Danger" size={16} color="rgba(239,68,68,0.3)" />
              </View>
              <View style={mythStyles.cardCornerBL}>
                <Icon name="Danger" size={16} color="rgba(239,68,68,0.3)" />
              </View>
              <View style={mythStyles.cardCornerBR}>
                <Icon name="Danger" size={16} color="rgba(239,68,68,0.3)" />
              </View>

              {/* Question Mark Badge */}
              <View style={mythStyles.questionBadge}>
                <Text style={mythStyles.questionMark}>?</Text>
              </View>

              {/* Myth Content */}
              <View style={mythStyles.mythContent}>
                <Text style={mythStyles.quoteOpen}>"</Text>
                <Text style={mythStyles.mythText}>{data.myth}</Text>
                <Text style={mythStyles.quoteClose}>"</Text>
              </View>

              {data.image && (
                <Image
                  source={{ uri: data.image }}
                  style={mythStyles.mythImage}
                />
              )}

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
                  color={isSpeaking ? "#FFF" : THEME.primary}
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

              {/* Swipe Instructions */}
              <View style={mythStyles.swipeHint}>
                <View style={mythStyles.swipeHintLeft}>
                  <Icon name="ArrowLeft2" size={18} color={THEME.error} />
                  <Text
                    style={[mythStyles.swipeHintText, { color: THEME.error }]}
                  >
                    MYTH
                  </Text>
                </View>
                <Text style={mythStyles.swipeDivider}>Swipe to answer</Text>
                <View style={mythStyles.swipeHintRight}>
                  <Text
                    style={[mythStyles.swipeHintText, { color: THEME.success }]}
                  >
                    FACT
                  </Text>
                  <Icon name="ArrowRight2" size={18} color={THEME.success} />
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
};

// Myth Buster specific styles
const mythStyles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.error,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: THEME.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    letterSpacing: 1,
  },
  headerSubtext: {
    color: THEME.textMuted,
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    marginTop: 12,
  },
  indicatorContainer: {
    position: "absolute",
    top: 150,
    left: 0,
    right: 0,
    bottom: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    pointerEvents: "none",
    zIndex: 10,
  },
  indicatorLeft: {
    width: 100,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  indicatorRight: {
    width: 100,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  indicatorTextLeft: {
    color: THEME.error,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    fontSize: 14,
  },
  indicatorTextRight: {
    color: THEME.success,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    fontSize: 14,
  },
  flashCard: {
    width: width - 48,
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 3,
    borderColor: "rgba(239,68,68,0.15)",
    position: "relative",
    overflow: "hidden",
  },
  cardCornerTL: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  cardCornerTR: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  cardCornerBL: {
    position: "absolute",
    bottom: 12,
    left: 12,
  },
  cardCornerBR: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  questionBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: THEME.primary,
  },
  questionMark: {
    fontSize: 32,
    fontWeight: "900",
    fontFamily: fontFamilies.black,
    color: THEME.primary,
  },
  mythContent: {
    alignItems: "center",
    marginBottom: 20,
  },
  quoteOpen: {
    fontSize: 48,
    color: "rgba(239,68,68,0.2)",
    fontWeight: "900",
    fontFamily: fontFamilies.black,
    lineHeight: 48,
    marginBottom: -10,
  },
  mythText: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
    color: THEME.text,
    textAlign: "center",
    lineHeight: 32,
    paddingHorizontal: 8,
  },
  quoteClose: {
    fontSize: 48,
    color: "rgba(239,68,68,0.2)",
    fontWeight: "900",
    fontFamily: fontFamilies.black,
    lineHeight: 48,
    marginTop: -10,
    alignSelf: "flex-end",
  },
  mythImage: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    marginBottom: 20,
  },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  speakBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryDark,
  },
  speakBtnText: {
    color: THEME.primary,
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  swipeHintLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swipeHintRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swipeHintText: {
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
    fontSize: 12,
  },
  swipeDivider: {
    color: THEME.textMuted,
    fontSize: 11,
    fontFamily: fontFamilies.regular,
  },
  feedbackCard: {
    width: width - 32,
    padding: 28,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  feedbackCorrect: {
    backgroundColor: THEME.success,
  },
  feedbackIncorrect: {
    backgroundColor: THEME.error,
  },
  resultIconContainer: {
    marginBottom: 16,
    position: "relative",
  },
  resultIconGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -20,
    left: -20,
  },
  feedbackTitle: {
    fontSize: 32,
    fontWeight: "900",
    fontFamily: fontFamilies.black,
    color: "#FFF",
    marginBottom: 8,
  },
  feedbackSubtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 20,
  },
  explanationCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    marginBottom: 20,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    flex: 1,
  },
  speakBtnSmall: {
    padding: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
  },
  explanationText: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: THEME.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  realitySection: {
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: THEME.gold,
  },
  realityLabel: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 6,
  },
  realityText: {
    fontSize: 14,
    color: THEME.text,
    lineHeight: 20,
    fontWeight: "600",
    fontFamily: fontFamilies.semibold,
  },
  continueBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
  },
});

// 3. Micro Learn
export const MicroLearnRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>THE CONCEPT</Text>
      <Animated.View
        entering={FadeInDown.delay(200)}
        style={styles.conceptCard}
      >
        {data.image && (
          <Image source={{ uri: data.image }} style={styles.conceptImage} />
        )}
        <Text style={styles.conceptTitle}>{data.title}</Text>
        <Text style={styles.conceptText}>{data.content}</Text>

        {data.keyPoints && data.keyPoints.length > 0 && (
          <View style={styles.keyPointsContainer}>
            <Text style={styles.keyPointsTitle}>Key Points:</Text>
            {data.keyPoints.map((point: string, index: number) => (
              <View key={index} style={styles.keyPoint}>
                <Icon
                  name="TickCircle"
                  size={16}
                  color={THEME.primary}
                  variant="Bold"
                />
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      <TouchableOpacity style={styles.mainBtn} onPress={onComplete}>
        <Text style={styles.mainBtnText}>GOT IT!</Text>
      </TouchableOpacity>
    </View>
  );
};

// 4. Lab
export const LabRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleCheck = () => {
    setShowResult(true);
  };

  const isCorrect = selectedOption === data.correctAnswer;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>{data.title}</Text>
      <Text style={styles.stepSubHeader}>{data.description}</Text>

      <View style={styles.labCard}>
        <Text style={styles.taskText}>{data.task}</Text>

        <View style={styles.optionsRow}>
          {data.options.map((option: any) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionBtn,
                selectedOption === option.id && styles.optionBtnActive,
              ]}
              onPress={() => !showResult && setSelectedOption(option.id)}
            >
              {option.icon && (
                <Icon
                  name={option.icon}
                  size={24}
                  color={
                    selectedOption === option.id
                      ? THEME.primary
                      : THEME.textMuted
                  }
                />
              )}
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showResult && (
          <Animated.View
            entering={FadeInDown}
            style={[
              styles.resultBox,
              isCorrect ? styles.resultCorrect : styles.resultIncorrect,
            ]}
          >
            <Icon
              name={isCorrect ? "TickCircle" : "CloseCircle"}
              size={32}
              color={isCorrect ? THEME.success : THEME.error}
              variant="Bold"
            />
            <Text style={styles.resultText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.mainBtn, !selectedOption && styles.mainBtnDisabled]}
        onPress={showResult ? onComplete : handleCheck}
        disabled={!selectedOption}
      >
        <Text style={styles.mainBtnText}>
          {showResult ? "CONTINUE" : "CHECK ANSWER"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// 5. Assessment
export const AssessmentRenderer = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete: () => void;
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleCheck = () => {
    if (selected !== null && !confirmed) {
      setConfirmed(true);
    } else if (confirmed && selected === data.correctIndex) {
      onComplete();
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>ASSESSMENT</Text>

      <View style={styles.quizCard}>
        <Text style={styles.questionText}>{data.question}</Text>

        {data.image && (
          <Image source={{ uri: data.image }} style={styles.quizImage} />
        )}

        <View style={styles.quizOptions}>
          {data.options.map((opt: string, index: number) => {
            let extraStyle = {};
            if (confirmed) {
              if (index === data.correctIndex)
                extraStyle = styles.quizOptionCorrect;
              else if (index === selected) extraStyle = styles.quizOptionWrong;
            } else if (selected === index) {
              extraStyle = styles.quizOptionSelected;
            }

            return (
              <TouchableOpacity
                key={opt}
                style={[styles.quizOption, extraStyle]}
                onPress={() => !confirmed && setSelected(index)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.quizOptionText,
                    (confirmed || selected === index) && { fontWeight: "700", fontFamily: fontFamilies.bold },
                  ]}
                >
                  {opt}
                </Text>
                {confirmed && index === data.correctIndex && (
                  <Icon
                    name="TickCircle"
                    size={20}
                    color={THEME.success}
                    variant="Bold"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {confirmed && (
          <Animated.View entering={FadeInDown} style={styles.explanationBox}>
            <Text style={styles.explanationText}>{data.explanation}</Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.mainBtn, selected === null && styles.mainBtnDisabled]}
        onPress={handleCheck}
        disabled={selected === null}
      >
        <Text style={styles.mainBtnText}>
          {confirmed
            ? selected === data.correctIndex
              ? "CONTINUE"
              : "TRY AGAIN"
            : "CHECK ANSWER"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// 6. Debrief
export const DebriefRenderer = ({
  data,
  levelId,
  onComplete,
}: {
  data: any;
  levelId: string;
  onComplete: () => void;
}) => {
  return (
    <View style={styles.fullScreenCenter}>
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.mascotLarge}
      >
        <Image
          source={require("@/assets/images/mascot/happy.png")}
          style={styles.mascotImageSuccess}
          resizeMode="contain"
        />
      </Animated.View>

      <Text style={styles.successTitle}>{data.title}</Text>
      <Text style={styles.successText}>{data.message}</Text>

      <View style={styles.rewardRow}>
        <View style={styles.rewardPill}>
          <Icon name="Flash" size={24} color={THEME.gold} variant="Bold" />
          <Text style={styles.rewardText}>+{data.rewards.xp} XP</Text>
        </View>
        <View style={styles.rewardPill}>
          <Icon name="Star1" size={24} color={THEME.gold} variant="Bold" />
          <Text style={styles.rewardText}>{data.rewards.stars} Stars</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.mainBtn} onPress={onComplete}>
        <Text style={styles.mainBtnText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  fullScreenCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  stepHeader: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.primary,
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 8,
  },
  stepSubHeader: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
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
    fontSize: 28,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    textAlign: "center",
    marginBottom: 8,
  },
  briefingSubtitle: {
    fontSize: 18,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: THEME.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingFill: {
    width: "100%",
    height: "100%",
    backgroundColor: THEME.primary,
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeCard: {
    width: width - 48,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 6,
  },
  mythBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  mythBadgeText: {
    color: "#FFF",
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    fontSize: 12,
  },
  mythText: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
    color: THEME.text,
    textAlign: "center",
    marginBottom: 24,
  },
  mythImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginBottom: 24,
  },
  swipeInstructions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 16,
  },
  swipeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swipeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackCard: {
    width: width - 48,
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
  },
  feedbackCorrect: {
    backgroundColor: THEME.success,
  },
  feedbackIncorrect: {
    backgroundColor: THEME.error,
  },
  feedbackTitle: {
    fontSize: 32,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
    marginTop: 16,
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 16,
  },
  realityBox: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 24,
  },
  realityLabel: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
    marginBottom: 8,
  },
  realityText: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "600",
    fontFamily: fontFamilies.semibold,
  },
  continueBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
  },
  conceptCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  conceptImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  conceptTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 12,
  },
  conceptText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: THEME.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  keyPointsContainer: {
    marginTop: 16,
  },
  keyPointsTitle: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.primary,
    marginBottom: 12,
  },
  keyPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: THEME.text,
    lineHeight: 20,
  },
  labCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  taskText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
    color: THEME.text,
    textAlign: "center",
    marginBottom: 24,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: 12,
    marginBottom: 24,
  },
  optionBtn: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    gap: 8,
  },
  optionBtnActive: {
    borderColor: THEME.primary,
    backgroundColor: "#FFF5EB",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
    color: THEME.text,
    textAlign: "center",
  },
  resultBox: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultCorrect: {
    backgroundColor: "#E8F5E9",
  },
  resultIncorrect: {
    backgroundColor: "#FEE2E2",
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: THEME.text,
  },
  quizCard: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
    color: THEME.text,
    marginBottom: 24,
    lineHeight: 28,
  },
  quizImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
  },
  quizOptions: {
    gap: 12,
  },
  quizOption: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quizOptionSelected: {
    borderColor: THEME.primary,
    backgroundColor: "#FFF5EB",
  },
  quizOptionCorrect: {
    borderColor: THEME.success,
    backgroundColor: "#E8F5E9",
  },
  quizOptionWrong: {
    borderColor: THEME.error,
    backgroundColor: "#FEE2E2",
  },
  quizOptionText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: THEME.text,
  },
  explanationBox: {
    backgroundColor: "#F0F9FF",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: THEME.primary,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: THEME.text,
    lineHeight: 20,
  },
  mainBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: THEME.primaryDark,
  },
  mainBtnDisabled: {
    opacity: 0.5,
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: "#FFF",
  },
  successTitle: {
    fontSize: 32,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.primary,
    marginBottom: 12,
  },
  successText: {
    fontSize: 18,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  rewardRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 48,
  },
  rewardPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    gap: 8,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
  },
});

export default {
  BriefingRenderer,
  MythBusterRenderer,
  MicroLearnRenderer,
  LabRenderer,
  AssessmentRenderer,
  DebriefRenderer,
};
