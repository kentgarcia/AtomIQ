import { useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
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
    withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { speakSafely, stopSpeech } from "@/services/speech";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {type Palette, fontFamilies} from "@/theme";
import { Icon } from "@/components/ui/icon";

import { createMythStyles, createStyles } from "./styles";

export const MythBusterView = ({
  data,
  onComplete,
  topBarHeight,
  theme,
}: {
  data: any;
  onComplete: () => void;
  topBarHeight: number;
  theme: Palette;
}) => {
  const translateX = useSharedValue(0);
  const cardRotate = useSharedValue(0);
  const [showFeedback, setShowFeedback] = useState<
    null | "correct" | "incorrect"
  >(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, width), [theme, width]);
  const mythStyles = useMemo(() => createMythStyles(theme, width), [theme, width]);
  const leftIndicator = useSharedValue(0);
  const rightIndicator = useSharedValue(0);
  const insets = useSafeAreaInsets();

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const speakMyth = async () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakSafely(data.myth, {
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

      leftIndicator.value = Math.max(
        0,
        Math.min(1, -event.translationX / 100),
      );
      rightIndicator.value = Math.max(
        0,
        Math.min(1, event.translationX / 100),
      );
    })
    .onEnd((event) => {
      if (showFeedback) return;
      leftIndicator.value = withTiming(0, { duration: 200 });
      rightIndicator.value = withTiming(0, { duration: 200 });

      if (Math.abs(event.translationX) > 120) {
        const isLeft = event.translationX < 0;
        translateX.value = withTiming(isLeft ? -width * 1.5 : width * 1.5, {
          duration: 200,
        });
        runOnJS(stopSpeech)();
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

  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: leftIndicator.value,
  }));
  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: rightIndicator.value,
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen swipe tint — escapes the step area so the gradient also
          covers the header bar and the safe-area margins */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -(topBarHeight + insets.top),
          bottom: -insets.bottom,
          left: -insets.left,
          right: -insets.right,
        }}
      >
        <Animated.View style={[mythStyles.indicatorFull, leftIndicatorStyle]}>
          <LinearGradient
            colors={[
              "rgba(239,68,68,0.5)",
              "rgba(239,68,68,0.18)",
              "rgba(239,68,68,0.03)",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Vertical wash so the top and bottom edges join the tint */}
          <LinearGradient
            colors={[
              "rgba(239,68,68,0.25)",
              "rgba(239,68,68,0)",
              "rgba(239,68,68,0)",
              "rgba(239,68,68,0.25)",
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[mythStyles.indicatorContent, mythStyles.indicatorContentLeft]}
          >
            <Icon name="Forbidden2" size={48} color={theme.error} />
            <Text style={mythStyles.indicatorTextLeft}>MYTH</Text>
          </View>
        </Animated.View>

        <Animated.View style={[mythStyles.indicatorFull, rightIndicatorStyle]}>
          <LinearGradient
            colors={[
              "rgba(46,204,113,0.03)",
              "rgba(46,204,113,0.18)",
              "rgba(46,204,113,0.5)",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Vertical wash so the top and bottom edges join the tint */}
          <LinearGradient
            colors={[
              "rgba(46,204,113,0.25)",
              "rgba(46,204,113,0)",
              "rgba(46,204,113,0)",
              "rgba(46,204,113,0.25)",
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              mythStyles.indicatorContent,
              mythStyles.indicatorContentRight,
            ]}
          >
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

      {/* Transparent so the full-screen tint shows through from behind */}
      <View style={[styles.stepContainer, { backgroundColor: "transparent" }]}>
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
                speakSafely(
                  `${data.explanation}. The reality is: ${data.reality}`,
                  { language: "en", rate: 0.9 },
                )
              }
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Read explanation aloud"
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
              <Text style={styles.mythText}>&ldquo;{data.myth}&rdquo;</Text>

              {/* Read Aloud Button */}
              <TouchableOpacity
                style={[
                  mythStyles.speakBtn,
                  isSpeaking && mythStyles.speakBtnActive,
                ]}
                onPress={speakMyth}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={isSpeaking ? "Stop reading myth" : "Read myth aloud"}
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
                      fontFamily: fontFamilies.heavy,
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
                      fontFamily: fontFamilies.heavy,
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
    </View>
  );
};
