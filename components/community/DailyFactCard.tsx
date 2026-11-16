/**
 * DailyFactCard — the "Did you know?" card at the top of the Discovery Hub.
 *
 * Left: the floating Discover mascot. Right: today's fact in its short form
 * plus a "Read more" button. Pressing it opens the full story and completes
 * the "Read Daily Fact" mission (XP is awarded once per day).
 */

import { Image as ExpoImage } from "expo-image";
import { useIsFocused } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { renderRichText } from "@/components/community/rich-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useDailyMissions } from "@/hooks/use-daily-missions";
import { notifySuccess } from "@/services/haptics";
import { getDailyFact, type DailyFact } from "@/services/missions";
import { createStyles, fontFaces, radius, spacing, useTheme } from "@/theme";

const MASCOT = require("@/assets/images/mascot/discover.svg");

export function DailyFactCard() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { missions, markFactRead, refresh } = useDailyMissions();

  const [fact, setFact] = useState<DailyFact | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void getDailyFact().then((f) => {
      if (alive) setFact(f);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Re-read the mission state whenever the tab regains focus (it may have been
  // claimed from Home), without re-rendering the whole screen.
  const focused = useIsFocused();
  const wasFocused = useRef(true);
  useEffect(() => {
    if (focused && !wasFocused.current) void refresh();
    wasFocused.current = focused;
  }, [focused, refresh]);

  const mission = missions.find((m) => m.type === "fact");
  const claimed = mission?.isClaimed ?? false;
  const reward = mission?.reward ?? 0;

  // Gentle float, matching the other mascots; static with reduced motion.
  const y = useSharedValue(0);
  const rotate = useSharedValue(0);
  // Tab screens stay mounted when you leave them, so stop the loop while the
  // Discovery Hub is not the visible tab instead of animating off-screen.
  useEffect(() => {
    if (reducedMotion || !focused) {
      cancelAnimation(y);
      cancelAnimation(rotate);
      y.value = 0;
      rotate.value = 0;
      return;
    }
    const loop = { duration: 2200, easing: Easing.inOut(Easing.sin) };
    y.value = withRepeat(withTiming(-5, loop), -1, true);
    rotate.value = withRepeat(withTiming(3, loop), -1, true);
    return () => {
      cancelAnimation(y);
      cancelAnimation(rotate);
    };
  }, [y, rotate, reducedMotion, focused]);
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rotate.value}deg` }],
  }));

  const readMore = useCallback(async () => {
    setOpen(true);
    if (claimed) return;
    await markFactRead();
    notifySuccess();
  }, [claimed, markFactRead]);

  return (
    <>
      <View style={styles.card}>
        <Animated.View style={[styles.mascotWrap, mascotStyle]} pointerEvents="none">
          <ExpoImage source={MASCOT} style={styles.mascot} contentFit="contain" />
        </Animated.View>

        <View style={styles.body}>
          <View style={styles.labelRow}>
            <Icon name="Lamp" size={14} color={theme.colors.primaryLight} variant="Bold" />
            <Text style={styles.label}>Did you know?</Text>
          </View>
          <Text style={styles.short} numberOfLines={4}>
            {fact?.short ?? "Loading today's fact..."}
          </Text>
          <View style={styles.actionRow}>
            <Button
              label="Read more"
              size="compact"
              fullWidth={false}
              disabled={!fact}
              onPress={() => void readMore()}
              accessibilityLabel={
                claimed
                  ? "Read the full daily fact again"
                  : `Read the full daily fact and earn ${reward} XP`
              }
              style={styles.button}
            />
            {claimed ? (
              <View style={styles.donePill}>
                <Icon name="TickCircle" size={14} color={theme.colors.success} variant="Bold" />
                <Text style={styles.doneText}>Done</Text>
              </View>
            ) : (
              <View style={styles.rewardPill}>
                <Icon name="Flash" size={13} color={theme.colors.primaryLight} variant="Bold" />
                <Text style={styles.rewardText}>+{reward} XP</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={[
            styles.overlay,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          <Animated.View
            entering={
              reducedMotion ? FadeIn.duration(120) : FadeInDown.duration(280).springify()
            }
            style={[styles.sheet, { maxHeight: Math.max(320, height * 0.85) }]}
            accessibilityViewIsModal
          >
            <View style={styles.labelRow}>
              <Icon name="Lamp" size={14} color={theme.colors.primaryLight} variant="Bold" />
              <Text style={styles.label}>Did you know?</Text>
            </View>
            <Text style={styles.sheetTitle}>{fact?.title}</Text>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {fact ? (
                <>
                  <Text style={styles.sheetShort}>{fact.short}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.sheetBody}>{renderRichText(fact.explanation)}</Text>
                </>
              ) : null}
            </ScrollView>

            <Button label="Got it" onPress={() => setOpen(false)} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 4,
      padding: 14,
      borderRadius: radius["2xl"],
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
    },
    mascotWrap: {
      width: 96,
      height: 112,
      alignItems: "center",
      justifyContent: "center",
    },
    mascot: { width: 96, height: 112 },
    body: { flex: 1, gap: 6 },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: {
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: c.primaryLight,
      ...fontFaces.heavy,
    },
    short: {
      fontSize: 15,
      lineHeight: 21,
      color: c.text,
      ...fontFaces.bold,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 4,
    },
    button: { alignSelf: "flex-start" },
    rewardPill: { flexDirection: "row", alignItems: "center", gap: 4 },
    rewardText: { fontSize: 13, color: c.primaryLight, ...fontFaces.heavy },
    donePill: { flexDirection: "row", alignItems: "center", gap: 4 },
    doneText: { fontSize: 13, color: c.success, ...fontFaces.heavy },

    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    sheet: {
      width: "100%",
      maxWidth: 440,
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius["2xl"],
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: c.border,
      borderBottomWidth: 4,
    },
    sheetTitle: { fontSize: 22, lineHeight: 28, color: c.text, ...fontFaces.heavy },
    sheetScroll: { flexGrow: 0 },
    sheetScrollContent: { paddingVertical: 2 },
    sheetShort: { fontSize: 16, lineHeight: 23, color: c.text, ...fontFaces.bold },
    divider: { height: 2, backgroundColor: c.border, marginVertical: spacing.md },
    sheetBody: { fontSize: 15, lineHeight: 23, color: c.textSecondary, ...fontFaces.regular },
  };
});
