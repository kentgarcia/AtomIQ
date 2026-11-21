/**
 * The shop's loading screen (timeline in `shop-open-core.ts`): a closed shop. A roller shutter hangs under the awning with a CLOSED
 * sign on it; while it is there the screen mounts the shelves behind it; then the sign flips to OPEN and the shutter rolls up.
 * Honest about the wait: the clock runs to `holdAt` and stops until the screen says the shelves are laid out.
 *
 *   onMountShop  at the stall: the screen mounts the shelves behind this
 *   onDone       when the shutter has gone; the screen takes this away
 *
 * Fixed colours from the shared palette, like the awning (the same in light and dark). Put it BELOW the awning, which stays in front the
 * whole time. With animation off it is a still closed shop until the shelves are ready, then it is simply gone.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";

import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { OFFICIAL as O } from "@/components/npc/npc-palette";
import { SHOP_OPEN, shopOpenFrame } from "@/components/shop/shop-open-core";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";

const SLAT = 26;
const SLAT_LIP = 4;
const BAR = 16;
const SIGN_W = 190;
const SIGN_H = 104;
const SIGN_LIP = 5;

export interface ShopOpeningProps {
  /** The shelves are mounted and laid out. */
  ready: boolean;
  onMountShop: () => void;
  onDone: () => void;
}

export function ShopOpening({ ready, onMountShop, onDone }: ShopOpeningProps) {
  const reduced = useReducedMotion();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(reduced ? SHOP_OPEN.holdAt : 0);
  const [held, setHeld] = useState(false);
  // The newest handlers run: the screen builds new ones on every render
  const handlers = useRef({ onMountShop, onDone });
  useEffect(() => {
    handlers.current = { onMountShop, onDone };
  });

  // Run 1: the sign drops in (with animation off the closed shop is simply there; a moment lets it paint before the shelves mount)
  useEffect(() => {
    if (!reduced) {
      clock.set(0);
      clock.set(withTiming(SHOP_OPEN.holdAt, { duration: SHOP_OPEN.holdAt, easing: Easing.linear }));
    }
    const timer = setTimeout(() => setHeld(true), reduced ? 60 : SHOP_OPEN.holdAt);
    return () => {
      clearTimeout(timer);
      cancelAnimation(clock);
    };
  }, [clock, reduced]);

  useEffect(() => {
    if (held) handlers.current.onMountShop();
  }, [held]);

  // Run 2: once the shelves are laid out, the sign flips and the shutter rolls up
  useEffect(() => {
    if (!held || !ready) return;
    if (reduced) {
      handlers.current.onDone();
      return;
    }
    clock.set(SHOP_OPEN.holdAt);
    clock.set(withTiming(SHOP_OPEN.total, { duration: SHOP_OPEN.total - SHOP_OPEN.holdAt, easing: Easing.linear }));
    const done = setTimeout(() => handlers.current.onDone(), SHOP_OPEN.total - SHOP_OPEN.holdAt);
    return () => clearTimeout(done);
  }, [held, ready, reduced, clock]);

  // The shutter is the screen tall, plus its bottom bar, and rolls up out of sight under the awning
  const shutterHeight = height + BAR;
  const slats = useMemo(() => {
    let d = "";
    for (let y = SLAT - SLAT_LIP; y < shutterHeight - BAR; y += SLAT) d += `M0 ${y}H${width}v${SLAT_LIP}H0z`;
    return d;
  }, [width, shutterHeight]);

  const shutter = useAnimatedStyle(() => ({ transform: [{ translateY: -shopOpenFrame(clock.get()).rise * shutterHeight }] }));
  const sign = useAnimatedStyle(() => {
    const f = shopOpenFrame(clock.get());
    return { opacity: f.signOpacity, transform: [{ translateY: f.signY }, { rotate: `${f.signRotate}deg` }] };
  });
  const face = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.001, shopOpenFrame(clock.get()).signScaleX) }] }));
  const closed = useAnimatedStyle(() => ({ opacity: shopOpenFrame(clock.get()).closed }));
  const open = useAnimatedStyle(() => ({ opacity: shopOpenFrame(clock.get()).open }));

  return (
    <View pointerEvents="auto" accessible accessibilityLabel="The shop is opening" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.shutter, { height: shutterHeight }, shutter]}>
        <Svg width={width} height={shutterHeight}>
          <Rect x={0} y={0} width={width} height={shutterHeight} fill={O.wolf} />
          <Path d={slats} fill={O.eel} />
          <Rect x={0} y={shutterHeight - BAR} width={width} height={BAR} fill={O.eel} />
          <Rect x={width / 2 - 22} y={shutterHeight - BAR + 4} width={44} height={8} rx={4} fill={O.hare} />
        </Svg>
        {/* The sign hangs from a hook and swings about it */}
        <View style={[styles.signSlot, { top: height * 0.34 }]}>
          <Animated.View style={[styles.sign, sign]}>
            <View style={styles.hook} />
            <Animated.View style={[styles.signBody, face]}>
              <View style={styles.signLip} />
              <View style={styles.signFace}>
                <Icon name="Shop" size={26} color={O.wolf} variant="Bold" />
                <View style={styles.words}>
                  <Animated.View style={[styles.wordLayer, closed]}>
                    <Text style={[styles.word, { color: O.cardinal }]}>CLOSED</Text>
                  </Animated.View>
                  <Animated.View style={[styles.wordLayer, open]}>
                    <Text style={[styles.word, { color: O.featherGreen }]}>OPEN</Text>
                  </Animated.View>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const useStyles = createStyles(() => ({
  shutter: { position: "absolute", left: 0, right: 0, top: 0 },
  signSlot: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  // swings about its hook, at the top middle
  sign: { alignItems: "center", transformOrigin: "50% 0%" },
  hook: { width: 12, height: 12, borderRadius: 6, backgroundColor: O.hare, marginBottom: -4, zIndex: 1 },
  signBody: { width: SIGN_W, height: SIGN_H + SIGN_LIP },
  signLip: { position: "absolute", left: 0, right: 0, top: SIGN_LIP, height: SIGN_H, borderRadius: 20, borderCurve: "continuous", backgroundColor: O.swan },
  signFace: { height: SIGN_H, borderRadius: 20, borderCurve: "continuous", backgroundColor: O.snow, alignItems: "center", justifyContent: "center", gap: 4 },
  words: { height: 34, width: SIGN_W, alignItems: "center", justifyContent: "center" },
  wordLayer: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  word: { ...fontFaces.heavy, fontSize: 28, lineHeight: 34, letterSpacing: 1.5 },
}));
