/**
 * DailyFactCard — today's "Did you know?" on the Daily facts screen (opened from Discover): a flat section, no card, like
 * the Settings list: a round tinted icon, the title and the XP (or Done) on the right, then the floating Discover mascot
 * on the left and today's fact in its short form with a "Read more" button on the right. Reading opens the full story (`FactStory`) and completes the
 * "Read Daily Fact" mission (XP is awarded once per day). The parent owns the
 * open state, so the mission row's "Read" button opens the same story.
 */

import { Image as ExpoImage } from "expo-image";
import { useIsFocused } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { FactStory } from "@/components/facts/FactStory";
import { AddToNotesButton } from "@/components/phone/AddToNotesButton";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { clipSnippet } from "@/services/field-notes";
import { getDailyFact, type DailyFact } from "@/services/missions";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import { playSfx } from "@/services/sfx";

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
  /** The story was closed; `origin` is where the "Got it" button is while today's XP is still to be claimed. */
  onClose: (origin?: { x: number; y: number }) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

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

  // The story opening is a small sparkle moment; the XP claim sounds through the claim effect
  useEffect(() => {
    if (open) void playSfx("reward.sparkle");
  }, [open]);

  // Gentle float, matching the other mascots; static with reduced motion.
  const y = useSharedValue(0);
  const rotate = useSharedValue(0);
  // Stop the loop while the screen is not the visible one instead of animating off-screen.
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
      <View style={styles.section}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Icon name="Lamp" size={20} color={AMBER} variant="Bold" />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Did you know?
          </Text>
          {claimed ? (
            <View style={styles.donePill}>
              <Icon name="TickCircle" size={16} color={theme.colors.success} variant="Bold" />
              <Text style={styles.doneText}>Done</Text>
            </View>
          ) : (
            <View style={styles.rewardPill}>
              <ExpoImage source={XP_ICON} style={styles.rewardIcon} contentFit="contain" />
              <Text style={styles.rewardText}>+{reward} XP</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Animated.View style={[styles.mascotWrap, mascotStyle]} pointerEvents="none">
            <ExpoImage source={MASCOT} style={styles.mascot} contentFit="contain" />
          </Animated.View>

          <View style={styles.copy}>
            <Text style={styles.short} numberOfLines={5}>
              {fact?.short ?? "Loading today's fact..."}
            </Text>
            <Button
              label="Read more"
              fullWidth={false}
              disabled={!fact}
              onPress={onRead}
              accessibilityLabel={claimed ? "Read the full daily fact again" : `Read the full daily fact and earn ${reward} XP`}
              style={styles.button}
            />
            {fact ? <AddToNotesButton type="fact" sourceId={fact.id} title={fact.title} snippet={clipSnippet(fact.short)} style={styles.button} /> : null}
          </View>
        </View>
      </View>

      <FactStory fact={fact} open={open} onClose={onClose} claimed={claimed} reward={reward} />
    </>
  );
}

/** The lamp's amber (the Daily facts icon colour). */
const AMBER = "#F59E0B";

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    section: { gap: 12 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 },
    titleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(AMBER, 0.14) },
    title: { flex: 1, fontSize: 20, ...fontFaces.heavy, color: c.text },
    body: { flexDirection: "row", alignItems: "center", gap: 14 },
    mascotWrap: { width: 96, height: 112, alignItems: "center", justifyContent: "center" },
    mascot: { width: 96, height: 112 },
    copy: { flex: 1, gap: 12 },
    short: { fontSize: 16, lineHeight: 23, color: c.text, ...fontFaces.semibold },
    button: { alignSelf: "flex-start" },
    rewardIcon: { width: 18, height: 18 },
    rewardPill: { flexDirection: "row", alignItems: "center", gap: 4 },
    rewardText: { fontSize: 14, color: c.primaryLight, ...fontFaces.heavy },
    donePill: { flexDirection: "row", alignItems: "center", gap: 4 },
    doneText: { fontSize: 14, color: c.success, ...fontFaces.heavy },
  };
});
