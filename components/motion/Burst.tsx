/**
 * The burst round a hero element (timeline in `burst-core.ts`): small stars fly out, hang and fade,
 * a ring flashes, two bigger stars twinkle on opposite corners. Put it INSIDE the hero's wrapper (a
 * relatively positioned View): it centres itself on it and never takes room. `clock` is the moment's
 * clock in ms and `at` is the beat the burst hangs off, so the burst plays when `clock - at` runs.
 *
 * Flat colour only. Decorative: hidden from screen readers, never takes a touch, and with reduced
 * motion it is not drawn at all.
 */

import { useMotionBudget } from "@/components/motion/use-motion-budget";
import { particlesFor } from "@/services/device-profile-core";
import { memo } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { Sparkle } from "@/components/lesson/Sparkle";
import { BURST, burstRing, burstStar, burstTwinkle } from "@/components/motion/burst-core";

const STAR = 14;
const TWINKLE = 20;
const RING_WIDTH = 4;

function BurstStar({ i, clock, at, reach, count, color }: { i: number; clock: SharedValue<number>; at: number; reach: number; count: number; color: string }) {
  const anim = useAnimatedStyle(() => {
    const f = burstStar(i, clock.get() - at, reach, count);
    return { opacity: f.opacity, transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -STAR / 2, top: -STAR / 2, opacity: 0 }, anim]}>
      <Sparkle size={STAR} color={color} />
    </Animated.View>
  );
}

function Twinkle({ i, clock, at, spread, color }: { i: 0 | 1; clock: SharedValue<number>; at: number; spread: number; color: string }) {
  const anim = useAnimatedStyle(() => {
    const f = burstTwinkle(i, clock.get() - at);
    return { opacity: f.opacity, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  // Top right and bottom left of the ring
  const x = (i === 0 ? 1 : -1) * spread;
  const y = (i === 0 ? -1 : 1) * spread;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - TWINKLE / 2, top: y - TWINKLE / 2, opacity: 0 }, anim]}>
      <Sparkle size={TWINKLE} color={color} />
    </Animated.View>
  );
}

export interface BurstProps {
  clock: SharedValue<number>;
  /** The clock time the burst hangs off (ms): when the hero touches down. */
  at: number;
  /** Width of the hero, px: the ring's size and where the corner stars sit. */
  diameter: number;
  color: string;
  /** The ring's colour; the stars' colour when left out. */
  ringColor?: string;
  /** How far the stars fly, px. Keep it inside the room the container does not clip. */
  reach?: number;
  count?: number;
}

function BurstBase({ clock, at, diameter, color, ringColor, reach = BURST.reach, count: wanted = BURST.count }: BurstProps) {
  // A slower phone draws fewer stars (never fewer than four), docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.4
  const count = particlesFor(wanted, useMotionBudget().particleShare);
  const reduced = useReducedMotion();
  const ring = useAnimatedStyle(() => {
    const r = burstRing(clock.get() - at);
    return { opacity: r.opacity, transform: [{ scale: r.scale }] };
  });
  if (reduced) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, overflow: "visible" }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: -diameter / 2,
            top: -diameter / 2,
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            borderWidth: RING_WIDTH,
            borderColor: ringColor ?? color,
            opacity: 0,
          },
          ring,
        ]}
      />
      {Array.from({ length: count }, (_, i) => (
        <BurstStar key={i} i={i} clock={clock} at={at} reach={reach} count={count} color={color} />
      ))}
      <Twinkle i={0} clock={clock} at={at} spread={diameter * 0.46} color={color} />
      <Twinkle i={1} clock={clock} at={at} spread={diameter * 0.46} color={color} />
    </View>
  );
}

export const Burst = memo(BurstBase);
