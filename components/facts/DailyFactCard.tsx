/**
 * DailyFactCard — the "Did you know?" card of the Quests tab, in the lesson card's design: a face
 * on a lip, a yellow header band with the title and a white circle icon, a white body.
 *
 * Body, left: the floating Discover mascot. Right: today's fact in its short form
 * plus a "Read more" button. Reading opens the full story and completes the
 * "Read Daily Fact" mission (XP is awarded once per day). The parent owns the
 * open state, so the mission row's "Read" button opens the same story.
 */

import { Image as ExpoImage } from "expo-image";
import { useIsFocused } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { getDailyFact, type DailyFact } from "@/services/missions";
import { createStyles, fontFaces, radius, spacing, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

const MASCOT = require("@/assets/images/mascot/discover.svg");
const XP_ICON = require("@/assets/images/icons/xp.png");

export function DailyFactCard({
  claimed,
  reward,
  open,
  onRead,
  onClose,
}: {
  /** Today's fact mission is already claimed. */
  claimed: boolean;
  reward: number;
  open: boolean;
  /** Open the story (and claim the mission if it is not claimed yet). */
  onRead: () => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [fact, setFact] = useState<DailyFact | null>(null);

  useEffect(() => {
    let alive = true;
    void getDailyFact().then((f) => {
      if (alive) setFact(f);
    });
    return () => {
      alive = false;
    };
  }, []);

  const focused = useIsFocused();

  // Gentle float, matching the other mascots; static with reduced motion.
  const y = useSharedValue(0);
  const rotate = useSharedValue(0);
  // Tab screens stay mounted when you leave them, so stop the loop while the
  // Quests tab is not the visible tab instead of animating off-screen.
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

  return (
    <>
      <View style={styles.card}>
        {/* The lip: its own layer under the face, so it shows only along the bottom edge */}
        <View pointerEvents="none" style={styles.cardLip} />
        <View style={styles.cardFace}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              Did you know?
            </Text>
            <View style={styles.headerIcon}>
              <Icon name="Lamp" size={22} color={theme.colors.lessonHeader} variant="Bold" />
            </View>
          </View>

          <View style={styles.cardBody}>
            <Animated.View style={[styles.mascotWrap, mascotStyle]} pointerEvents="none">
              <ExpoImage source={MASCOT} style={styles.mascot} contentFit="contain" />
            </Animated.View>

            <View style={styles.body}>
              <Text style={styles.short} numberOfLines={4}>
                {fact?.short ?? "Loading today's fact..."}
              </Text>
              <View style={styles.actionRow}>
                <Button
                  label="Read more"
                  fullWidth={false}
                  disabled={!fact}
                  onPress={onRead}
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
                    <ExpoImage source={XP_ICON} style={styles.rewardIcon} contentFit="contain" />
                    <Text style={styles.rewardText}>+{reward} XP</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
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

            <Button label="Got it" onPress={onClose} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    /* The lesson card's construction: the lip layer starts `lip` down, so it only shows along the bottom */
    card: { paddingBottom: controls.lip },
    cardLip: {
      position: "absolute",
      top: controls.lip,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
      backgroundColor: c.lessonLip,
    },
    cardFace: { borderRadius: 20, overflow: "hidden", backgroundColor: c.card },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.lessonHeader,
    },
    headerTitle: {
      flex: 1,
      fontSize: 22,
      ...fontFaces.heavy,
      color: c.lessonHeaderText,
    },
    /* White circle on the yellow band; the icon takes the band's colour */
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.onPrimary,
    },
    cardBody: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
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
    rewardIcon: { width: 18, height: 18 },
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
