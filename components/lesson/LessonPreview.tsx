import { Icon } from "@/components/ui/icon";
import type { Lesson } from "@/content/types";
import React, { useCallback } from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { fontFamilies } from "@/theme";

/* Autumn design tokens shared with the home map (reference design) */
const BTN_COLOR = "#FF8C00";
const BTN_LIP = "#E67E22";
const BTN_HEIGHT = 64;
const BTN_RADIUS = 20;
const BTN_BORDER = 5;
const BTN_INNER_RADIUS = BTN_RADIUS - BTN_BORDER;
const BTN_LIP_DEPTH = 10;
const BTN_LIP_PRESSED = 5;
const BTN_PRESS_SHIFT = 6;

/* Reference press transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1) */
const PRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1);

interface LessonPreviewProps {
  lesson: Lesson | null;
  loading: boolean;
  isReplay: boolean;
  unitTitle: string;
  unitSubtitle: string;
  fallbackDescription: string;
  onClose: () => void;
  onProceed: () => void;
}

export function LessonPreview({
  lesson,
  loading,
  isReplay,
  unitTitle,
  unitSubtitle,
  fallbackDescription,
  onClose,
  onProceed,
}: LessonPreviewProps) {
  const pressed = useSharedValue(0);

  // Reference :active — button sinks and the lip shallows
  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 150, easing: PRESS_EASING });
  }, [pressed]);
  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: 150, easing: PRESS_EASING });
  }, [pressed]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * BTN_PRESS_SHIFT }],
  }));
  const faceStyle = useAnimatedStyle(() => ({
    bottom: BTN_LIP_DEPTH - pressed.value * (BTN_LIP_DEPTH - BTN_LIP_PRESSED),
  }));

  const title = lesson?.title ?? unitTitle;
  const description = lesson?.description ?? fallbackDescription;
  const buttonLabel = loading
    ? "Preparing…"
    : isReplay
      ? "Review Lesson"
      : "Start Lesson";

  return (
    <View style={styles.root}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Icon name="Close" size={22} color="#888888" />
      </TouchableOpacity>

      <View style={styles.body}>
        <Animated.View entering={FadeInDown.springify()} style={styles.heroWrap}>
          <Image
            source={require("@/assets/images/mascot/explain.png")}
            style={styles.mascot}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={[styles.card, { opacity: loading ? 0.7 : 1 }]}
        >
          {isReplay && (
            <View style={styles.reviewPill}>
              <Icon name="TickSquare" size={14} color="#E67E22" variant="Bold" />
              <Text style={styles.reviewText}>Completed — review mode</Text>
            </View>
          )}
          <Text style={styles.eyebrow} numberOfLines={1}>
            {unitSubtitle}
          </Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {lesson && (
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Icon name="Flash" size={14} color="#F59E0B" variant="Bold" />
                <Text style={styles.metaText}>{lesson.xpReward} XP</Text>
              </View>
              <View style={styles.metaPill}>
                <Icon name="Clock" size={14} color="#64B5F6" variant="Bold" />
                <Text style={styles.metaText}>~{lesson.estimatedMinutes} min</Text>
              </View>
              <View style={styles.metaPill}>
                <Icon name="Book" size={14} color="#81C784" variant="Bold" />
                <Text style={styles.metaText}>{lesson.steps.length} steps</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Proceed button — reference button design */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={[styles.btnWrap, btnStyle, { opacity: loading ? 0.6 : 1 }]}
        >
          <TouchableOpacity
            activeOpacity={1}
            disabled={loading}
            onPress={onProceed}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.btn}>
              <View style={[styles.btnInner, { backgroundColor: BTN_LIP }]}>
                <Animated.View
                  style={[styles.btnFace, faceStyle, { backgroundColor: BTN_COLOR }]}
                />
                <View style={styles.btnContent}>
                  <Icon name="Play" size={20} color="#FFFFFF" variant="Bold" />
                  <Text style={styles.btnText}>{buttonLabel}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  heroWrap: {
    marginBottom: 18,
  },
  mascot: {
    width: 120,
    height: 120,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  reviewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF3E0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: "#E67E22",
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: fontFamilies.semibold,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamilies.heavy,
    color: "#333333",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: "#666666",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF8EF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: "#555555",
  },
  btnWrap: {
    width: "100%",
    marginTop: 28,
  },
  /* Reference button: white border wrapping an orange face over a lip */
  btn: {
    height: BTN_HEIGHT,
    borderRadius: BTN_RADIUS,
    borderWidth: BTN_BORDER,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  btnInner: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: BTN_INNER_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFace: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: BTN_LIP_DEPTH,
    borderRadius: BTN_INNER_RADIUS,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Math.round(BTN_LIP_DEPTH / 2),
  },
  btnText: {
    fontSize: 17,
    fontFamily: fontFamilies.heavy,
    color: "#FFFFFF",
  },
});
