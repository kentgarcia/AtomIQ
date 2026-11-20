/**
 * ChestCard — the chest of a period's quests, shown at the right of the Quests page's info card.
 * There is no button: the chest itself is the control. It is dimmed until enough quests of the period
 * are claimed (every daily one, any 3 weekly ones); then it is normal, nudges now and then, and a tap opens it once for diamonds
 * (5 a day, 25 a week).
 *
 *   locked   the closed chest, dimmed (not tappable)
 *   ready    the closed chest at full strength, nudging; a tap plays the opening once
 *   opened   the open chest's glow, looping
 *
 * The chest is drawn from the baked sheets of Chest_open.lottie and Chest_loop.lottie
 * (`chest-sheets.ts`), so it is the imported chest, frame for frame, on every device.
 *
 * The diamonds are saved when the opening animation ends (so closing the app half way loses
 * nothing); they then burst out of the chest and are pulled to the Profile tab like a quest's XP
 * coins (`ClaimCoinLayer`), and the "+5" floats up off the chest. With reduced motion the chest
 * opens at once and nothing moves.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { emitClaimFlight } from "@/components/quests/claim-fx-bus";
import { CHEST_LOOP, CHEST_OPEN } from "@/components/quests/chest-sheets";
import { SpriteSheet } from "@/components/ui/SpriteSheet";
import { impactLight, notifySuccess } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import type { ChestStatus, MissionPeriod } from "@/services/missions-core";
import { createStyles, fontFaces, useTheme } from "@/theme";

const DIAMOND = require("@/assets/images/icons/diamond.png");

const DEFAULT_CHEST_SIZE = 88;
/** Diamonds that fly: one per diamond up to a handful, so a weekly chest is not a swarm. */
const flightCount = (reward: number) => Math.max(3, Math.min(8, reward));

export interface ChestCardProps {
  period: MissionPeriod;
  status: ChestStatus;
  reward: number;
  /** Width and height of the chest (dp). */
  size?: number;
  /** Pays the chest. Called when the opening animation ends. */
  onOpen: () => Promise<number> | number;
}

export function ChestCard({ period, status, reward, size = DEFAULT_CHEST_SIZE, onOpen }: ChestCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const [paid, setPaid] = useState(0);
  const chestRef = useRef<React.ComponentRef<typeof View>>(null);

  // A chest that has been opened shows what it paid; one opened earlier (before this screen) shows its reward
  const shownReward = paid || reward;
  const name = period === "daily" ? "Daily chest" : "Weekly chest";

  // The "+N" floats up off the chest once it pays
  const float = useSharedValue(0);
  const floatStyle = useAnimatedStyle(() => ({
    opacity: float.get() > 0 && float.get() < 1 ? Math.min(1, float.get() * 6) * (1 - Math.max(0, float.get() - 0.7) / 0.3) : 0,
    transform: [{ translateY: -36 * float.get() }],
  }));

  // A ready chest nudges now and then: a small hop, then a rest
  const nudge = useSharedValue(0);
  useEffect(() => {
    if (status !== "ready" || opening || reduced) {
      nudge.set(0);
      return;
    }
    const hop = withSequence(withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }));
    nudge.set(withDelay(900, withRepeat(withSequence(hop, hop, withTiming(0, { duration: 2200 })), -1, false)));
  }, [status, opening, reduced, nudge]);
  const nudgeStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * nudge.get() }] }));

  const finishOpening = useCallback(async () => {
    // The diamonds come out of the chest where it is on the screen right now
    const origin = await new Promise<{ x: number; y: number } | null>((resolve) => {
      if (!chestRef.current) return resolve(null);
      chestRef.current.measureInWindow((x: number, y: number, w: number, h: number) => resolve({ x: x + w / 2, y: y + h / 2 }));
    });
    const got = await onOpen();
    if (got > 0) {
      setPaid(got);
      notifySuccess();
      if (origin && !reduced) emitClaimFlight(origin, { kind: "diamond", count: flightCount(got) });
      if (!reduced) {
        float.set(0);
        float.set(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
      }
    }
    setOpening(false);
  }, [onOpen, reduced, float]);

  // The chest becomes ready while this screen is showing (the last quest was just claimed): once,
  // on the change only, never when the screen mounts with a chest already ready.
  const lastStatus = useRef(status);
  useEffect(() => {
    if (lastStatus.current === "locked" && status === "ready") void playSfx("reward.chest-ready");
    lastStatus.current = status;
  }, [status]);

  const startOpening = () => {
    if (status === "locked") {
      void playSfx("ui.lock");
      return;
    }
    if (opening || status !== "ready") return;
    impactLight();
    void playSfx("reward.chest-open");
    if (reduced) {
      void finishOpening();
      return;
    }
    setOpening(true);
  };

  return (
    <Pressable
      ref={chestRef}
      collapsable={false}
      onPress={startOpening}
      disabled={status === "opened" || opening}
      accessibilityRole="button"
      accessibilityLabel={status === "ready" ? `Open the ${name.toLowerCase()}` : status === "opened" ? `${name}, opened` : `${name}, locked`}
      accessibilityState={{ disabled: status !== "ready" || opening }}
      hitSlop={6}
      style={[styles.chestBox, { width: size, height: size }]}
    >
      <Animated.View style={[{ width: size, height: size }, status === "locked" && styles.dim, nudgeStyle]}>
        {status === "opened" && !opening ? (
          <SpriteSheet key="loop" sheet={CHEST_LOOP} size={size} playing={!reduced} loop />
        ) : opening ? (
          <SpriteSheet key="open" sheet={CHEST_OPEN} size={size} playing onEnd={() => void finishOpening()} />
        ) : (
          <SpriteSheet key="closed" sheet={CHEST_OPEN} size={size} />
        )}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.floating, floatStyle]}>
        <Text style={styles.floatingText}>+{shownReward}</Text>
        <Image source={DIAMOND} style={styles.floatingIcon} resizeMode="contain" />
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    chestBox: { alignItems: "center", justifyContent: "center" },
    dim: { opacity: 0.5 },
    floating: { position: "absolute", top: 8, flexDirection: "row", alignItems: "center", gap: 3 },
    floatingText: { fontSize: 20, color: c.text, ...fontFaces.black },
    floatingIcon: { width: 22, height: 22 },
  };
});
