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
import * as Speech from "expo-speech";

import {type Palette, fontFamilies} from "@/theme";
import { Icon } from "@/components/ui/icon";

import { createMythStyles, createStyles } from "./styles";

export const MythBusterView = ({
  data,
  onComplete,
  theme,
}: {
  data: any;
  onComplete: () => void;
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
                      fontWeight: "800",
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
  );
};
