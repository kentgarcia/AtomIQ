/**
 * The phone's power-on screen (timeline in `phone-boot-core.ts`): a dark screen, the logo popping in, the name, and a bar that fills
 * while the Phone tab gets ready. It is the phone's loading, so it is honest about it: the clock runs to `holdAt` and stops there
 * until the screen says the icon grid is laid out, so the grid's mount (the heavy frame) lands while nothing on it moves.
 *
 *   onMountGrid  at the stall: the screen mounts the grid behind this
 *   onReveal     as the dark starts to lift: the apps begin installing
 *   onDone       when it has gone; the screen takes it away
 *
 * Plays once per first open. The screen does not draw it with reduced motion (the phone is simply there).
 */

import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { BOOT, bootFrame } from "@/components/phone/phone-boot-core";
import { BOOT_COLORS, BOOT_SIZES } from "@/components/phone/phone-boot-art";
import { Text } from "@/components/ui/text";
import { playSfxSequence } from "@/services/sfx";
import { fontFaces } from "@/theme";

const LOGO = require("@/assets/images/mascot/icon-256.png");

export interface PhoneBootProps {
  /** The icon grid is mounted and laid out. */
  gridReady: boolean;
  onMountGrid: () => void;
  onReveal: () => void;
  onDone: () => void;
}

export function PhoneBoot({ gridReady, onMountGrid, onReveal, onDone }: PhoneBootProps) {
  const clock = useSharedValue(0);
  const [held, setHeld] = useState(false);
  // The newest handlers run: the screen builds new ones on every render
  const handlers = useRef({ onMountGrid, onReveal, onDone });
  useEffect(() => {
    handlers.current = { onMountGrid, onReveal, onDone };
  });

  // Run 1: to the stall. The power-on chime (three notes) lands as the logo pops in.
  useEffect(() => {
    clock.set(0);
    clock.set(withTiming(BOOT.holdAt, { duration: BOOT.holdAt, easing: Easing.linear }));
    const timer = setTimeout(() => setHeld(true), BOOT.holdAt);
    const chime = playSfxSequence([
      { cue: "phone.start-1", at: BOOT.logoAt },
      { cue: "phone.start-2", at: BOOT.logoAt + 230 },
      { cue: "phone.start-3", at: BOOT.logoAt + 460 },
    ]);
    return () => {
      clearTimeout(timer);
      chime();
      cancelAnimation(clock);
    };
  }, [clock]);

  // At the stall the grid is asked for
  useEffect(() => {
    if (held) handlers.current.onMountGrid();
  }, [held]);

  // Run 2: once the grid is laid out, the bar finishes and the screen wakes
  useEffect(() => {
    if (!held || !gridReady) return;
    clock.set(BOOT.holdAt);
    clock.set(withTiming(BOOT.total, { duration: BOOT.total - BOOT.holdAt, easing: Easing.linear }));
    const reveal = setTimeout(() => handlers.current.onReveal(), BOOT.revealAt - BOOT.holdAt);
    const done = setTimeout(() => handlers.current.onDone(), BOOT.total - BOOT.holdAt);
    return () => {
      clearTimeout(reveal);
      clearTimeout(done);
    };
  }, [held, gridReady, clock]);

  const screen = useAnimatedStyle(() => ({ opacity: bootFrame(clock.get()).screen }));
  const logo = useAnimatedStyle(() => {
    const f = bootFrame(clock.get());
    return { opacity: f.logoOpacity, transform: [{ scale: f.logo }] };
  });
  const word = useAnimatedStyle(() => {
    const f = bootFrame(clock.get());
    return { opacity: f.word, transform: [{ translateY: f.wordY }] };
  });
  const track = useAnimatedStyle(() => ({ opacity: bootFrame(clock.get()).track }));
  // The fill is as wide as its track and slid left by what is missing (the track clips it): a transform, never an animated width
  const fill = useAnimatedStyle(() => ({
    transform: [{ translateX: -(1 - bootFrame(clock.get()).fill) * BOOT_SIZES.trackWidth }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel="Starting your phone"
      style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: BOOT_COLORS.screen }, screen]}
    >
      <Animated.View style={logo}>
        <Image source={LOGO} style={styles.logo} contentFit="cover" />
      </Animated.View>
      <Animated.View style={word}>
        <Text style={[styles.word, { color: BOOT_COLORS.word }]}>AtomIQ</Text>
      </Animated.View>
      <Animated.View style={[styles.track, { backgroundColor: BOOT_COLORS.track }, track]}>
        <Animated.View style={[styles.fill, { backgroundColor: BOOT_COLORS.fill }, fill]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: "center", justifyContent: "center", gap: 16, zIndex: 20 },
  logo: { width: BOOT_SIZES.logo, height: BOOT_SIZES.logo, borderRadius: BOOT_SIZES.logoRadius, borderCurve: "continuous" },
  word: { ...fontFaces.bold, fontSize: 22, letterSpacing: 0.5 },
  track: {
    marginTop: 12,
    width: BOOT_SIZES.trackWidth,
    height: BOOT_SIZES.trackHeight,
    borderRadius: BOOT_SIZES.trackHeight / 2,
    overflow: "hidden",
  },
  fill: { width: BOOT_SIZES.trackWidth, height: BOOT_SIZES.trackHeight, borderRadius: BOOT_SIZES.trackHeight / 2 },
});
