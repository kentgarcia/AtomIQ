/**
 * The dim, the ring and the pointing hand (docs/features/TUTORIAL_SPEC.md §4.1 and §8), all plain Views, no SVG.
 *
 * The dim is ONE View per hole: the hole grown by a very wide border in the scrim colour, with a radius that makes the
 * border's inner edge the rounded hole (`borderHole`). Laying out and painting that screen-sized rounded border every frame is
 * what made the move between two controls lag, so the hole never animates its size or place: the new dim is laid out once at
 * the new control and fades in over the old one, which then fades out (opacity only, `dimOpacities`); the ring is laid out at
 * the new control and the hand slides to it by transform. The first time (and with reduced motion) it simply is there. A beat
 * with no target closes the hole to nothing in the middle of the screen, so the whole screen is dim. Nothing in here takes touches: the layer
 * draws the touch strips, and leaves the hole itself empty so a tap there reaches the real control.
 */

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { HAND_SIZE, HAND_TIP, PointingHand } from "@/components/tutorial/PointingHand";
import { TUTORIAL_FX, borderHole, dimOpacities, handFrame, ringFrame, type Hole } from "@/components/tutorial/tutorial-fx-core";
import { useLoopClock } from "@/components/motion/motion";
import { useTheme } from "@/theme";

export interface SpotlightProps {
  /** Where the hole is, or null for none (the whole screen dim). */
  hole: Hole | null;
  screen: { w: number; h: number };
  /** Show the pulsing ring and, on a `tap` beat, the pointing hand. */
  ring: boolean;
  /** Whether the pointing hand shows (a `tap` beat with its control lit). */
  hand: boolean;
  /** Bumps on every tap of the dim: the ring flashes once. */
  nudge: number;
  /** Bumps on every finished beat: a ring pops out of the old hole. */
  donePop: number;
}

const RING_WIDTH = 3;
/** How far the hand leans about its fingertip, in degrees. */
const HAND_LEAN = -12;

export function Spotlight({ hole, screen, ring, hand, nudge, donePop }: SpotlightProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const target: Hole = hole ?? { x: screen.w / 2, y: screen.h / 2, w: 0, h: 0, r: 0 };

  const hx = useSharedValue(target.x);
  const hy = useSharedValue(target.y);
  const hw = useSharedValue(target.w);
  const hh = useSharedValue(target.h);
  const hr = useSharedValue(target.r);
  // The hole that was showing before the last move (it fades out), and how far the move has got (0 to 1)
  const px = useSharedValue(target.x);
  const py = useSharedValue(target.y);
  const pw = useSharedValue(target.w);
  const ph = useSharedValue(target.h);
  const pr = useSharedValue(target.r);
  const mix = useSharedValue(1);
  const placed = useSharedValue(0);
  const flash = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    // The first hole is simply there; the next ones are laid out at once and the move is a crossfade (opacity and transform only)
    const moveIt = placed.get() === 1 && !reduced;
    cancelAnimation(mix);
    px.set(hx.get());
    py.set(hy.get());
    pw.set(hw.get());
    ph.set(hh.get());
    pr.set(hr.get());
    hx.set(target.x);
    hy.set(target.y);
    hw.set(target.w);
    hh.set(target.h);
    hr.set(target.r);
    if (moveIt) {
      mix.set(0);
      mix.set(withTiming(1, { duration: TUTORIAL_FX.glideMs, easing: Easing.out(Easing.cubic) }));
    } else {
      mix.set(1);
    }
    placed.set(1);
  }, [target.x, target.y, target.w, target.h, target.r, reduced, hx, hy, hw, hh, hr, px, py, pw, ph, pr, mix, placed]);

  const showMoving = ring && !reduced;
  const clock = useLoopClock(TUTORIAL_FX.ringMs, showMoving);
  const handClock = useLoopClock(TUTORIAL_FX.handMs, showMoving && hand !== null);

  useEffect(() => {
    if (nudge === 0 || reduced) return;
    cancelAnimation(flash);
    flash.set(1);
    flash.set(withTiming(0, { duration: TUTORIAL_FX.nudgeMs, easing: Easing.out(Easing.quad) }));
  }, [nudge, reduced, flash]);

  useEffect(() => {
    if (donePop === 0 || reduced) return;
    cancelAnimation(pop);
    pop.set(0);
    pop.set(withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [donePop, reduced, pop]);

  // Each dim's box changes only when a move starts; the fade is on a wrapper around it, so a frame never lays the border out again
  const dimBox = useAnimatedStyle(() => borderHole({ x: hx.get(), y: hy.get(), w: hw.get(), h: hh.get(), r: hr.get() }, screen));
  const prevBox = useAnimatedStyle(() => borderHole({ x: px.get(), y: py.get(), w: pw.get(), h: ph.get(), r: pr.get() }, screen));
  const dimFade = useAnimatedStyle(() => ({ opacity: dimOpacities(mix.get()).next }));
  const prevFade = useAnimatedStyle(() => ({ opacity: dimOpacities(mix.get()).prev }));

  // Position and size (layout) are one style that changes only while the hole glides; the looping ring and the pop only move
  // transform and opacity, on an inner view that fills it, so a clock tick never makes the screen lay out again.
  const boxStyle = useAnimatedStyle(() => ({
    left: hx.get() - RING_WIDTH,
    top: hy.get() - RING_WIDTH,
    width: hw.get() + RING_WIDTH * 2,
    height: hh.get() + RING_WIDTH * 2,
    borderRadius: hr.get() + RING_WIDTH,
  }));

  const ringStyle = useAnimatedStyle(() => {
    const f = ringFrame(clock.get());
    const lit = flash.get();
    return {
      borderRadius: hr.get() + RING_WIDTH,
      opacity: ring ? (showMoving ? f.opacity : 1) * mix.get() : 0,
      transform: [{ scale: (showMoving ? f.scale : 1) + lit * 0.05 }],
    };
  });

  // The ring that pops out of the hole a beat has just finished with
  const popStyle = useAnimatedStyle(() => {
    const p = pop.get();
    return {
      borderRadius: hr.get() + RING_WIDTH,
      opacity: p === 0 || p === 1 ? 0 : 0.9 * (1 - p),
      transform: [{ scale: 1 + 0.3 * p }],
    };
  });

  // The hand is always upright and comes from below: its fingertip sits on the lit control, a little in from the bottom edge,
  // and it moves up toward the control by `travel`. A control at the screen's foot leaves the palm off screen, like a hand
  // reaching in. It leans a little about its fingertip, so it looks held and not stamped. Where it sits is one style (it changes
  // while the hole glides); the bob is another, transform only.
  const handPlace = useAnimatedStyle(() => {
    const inset = Math.min(14, hh.get() * 0.25);
    return {
      opacity: hand ? 1 : 0,
      left: hx.get() + hw.get() / 2 - HAND_TIP.x,
      top: hy.get() + hh.get() - inset - HAND_TIP.y,
    };
  });
  const handStyle = useAnimatedStyle(() => {
    const { travel } = handFrame(handClock.get());
    // Slides from where the last hole's hand was to its place now: the bar is laid out at the new place, the offset shrinks to 0
    const left = 1 - mix.get();
    const slideX = (px.get() + pw.get() / 2 - (hx.get() + hw.get() / 2)) * left;
    const slideY = (py.get() + ph.get() - (hy.get() + hh.get())) * left;
    return {
      transformOrigin: `${HAND_TIP.x}px ${HAND_TIP.y}px`,
      transform: [{ translateX: slideX }, { translateY: slideY - travel }, { rotate: `${HAND_LEAN}deg` }],
    };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* the border is the dim; the colour is the theme's modal scrim */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, prevFade]}>
        <Animated.View style={[styles.layer, { borderColor: theme.colors.overlay, borderStyle: "solid" }, prevBox]} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, dimFade]}>
        <Animated.View style={[styles.layer, { borderColor: theme.colors.overlay, borderStyle: "solid" }, dimBox]} />
      </Animated.View>
      <Animated.View style={[styles.layer, boxStyle]}>
        <Animated.View style={[styles.fill, { borderColor: theme.colors.primary, borderWidth: RING_WIDTH }, ringStyle]} />
      </Animated.View>
      <Animated.View style={[styles.layer, boxStyle]}>
        <Animated.View style={[styles.fill, { borderColor: theme.colors.primary, borderWidth: RING_WIDTH }, popStyle]} />
      </Animated.View>
      <Animated.View style={[styles.hand, handPlace]}>
        <Animated.View style={handStyle}>
          <PointingHand />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute" },
  fill: { ...StyleSheet.absoluteFill },
  hand: { position: "absolute", width: HAND_SIZE.w, height: HAND_SIZE.h },
});
