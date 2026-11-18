/**
 * Daily streak screen — the celebratory "your streak is on fire" page.
 *
 * Opened from the streak pill in the top row, and shown automatically once a
 * day when the day's streak goes up (see `useStreakCelebration`). The detailed
 * activity history stays on /streak.
 */

import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Image, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Flame } from "@/components/streak/Flame";
import { notifySuccess } from "@/services/haptics";
import { useStorage } from "@/services/StorageContext";
import {
  createStyles,
  fontFaces,
  radius,
  useResponsiveLayout,
  useTheme,
  withAlpha,
} from "@/theme";

const MASCOT = require("@/assets/images/mascot/happy_2.png");
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Mascot entrance: a short, calm settle (no overshoot) rather than a bouncy zoom
const MASCOT_ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.cubic) },
})
  .delay(120)
  .duration(420);
const MASCOT_WIDTH = 180;
const FLAME_WIDTH = 104;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles the .lottie file as an asset
const FIRE = require("@/assets/lottie/Fire.lottie");
// Fire.lottie is 500 x 690
const FIRE_WIDTH = 170;
const FIRE_HEIGHT = FIRE_WIDTH * (690 / 500);
// How far the fire and the mascot tuck into each other
const HERO_OVERLAP = 56;
// The number sits on the fire artwork, so its colours are fixed: white with a hard black shadow
const COUNT_FILL = "#FFFFFF"; // theme-allow: number on the fire artwork, same in light and dark
const COUNT_SHADOW = "#000000"; // theme-allow: number on the fire artwork, same in light and dark
const COUNT_SHADOW_DROP = 3;

/** Today plus the next six days, like a "streak week" that starts now. */
const buildWeek = () => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return WEEKDAYS[d.getDay()];
  });
};

export default function DailyStreakScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { contentMaxWidth } = useResponsiveLayout();
  const reducedMotion = useReducedMotion();
  const { userProfile } = useStorage();

  const streak = userProfile?.current_streak || 0;
  const active = streak > 0;
  const week = useMemo(() => buildWeek(), []);

  useEffect(() => {
    notifySuccess();
  }, []);

  const enter = (delay: number) =>
    reducedMotion ? FadeIn.duration(150) : FadeInDown.delay(delay).duration(380);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const headline = active ? "Your streak is on fire!" : "Your streak starts soon!";
  const subline = `Come back tomorrow for streak day ${active ? streak + 1 : 1}!`;

  return (
    <View style={styles.screen}>
      <LinearGradient
        pointerEvents="none"
        colors={[c.primarySurface, c.background]}
        locations={[0, 0.75]}
        style={styles.backdrop}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.column, { maxWidth: contentMaxWidth }]}>
          <Animated.View entering={enter(0)}>
            <Text style={styles.headline} accessibilityRole="header">
              {headline}
            </Text>
            <Text style={styles.headline}>{subline}</Text>
          </Animated.View>

          <View
            style={styles.hero}
            accessible
            accessibilityLabel={`${streak} day streak`}
          >
            <View style={styles.flameWrap}>
              {active ? (
                // Decorative. With reduced motion it holds one frame and does not play.
                <View accessible={false} importantForAccessibility="no-hide-descendants">
                  <LottieView
                    source={FIRE}
                    autoPlay={!reducedMotion}
                    loop
                    progress={reducedMotion ? 0.5 : undefined}
                    style={{ width: FIRE_WIDTH, height: FIRE_HEIGHT }}
                  />
                </View>
              ) : (
                <Flame
                  size={FLAME_WIDTH}
                  top={c.surfaceStrong}
                  bottom={c.borderStrong}
                  inner={c.surfaceSoft}
                />
              )}
              <View
                pointerEvents="none"
                style={[styles.countWrap, active && styles.countWrapLit]}
              >
                <Text style={styles.count}>{streak}</Text>
              </View>
            </View>
            <Animated.View style={styles.mascotWrap} entering={reducedMotion ? FadeIn.duration(150) : MASCOT_ENTER}>
              <Image
                source={MASCOT}
                style={styles.mascot}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </Animated.View>
          </View>

          <Animated.View entering={enter(220)} style={styles.card}>
            <View style={styles.daysRow}>
              {week.map((label, i) => (
                <View key={i} style={styles.day}>
                  <Text style={[styles.dayLabel, i === 0 && styles.dayLabelToday]}>
                    {label}
                  </Text>
                  {i === 0 && active ? (
                    <Icon name="TickCircle" size={34} color={c.success} variant="Bold" />
                  ) : i === 0 || i === 1 ? (
                    <View style={[styles.dayRing, i === 1 && { borderColor: c.primary }]} />
                  ) : (
                    <View style={styles.dayFuture}>
                      <Flame
                        size={16}
                        top={c.surfaceStrong}
                        bottom={c.borderStrong}
                        inner={c.surfaceSoft}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.tip}>
              <View style={styles.tipCaret} />
              <Text style={styles.tipText}>
                Tip: Come back tomorrow so your streak doesn&apos;t reset
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      <Animated.View
        entering={enter(340)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={[styles.column, { maxWidth: contentMaxWidth }]}>
          <Button label="CONTINUE" onPress={close} accessibilityLabel="Continue" />
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    screen: { flex: 1, backgroundColor: c.background },
    backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    // Centered in the space above the button; scrolls only on very small screens
    scroll: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    column: { width: "100%", alignSelf: "center" },
    headline: {
      fontSize: 22,
      lineHeight: 30,
      textAlign: "center",
      color: c.text,
      ...fontFaces.heavy,
    },
    hero: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      marginTop: 20,
      marginBottom: 24,
    },
    mascot: { width: MASCOT_WIDTH, height: MASCOT_WIDTH * (887 / 804) },
    // In front of the fire
    mascotWrap: { marginLeft: -HERO_OVERLAP, zIndex: 2 },
    // On the left, in front of Shrodi
    flameWrap: {
      zIndex: 1,
      marginBottom: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    countWrap: {
      position: "absolute",
      bottom: FLAME_WIDTH * 0.2,
      alignItems: "center",
      justifyContent: "center",
    },
    countWrapLit: { bottom: FIRE_HEIGHT * 0.12 },
    count: {
      fontSize: 44,
      lineHeight: 52,
      color: COUNT_FILL,
      textShadowColor: COUNT_SHADOW,
      textShadowOffset: { width: 0, height: COUNT_SHADOW_DROP },
      textShadowRadius: 0,
      ...fontFaces.heavy,
    },
    card: {
      padding: 16,
      borderRadius: radius["2xl"],
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
    },
    daysRow: { flexDirection: "row" },
    day: { flex: 1, alignItems: "center", gap: 8 },
    dayLabel: { fontSize: 12, color: c.textMuted, ...fontFaces.bold },
    dayLabelToday: { color: c.text, ...fontFaces.heavy },
    dayRing: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: c.borderStrong,
    },
    dayFuture: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceSoft,
    },
    tip: {
      marginTop: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: c.surfaceSoft,
    },
    // Points up at tomorrow's circle (the second of seven columns)
    tipCaret: {
      position: "absolute",
      top: -6,
      left: `${(1.5 / 7) * 100}%`,
      marginLeft: -6,
      width: 12,
      height: 12,
      backgroundColor: c.surfaceSoft,
      transform: [{ rotate: "45deg" }],
    },
    tipText: { fontSize: 13, lineHeight: 18, color: c.textSecondary, ...fontFaces.semibold },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: withAlpha(c.background, 0.9),
    },
  };
});
